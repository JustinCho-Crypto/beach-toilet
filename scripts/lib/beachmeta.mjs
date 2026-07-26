import fs from 'node:fs';
import zlib from 'node:zlib';
import { parseCsv } from './util.mjs';

// 해수욕장 부가정보 두 종류를 읽는다. 둘 다 해양수산부 파일 데이터로,
// data.go.kr 파일 다운로드는 로그인이 필요해 자동화가 안 되므로 사람이 내려받아 data-raw/에 둔다.
//   beach-schedule-2024.xlsx : 개장일/폐장일 (286곳) — '개장중' 배지의 근거
//   beach-visitors.csv       : 연도별 이용객 수 (290곳) — 시딩 우선순위 + '이용객 N위' 표기

// ---------- xlsx 최소 파서 ----------
// 의존성 없이 읽기 위해 필요한 부분만 직접 푼다 (zip → sharedStrings + sheet1).

function unzipEntries(buf) {
  const out = new Map();
  // End of central directory 부터 역순으로 훑는 대신, 로컬 헤더를 순차 스캔한다.
  let i = 0;
  while (i < buf.length - 4) {
    if (buf.readUInt32LE(i) !== 0x04034b50) { i += 1; continue; }
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const dataStart = i + 30 + nameLen + extraLen;
    if (compSize > 0) {
      const data = buf.slice(dataStart, dataStart + compSize);
      try {
        out.set(name, method === 0 ? data : zlib.inflateRawSync(data));
      } catch { /* 손상 엔트리는 건너뜀 */ }
      i = dataStart + compSize;
    } else {
      i = dataStart;
    }
  }
  return out;
}

const stripTags = (s) => s.replace(/<[^>]+>/g, '');
const unescapeXml = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
  .replace(/&amp;/g, '&');

/** xlsx 첫 시트를 배열의 배열로 읽는다 (수식/서식 무시, 값만). */
export function readXlsx(file) {
  const entries = unzipEntries(fs.readFileSync(file));
  const ssXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const shared = [...ssXml.matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => unescapeXml(stripTags(m[1])));
  const sheetXml = entries.get('xl/worksheets/sheet1.xml')?.toString('utf8') ?? '';

  const rows = [];
  for (const rm of sheetXml.matchAll(/<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = {};
    for (const cm of rm[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*)>(?:<v>([\s\S]*?)<\/v>)?/g)) {
      const [, col, attr, v] = cm;
      if (v === undefined) continue;
      cells[col] = attr.includes('t="s"') ? (shared[Number(v)] ?? '') : v;
    }
    rows.push(cells);
  }
  return rows;
}

// ---------- 개폐장 일정 ----------

const toMd = (s) => {
  // '2024.07.05.' → '7.5'
  const m = (s || '').match(/(\d{4})\.(\d{1,2})\.(\d{1,2})/);
  if (!m) return '';
  return `${Number(m[2])}.${Number(m[3])}`;
};

/**
 * @returns {Map<string, {openStart:string, openEnd:string, closed:boolean, region:string}>}
 *   키는 정규화된 해수욕장명 (공백 제거, '해수욕장/해변' 접미사 제거)
 */
export function readSchedule(file) {
  const rows = readXlsx(file);
  const out = new Map();
  for (const c of rows) {
    const name = (c.D || '').trim();
    if (!name || name === '해수욕장명') continue;
    const key = normKey(name);
    if (!key) continue;
    out.set(key, {
      openStart: toMd(c.F),
      openEnd: toMd(c.G),
      closed: (c.H || '').trim().toUpperCase() === 'O',
      region: `${(c.B || '').trim()} ${(c.C || '').trim()}`.trim(),
    });
  }
  return out;
}

// ---------- 이용객 현황 ----------

/**
 * @returns {Map<string, {visitors:number, rank:number}>} 최신 연도 기준
 */
export function readVisitors(file) {
  const rows = parseCsv(fs.readFileSync(file, 'utf8'));
  if (!rows.length) return new Map();
  const yearCols = Object.keys(rows[0]).filter((k) => /^\d{4}년$/.test(k)).sort();
  const latest = yearCols[yearCols.length - 1];
  const list = [];
  for (const r of rows) {
    const name = (r['해수욕장명'] || '').trim();
    if (!name) continue;
    const n = Number((r[latest] || '').replace(/[,\s]/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    list.push({ key: normKey(name), visitors: n });
  }
  list.sort((a, b) => b.visitors - a.visitors);
  const out = new Map();
  list.forEach((x, i) => {
    // 같은 이름이 여러 지역에 있으면 이용객이 많은 쪽을 남긴다 (표기 매칭의 한계)
    if (!out.has(x.key)) out.set(x.key, { visitors: x.visitors, rank: i + 1, year: latest });
  });
  return out;
}

/** '경포대해수욕장' / '경포해변' / '경포' → '경포' 로 맞춰 서로 다른 표기를 잇는다. */
export function normKey(name) {
  return (name || '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, '')
    .replace(/(해수욕장|해변|해변가|beach)$/i, '')
    .replace(/대$/, '') // '경포대' → '경포'
    .trim();
}
