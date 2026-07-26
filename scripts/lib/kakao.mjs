// 카카오 로컬 API 클라이언트.
// JS 키로 호출하려면 KA 헤더에 origin을 실어야 한다 (JS SDK가 보내는 헤더를 그대로 재현).
// REST API 키를 따로 발급받지 않아도 되는 대신, 그 origin이 콘솔의
// 'JavaScript SDK 도메인'에 등록돼 있어야 한다.

const ORIGIN = 'https://justincho-crypto.github.io';
const BASE = 'https://dapi.kakao.com/v2/local';

let calls = 0;
export const callCount = () => calls;

// 카카오 로컬 API 무료 한도는 일 10만. 실수로 대량 호출이 나가지 않도록 하드 상한을 둔다.
// 상한에 닿으면 예외로 즉시 중단 — 캐시는 이미 저장돼 있으므로 재개하면 이어서 진행된다.
let budget = Number(process.env.KAKAO_MAX_CALLS ?? 3000);
export function setBudget(n) { budget = n; }
export const budgetLeft = () => budget - calls;

function spend() {
  calls += 1;
  if (calls > budget) {
    throw new Error(
      `카카오 API 호출 상한(${budget}회) 도달 — 중단합니다. ` +
      '의도한 것이면 KAKAO_MAX_CALLS 를 올려서 다시 실행하세요.',
    );
  }
}

function headers(key) {
  return {
    Authorization: `KakaoAK ${key}`,
    KA: `sdk/1.0 os/javascript origin/${ORIGIN}`,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 429/5xx는 지수 백오프로 재시도. 그 외 에러는 null 반환(호출부에서 스킵 처리). */
async function request(key, path, params, { retries = 4 } = {}) {
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    spend();
    let res;
    try {
      res = await fetch(url, { headers: headers(key) });
    } catch (e) {
      if (attempt === retries) throw e;
      await sleep(400 * 2 ** attempt);
      continue;
    }
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) {
      if (attempt === retries) return null;
      await sleep(500 * 2 ** attempt);
      continue;
    }
    // 400(잘못된 주소 등)은 재시도 무의미
    return null;
  }
  return null;
}

/** 주소 → 좌표. 실패 시 null. */
export async function geocode(key, address) {
  const j = await request(key, '/search/address.json', { query: address, size: 1 });
  const d = j?.documents?.[0];
  if (!d) return null;
  return { lat: Number(d.y), lng: Number(d.x) };
}

/** 키워드 검색. page 1~3(최대 45건)까지 긁어서 합친다. */
export async function keyword(key, query, { maxPages = 3, size = 15 } = {}) {
  const out = [];
  for (let page = 1; page <= maxPages; page += 1) {
    const j = await request(key, '/search/keyword.json', { query, size, page });
    if (!j?.documents?.length) break;
    for (const d of j.documents) {
      out.push({
        name: d.place_name,
        lat: Number(d.y),
        lng: Number(d.x),
        address: d.road_address_name || d.address_name || '',
        jibun: d.address_name || '',
        category: d.category_name || '',
      });
    }
    if (j.meta?.is_end) break;
  }
  return out;
}
