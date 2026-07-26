import fs from 'node:fs';
import path from 'node:path';

export function haversineM(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** 따옴표를 고려한 최소 CSV 파서 (표준데이터는 따옴표 안에 콤마가 들어있는 행이 있다). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { inQuotes = false; }
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
      continue;
    }
    field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

/** 단계별 결과를 캐시해 중간부터 재개할 수 있게 한다 (API 호출이 비싸므로). */
export function cache(file) {
  const p = path.resolve(file);
  return {
    read() {
      try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
    },
    write(data) {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, JSON.stringify(data, null, 0));
      return data;
    },
  };
}

/** 동시성 제한 병렬 실행 (카카오 API 초당 한도를 넘지 않도록). */
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = cursor;
      cursor += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

// TTY가 아니면(로그 파일/파이프) 매 틱을 찍지 않는다 — 진행 표시가 로그를 뒤덮는다.
export function progress(label, done, total) {
  const pct = total ? Math.floor((done / total) * 100) : 0;
  if (process.stdout.isTTY) {
    process.stdout.write(`\r  ${label}: ${done}/${total} (${pct}%)   `);
    if (done === total) process.stdout.write('\n');
    return;
  }
  const step = Math.max(1, Math.floor(total / 5));
  if (done === total || done % step === 0) console.log(`  ${label}: ${done}/${total} (${pct}%)`);
}
