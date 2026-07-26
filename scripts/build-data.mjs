#!/usr/bin/env node
// 공공데이터 → src/data.generated.ts 배치.
//
// 파이프라인 (각 단계 결과는 data-raw/cache/*.json에 캐시 → 중단 후 재개 가능)
//   1. spots     : 카카오 키워드 검색으로 전국 해수욕장/계곡을 좌표째 수집
//   2. filter    : 스팟이 있는 시군구의 화장실만 추림 (5만건 전수 지오코딩 회피)
//   3. geocode   : 추린 화장실 주소 → 좌표
//   4. showers   : 스팟별 '샤워장' 키워드 검색
//   5. assign    : 시설을 반경 내 최근접 스팟에 배정 → data.generated.ts 출력
//
// 사용법: VITE_KAKAO_JS_KEY=... node scripts/build-data.mjs [--stage=N] [--limit=N]
// (.env.local이 있으면 자동으로 읽는다)

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { geocode, keyword, callCount } from './lib/kakao.mjs';
import { parseCsv, cache, mapLimit, haversineM, progress } from './lib/util.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(ROOT, 'data-raw');
const CACHE = path.join(RAW, 'cache');

// 시설을 스팟에 배정할 최대 거리. 이보다 멀면 '물놀이 스팟 주변'으로 보기 어렵다.
const ASSIGN_RADIUS_M = 1500;
// 한 스팟에 붙일 최대 시설 수 (바텀시트가 감당할 분량 + 번들 크기 관리)
const MAX_FACILITIES_PER_SPOT = 12;
// 카카오 API 동시 호출 수
const CONCURRENCY = 8;

// ---------- 키 로딩 ----------
function loadKey() {
  if (process.env.VITE_KAKAO_JS_KEY) return process.env.VITE_KAKAO_JS_KEY;
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
    const m = env.match(/^VITE_KAKAO_JS_KEY=(.+)$/m);
    if (m) return m[1].trim();
  } catch { /* .env.local 없음 */ }
  console.error('카카오 JS 키가 없습니다. .env.local의 VITE_KAKAO_JS_KEY를 설정하세요.');
  process.exit(1);
}
const KEY = loadKey();

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);

// ---------- 1. 스팟 수집 ----------

// 해수욕장이 있는 연안 시군구 + 계곡이 유명한 내륙 시군구.
// 카카오 키워드 검색은 쿼리당 최대 45건이라 전국 단위 한 방 검색이 불가능해서 지역별로 쪼갠다.
const COASTAL = [
  '부산 해운대구', '부산 수영구', '부산 사하구', '부산 서구', '부산 기장군',
  '인천 중구', '인천 옹진군', '인천 강화군',
  '울산 동구', '울산 북구', '울산 울주군',
  '경기 안산시', '경기 화성시', '경기 시흥시', '경기 평택시',
  '강원 강릉시', '강원 속초시', '강원 동해시', '강원 삼척시', '강원 양양군',
  '강원 고성군', '강원 양구군',
  '충남 보령시', '충남 태안군', '충남 서산시', '충남 당진시', '충남 홍성군', '충남 서천군',
  '전북 군산시', '전북 부안군', '전북 고창군',
  '전남 여수시', '전남 완도군', '전남 신안군', '전남 해남군', '전남 진도군',
  '전남 고흥군', '전남 영광군', '전남 무안군', '전남 장흥군', '전남 보성군',
  '경북 포항시', '경북 경주시', '경북 영덕군', '경북 울진군', '경북 울릉군',
  '경남 거제시', '경남 남해군', '경남 통영시', '경남 사천시', '경남 고성군', '경남 창원시',
  '제주 제주시', '제주 서귀포시',
];

const VALLEY_REGIONS = [
  '경기 가평군', '경기 양평군', '경기 포천시', '경기 남양주시', '경기 광주시', '경기 안성시',
  '강원 인제군', '강원 홍천군', '강원 평창군', '강원 정선군', '강원 영월군', '강원 춘천시',
  '강원 원주시', '강원 횡성군', '강원 화천군',
  '충북 제천시', '충북 단양군', '충북 괴산군', '충북 보은군', '충북 영동군',
  '충남 공주시', '충남 청양군', '충남 금산군',
  '전북 무주군', '전북 진안군', '전북 남원시', '전북 정읍시', '전북 완주군',
  '전남 구례군', '전남 곡성군', '전남 담양군', '전남 화순군',
  '경북 문경시', '경북 봉화군', '경북 청송군', '경북 영주시', '경북 상주시',
  '경남 산청군', '경남 함양군', '경남 거창군', '경남 하동군', '경남 밀양시', '경남 양산시',
  '제주 제주시', '제주 서귀포시',
];

function normalizeName(s) {
  return s.replace(/\(.*?\)/g, '').replace(/\s+/g, '');
}

// '해운대해수욕장'은 통과, '보스턴수제버거 동막해수욕장'·'송정해수욕장 1호 공중화장실'·
// 'CU 강화동막해수욕장점'은 탈락. 이름이 해당 단어로 '끝나야' 실제 그 장소로 본다.
function isSpotName(name, term) {
  const n = normalizeName(name);
  if (!n.endsWith(term) || n.length <= term.length) return false;
  // '00해수욕장' 앞에 상호가 붙은 경우(공백으로 구분)를 배제
  return !/\s/.test(name.trim().replace(/\(.*?\)/g, '').trim());
}

/**
 * 같은 장소가 '경포해변'/'경포해수욕장'처럼 두 이름으로 잡히므로 근접 중복을 제거한다.
 * 더 통용되는 '해수욕장' 쪽을 남긴다.
 */
function dedupeNearby(list, radiusM = 600) {
  const base = (n) => normalizeName(n).replace(/(해수욕장|해변|계곡)$/, '');
  const sorted = [...list].sort((a, b) => {
    const ax = a.name.endsWith('해수욕장') ? 0 : 1;
    const bx = b.name.endsWith('해수욕장') ? 0 : 1;
    return ax - bx;
  });
  const kept = [];
  for (const s of sorted) {
    const dup = kept.some((k) => {
      const d = haversineM(k.lat, k.lng, s.lat, s.lng);
      if (d < radiusM) return true;
      // '농소몽돌해수욕장'/'농소몽돌해변'처럼 같은 곳을 다르게 부르는 경우는 조금 더 멀어도 병합.
      // 이름이 다르면(인접한 별개 해변) 병합하지 않는다 — '몽돌'은 흔한 이름이라 전국에 여러 곳 있다.
      return d < 1500 && base(k.name) === base(s.name);
    });
    if (!dup) kept.push(s);
  }
  return kept;
}

async function stageSpots() {
  const c = cache(path.join(CACHE, '1-spots.json'));
  const cached = c.read();
  if (cached && !args.force) {
    console.log(`[1/5] 스팟 (캐시): 해수욕장 ${cached.beaches.length} · 계곡 ${cached.valleys.length}`);
    return cached;
  }

  console.log('[1/5] 카카오 키워드 검색으로 스팟 수집');
  // 동해안 상당수는 '○○해변'으로 불린다(강릉 19곳 중 대부분). '해수욕장'만 받으면
  // 이 지역이 통째로 빠지므로 두 표기를 모두 수집한 뒤 근접 중복을 제거한다.
  const collect = async (regions, terms, type) => {
    const seen = new Map();
    let done = 0;
    await mapLimit(regions, CONCURRENCY, async (region) => {
      for (const term of terms) {
        const rows = await keyword(KEY, `${region} ${term}`);
        for (const r of rows) {
          if (!isSpotName(r.name, term)) continue;
          const key = `${normalizeName(r.name)}@${r.lat.toFixed(2)},${r.lng.toFixed(2)}`;
          if (seen.has(key)) continue;
          seen.set(key, { ...r, type, region });
        }
      }
      done += 1;
      progress(`  ${terms[0]}`, done, regions.length);
    });
    return dedupeNearby([...seen.values()]);
  };

  const beaches = await collect(COASTAL, ['해수욕장', '해변'], 'beach');
  const valleys = await collect(VALLEY_REGIONS, ['계곡'], 'valley');
  console.log(`  → 해수욕장 ${beaches.length}곳 · 계곡 ${valleys.length}곳`);
  return c.write({ beaches, valleys });
}

// ---------- 2. 화장실 후보 필터 ----------

function sggTokens(spots) {
  // 스팟 주소에서 시군구 토큰을 뽑는다. 화장실 주소가 지저분해(공백 없음/시도 누락)
  // 위치 파싱 대신 '문자열 포함' 검사로 쓴다.
  const set = new Set();
  for (const s of spots) {
    const parts = (s.address || s.jibun || '').split(/\s+/);
    for (const p of parts.slice(0, 3)) {
      if (/(시|군|구)$/.test(p) && p.length >= 2) set.add(p);
    }
  }
  return [...set];
}

// 표준데이터에 섞여 있는 '진짜 해변 샤워장'을 식별한다 (만리포 소라형 샤워장, 가계샤워장 등).
// 체육센터/스포츠센터 샤워실은 물놀이용이 아니고, 해녀탈의장은 일반 개방 시설이 아니라 제외.
// 스팟 반경 배정이 지리적 필터를 겸하므로 여기선 이름만 본다.
const SHOWER_EXCLUDE = /(해녀|체육센터|스포츠센터|문화체육|국민체육|수영장)/;
function isShowerName(raw) {
  const n = (raw || '').trim();
  return /(샤워|탈의)/.test(n) && !SHOWER_EXCLUDE.test(n);
}

function toiletLabel(raw) {
  let n = (raw || '').trim().replace(/\s+/g, ' ');
  if (!n) return '공중화장실';
  n = n.replace(/\((공중)?화장실\)$/, '').trim();
  return /화장실/.test(n) ? n : `${n} 화장실`;
}

async function stageFilterToilets(spots) {
  const c = cache(path.join(CACHE, '2-toilet-candidates.json'));
  const cached = c.read();
  if (cached && !args.force) {
    console.log(`[2/5] 화장실 후보 (캐시): ${cached.length}건`);
    return cached;
  }

  console.log('[2/5] 스팟 인근 시군구의 화장실만 추림');
  const csv = fs.readFileSync(path.join(RAW, 'toilets.csv'), 'utf8');
  const rows = parseCsv(csv);
  const tokens = sggTokens(spots);
  console.log(`  시군구 토큰 ${tokens.length}개 · 전체 화장실 ${rows.length}건`);

  const out = [];
  for (const r of rows) {
    const addr = (r['소재지도로명주소'] || r['소재지지번주소'] || '').trim();
    if (!addr) continue;
    const compact = addr.replace(/\s+/g, '');
    if (!tokens.some((t) => compact.includes(t))) continue;
    const rawName = r['화장실명'];
    const shower = isShowerName(rawName);
    out.push({
      id: r['관리번호'],
      type: shower ? 'shower' : 'toilet',
      // 표준데이터의 '화장실명'은 건물명인 경우가 많다("해변주유소", "중1동 주민센터").
      // 그대로 쓰면 지도에서 화장실인지 알 수 없어 접미사를 붙인다.
      name: shower ? rawName.trim() : toiletLabel(rawName),
      address: addr,
      open: (r['개방시간'] || '').trim(),
      unisex: r['구분명'] || '',
    });
  }
  console.log(`  → 후보 ${out.length}건 (전수 대비 ${Math.round((out.length / rows.length) * 100)}%)`);
  return c.write(out);
}

// ---------- 3. 지오코딩 ----------

async function stageGeocode(candidates) {
  const c = cache(path.join(CACHE, '3-geocoded.json'));
  const prev = c.read() ?? {};
  const todo = candidates.filter((t) => !(t.id in prev));
  console.log(`[3/5] 지오코딩: 남은 ${todo.length}건 (완료 ${Object.keys(prev).length}건)`);

  if (todo.length) {
    let done = 0;
    let saveTick = 0;
    await mapLimit(todo, CONCURRENCY, async (t) => {
      const pos = await geocode(KEY, t.address);
      prev[t.id] = pos; // 실패는 null로 기록해 재시도 루프를 막는다
      done += 1;
      saveTick += 1;
      if (saveTick >= 500) { saveTick = 0; c.write(prev); }
      if (done % 20 === 0 || done === todo.length) progress('  geocode', done, todo.length);
    });
    c.write(prev);
  }

  const ok = Object.values(prev).filter(Boolean).length;
  console.log(`  → 성공 ${ok} / 실패 ${Object.keys(prev).length - ok}`);
  return prev;
}

// ---------- 4. 스팟별 POI (샤워장 / 화장실) ----------

// 상업시설이 '샤워'를 이름에 넣는 경우가 많아 걸러낸다.
const SHOWER_NOISE = /(펜션|모텔|호텔|리조트|카페|아파트|헬스|사우나|찜질|목욕탕|글램핑|세차|애견|강습)/;
const TOILET_NOISE = /(카페|편의점|식당|주유소|펜션)/;

/**
 * 스팟 이름으로 주변 POI를 직접 찾는다.
 * 표준데이터 지오코딩보다 정밀하다 — 카카오에는 '송정해수욕장 1호 공중화장실'처럼
 * 해변 시설이 개별 POI로 등록돼 있어서, 주소 지오코딩의 대표지번 오차 문제를 우회한다.
 */
async function stageSpotPois(spots) {
  const c = cache(path.join(CACHE, '4-spot-pois.json'));
  const cached = c.read();
  if (cached && !args.force) {
    console.log(`[4/5] 스팟 POI (캐시): 샤워 ${cached.showers.length} · 화장실 ${cached.toilets.length}`);
    return cached;
  }

  console.log('[4/5] 스팟별 샤워장/화장실 POI 검색');
  const showers = [];
  const toilets = [];
  let done = 0;
  await mapLimit(spots, CONCURRENCY, async (s) => {
    const [sh, sh2, to] = await Promise.all([
      keyword(KEY, `${s.name} 샤워장`, { maxPages: 1 }),
      keyword(KEY, `${s.name} 탈의장`, { maxPages: 1 }),
      keyword(KEY, `${s.name} 화장실`, { maxPages: 2 }),
    ]);
    for (const r of [...sh, ...sh2]) {
      if (SHOWER_NOISE.test(r.name) || !isShowerName(r.name)) continue;
      if (haversineM(s.lat, s.lng, r.lat, r.lng) > ASSIGN_RADIUS_M) continue;
      showers.push(r);
    }
    for (const r of to) {
      if (TOILET_NOISE.test(r.name) || !/화장실/.test(r.name)) continue;
      if (haversineM(s.lat, s.lng, r.lat, r.lng) > ASSIGN_RADIUS_M) continue;
      toilets.push(r);
    }
    done += 1;
    progress('  poi', done, spots.length);
  });

  const dedupe = (list) => {
    const m = new Map();
    for (const r of list) m.set(`${normalizeName(r.name)}@${r.lat.toFixed(4)}`, r);
    return [...m.values()];
  };
  const out = { showers: dedupe(showers), toilets: dedupe(toilets) };
  console.log(`  → 샤워장 ${out.showers.length}건 · 화장실 POI ${out.toilets.length}건`);
  return c.write(out);
}

// ---------- 5. 배정 + 출력 ----------

function slug(prefix, i) { return `${prefix}${i}`; }

/** 수작업 시딩 (카카오·공공데이터 모두에 없는 정보라 사람이 채운다). */
function manualFile() {
  try {
    return JSON.parse(fs.readFileSync(path.join(RAW, 'showers-manual.json'), 'utf8'));
  } catch {
    return {};
  }
}
function manualShowers() {
  const j = manualFile();
  return Array.isArray(j.showers) ? j.showers : [];
}
/** 좌표는 모르지만 '샤워장이 있다'는 건 확인된 스팟의 안내 문구. */
function manualShowerNotes() {
  const j = manualFile();
  return Array.isArray(j.spotShowerNotes) ? j.spotShowerNotes : [];
}

function assign({ beaches, valleys }, candidates, coords, pois) {
  console.log('[5/5] 시설 배정 + 파일 생성');

  const spots = [];
  beaches.forEach((b, i) => spots.push({
    id: slug('b', i), type: 'beach', name: b.name,
    region: (b.address || b.jibun || '').split(/\s+/).slice(0, 2).join(' '),
    lat: b.lat, lng: b.lng,
  }));
  valleys.forEach((v, i) => spots.push({
    id: slug('v', i), type: 'valley', name: v.name,
    region: (v.address || v.jibun || '').split(/\s+/).slice(0, 2).join(' '),
    lat: v.lat, lng: v.lng,
  }));

  const bySpot = new Map(spots.map((s) => [s.id, []]));

  const place = (fac) => {
    let best = null;
    let bestD = Infinity;
    for (const s of spots) {
      // 위도 1도≈111km. 먼 후보는 제곱근 계산 전에 쳐낸다.
      if (Math.abs(s.lat - fac.lat) > 0.02) continue;
      const d = haversineM(s.lat, s.lng, fac.lat, fac.lng);
      if (d < bestD) { bestD = d; best = s; }
    }
    if (!best || bestD > ASSIGN_RADIUS_M) return null;
    return { spot: best, dist: bestD };
  };

  // 같은 시설이 표준데이터와 카카오 POI 양쪽에 있을 수 있어 좌표 근접으로 중복 제거
  const placed = [];
  const isDuplicate = (lat, lng, name) =>
    placed.some((p) => haversineM(p.lat, p.lng, lat, lng) < 40
      || (normalizeName(p.name) === normalizeName(name) && haversineM(p.lat, p.lng, lat, lng) < 300));

  const add = (spotId, fac, dist) => {
    bySpot.get(spotId).push({ ...fac, spotId, _d: dist });
    placed.push({ lat: fac.lat, lng: fac.lng, name: fac.name });
  };

  // 수작업 시딩 샤워장이 최우선 — 사람이 확인한 값이라 가장 신뢰도가 높다.
  let manualCount = 0;
  const byName = new Map(spots.map((s) => [s.name, s]));
  for (const [i, m] of manualShowers().entries()) {
    const spot = byName.get(m.spotName);
    if (!spot) {
      console.warn(`  ⚠ 수작업 샤워장 '${m.name}': 스팟 '${m.spotName}'을 찾을 수 없어 건너뜀`);
      continue;
    }
    // source는 근거 추적용이라 앱 번들에는 싣지 않는다.
    const { spotName, source, ...rest } = m;
    void source;
    add(spot.id, { id: `ms${i}`, type: 'shower', ...rest },
      haversineM(spot.lat, spot.lng, m.lat, m.lng));
    manualCount += 1;
  }

  // 카카오 POI — 해변 시설이 개별 등록돼 있어 표준데이터 주소 지오코딩보다 위치가 정확하다.
  let showerCount = 0;
  pois.showers.forEach((s, i) => {
    // 캐시가 필터 추가 이전에 만들어졌을 수 있으므로 배정 시점에도 한 번 더 거른다
    // (캐시를 버리면 API 쿼터를 다시 쓰게 된다).
    if (!isShowerName(s.name)) return;
    const hit = place(s);
    if (!hit || isDuplicate(s.lat, s.lng, s.name)) return;
    add(hit.spot.id, { id: `s${i}`, type: 'shower', name: s.name, lat: s.lat, lng: s.lng }, hit.dist);
    showerCount += 1;
  });

  let poiToiletCount = 0;
  pois.toilets.forEach((t, i) => {
    const hit = place(t);
    if (!hit || isDuplicate(t.lat, t.lng, t.name)) return;
    add(hit.spot.id, { id: `kt${i}`, type: 'toilet', name: t.name, lat: t.lat, lng: t.lng, fee: 'free' }, hit.dist);
    poiToiletCount += 1;
  });

  let toiletCount = 0;
  let stdShowerCount = 0;
  candidates.forEach((t) => {
    const pos = coords[t.id];
    if (!pos) return;
    const hit = place({ lat: pos.lat, lng: pos.lng });
    if (!hit || isDuplicate(pos.lat, pos.lng, t.name)) return;
    const isShower = t.type === 'shower';
    add(hit.spot.id, {
      id: `t${t.id}`, type: isShower ? 'shower' : 'toilet',
      name: t.name, lat: pos.lat, lng: pos.lng, fee: 'free',
    }, hit.dist);
    if (isShower) stdShowerCount += 1; else toiletCount += 1;
  });

  // 좌표 없이 '샤워장 있음'만 확인된 스팟에 안내 문구를 붙인다
  let noteCount = 0;
  for (const n of manualShowerNotes()) {
    const spot = byName.get(n.spotName);
    if (!spot) {
      console.warn(`  ⚠ 샤워 안내 '${n.spotName}': 스팟을 찾을 수 없어 건너뜀`);
      continue;
    }
    spot.showerNote = n.note;
    noteCount += 1;
  }

  // 시설이 하나도 없는 스팟은 버린다 (지도에 띄워도 앱의 목적을 못 채움)
  const keptSpots = spots.filter((s) => bySpot.get(s.id).length > 0);
  const facilities = [];
  for (const s of keptSpots) {
    const list = bySpot.get(s.id).sort((a, b) => a._d - b._d).slice(0, MAX_FACILITIES_PER_SPOT);
    for (const f of list) { delete f._d; facilities.push(f); }
  }

  console.log(`  스팟 ${keptSpots.length}/${spots.length} (시설 있는 곳만)`);
  const showerTotal = manualCount + showerCount + stdShowerCount;
  console.log(`  샤워장 ${showerTotal} (수작업 ${manualCount} + POI ${showerCount} + 표준데이터 ${stdShowerCount}) · 화장실 ${poiToiletCount + toiletCount}`);
  console.log(`  샤워 안내 문구(좌표 미상) ${noteCount}곳`);
  if (showerTotal < 30) {
    console.log(`  ⚠ 샤워장이 ${showerTotal}건뿐입니다. 카카오/공공데이터에 해변 샤워장이 거의 없어 자동 수집 한계 —`);
    console.log('    data-raw/showers-manual.json에 방문객 상위 해수욕장부터 채우세요 (기획안 §5).');
  }
  console.log(`  최종 시설 ${facilities.length}건 (스팟당 최대 ${MAX_FACILITIES_PER_SPOT})`);
  return { spots: keptSpots, facilities };
}

function emit({ spots, facilities }) {
  const header = `// 이 파일은 scripts/build-data.mjs가 생성합니다. 직접 수정하지 마세요.
// 생성 시각: ${new Date().toISOString()}
// 출처: 전국공중화장실표준데이터(행안부) + 카카오 로컬 API(스팟/샤워장 좌표)
import type { Spot, Facility } from './data';

`;
  const body =
    `export const SPOTS: Spot[] = ${JSON.stringify(spots, null, 0)};\n\n` +
    `export const FACILITIES: Facility[] = ${JSON.stringify(facilities, null, 0)};\n`;
  const out = path.join(ROOT, 'src', 'data.generated.ts');
  fs.writeFileSync(out, header + body);
  const kb = (fs.statSync(out).size / 1024).toFixed(0);
  console.log(`\n✅ src/data.generated.ts (${kb}KB)`);
}

// ---------- main ----------

(async () => {
  fs.mkdirSync(CACHE, { recursive: true });
  const spotsRaw = await stageSpots();
  const allSpots = [...spotsRaw.beaches, ...spotsRaw.valleys];
  const candidates = await stageFilterToilets(allSpots);
  const limited = args.limit ? candidates.slice(0, Number(args.limit)) : candidates;
  const coords = await stageGeocode(limited);
  const pois = await stageSpotPois(allSpots);
  emit(assign(spotsRaw, limited, coords, pois));
  console.log(`카카오 API 호출 ${callCount()}회`);
})();
