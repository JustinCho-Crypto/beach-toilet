import { KAKAO_JS_KEY, DEFAULT_ZOOM } from './config';
import {
  Spot, Facility, SPOTS, FACILITIES, spotById, facilitiesOf,
  haversineM, formatDist,
} from './data';
import { LatLng } from './bridge';
import { aggregateFor, formatAgo } from './points';
import { openReportSheet } from './report';
import {
  toast, svgWc, svgShower, svgParasol, svgValley, svgStar, CLEAN_LABEL, CLEAN_CLASS,
} from './ui';

declare global {
  interface Window {
    kakao?: any;
  }
}

type PinFilter = 'all' | 'beach' | 'valley' | 'toilet' | 'shower';

interface MapState {
  myPos: LatLng;
  filter: PinFilter;
  selectedSpotId: string | null;
  kakaoMap: any | null;
  kakaoOverlays: any[];
}

let state: MapState | null = null;

// ---------- 마커 DOM ----------

function spotPinHtml(spot: Spot, selected: boolean): string {
  const valley = spot.type === 'valley';
  const cls = `pin spot${valley ? ' valley' : ''}${selected ? ' selected' : ''}`;
  const icon = valley ? svgValley(20, '#fff') : svgParasol(22, '#fff');
  return `<button type="button" class="${cls}" data-spot="${spot.id}" aria-label="${spot.name}">
    <div class="pbody"><div class="pbubble">${icon}</div></div>
    <div class="plabel">${spot.name}</div>
  </button>`;
}

function facilityPinHtml(fac: Facility, selected: boolean): string {
  const agg = aggregateFor(fac.id);
  const ring = agg.clean === 'clean' ? 'ring-g' : agg.clean === 'normal' ? 'ring-y' : agg.clean === 'dirty' ? 'ring-r' : 'ring-n';
  const cls = `pin fac ${ring}${selected ? ' selected' : ''}`;
  const icon = fac.type === 'shower' ? svgShower(17, '#1B9CF0') : svgWc(17, '#4E5968');
  return `<button type="button" class="${cls}" data-fac="${fac.id}" aria-label="${fac.name}">
    <div class="pbody"><div class="fbubble">${icon}</div></div>
  </button>`;
}

function visibleSpots(): Spot[] {
  if (!state) return [];
  if (state.filter === 'beach') return SPOTS.filter((s) => s.type === 'beach');
  if (state.filter === 'valley') return SPOTS.filter((s) => s.type === 'valley');
  return SPOTS;
}

function visibleFacilities(): Facility[] {
  if (!state) return [];
  if (state.filter === 'toilet') return FACILITIES.filter((f) => f.type === 'toilet');
  if (state.filter === 'shower') return FACILITIES.filter((f) => f.type === 'shower');
  if (state.filter === 'beach' || state.filter === 'valley') {
    const ids = new Set(visibleSpots().map((s) => s.id));
    return FACILITIES.filter((f) => ids.has(f.spotId));
  }
  return FACILITIES;
}

// ---------- 스팟 바텀시트 ----------

function facilityRowHtml(fac: Facility, myPos: LatLng): string {
  const agg = aggregateFor(fac.id);
  const dist = formatDist(haversineM(myPos.lat, myPos.lng, fac.lat, fac.lng));
  const icon = fac.type === 'shower' ? svgShower(20, '#1B9CF0') : svgWc(20, '#1B9CF0');
  let meta: string;
  if (agg.count === 0) {
    meta = `${dist} · 아직 제보 없음 · <b class="first">첫 제보 포인트 2배</b>`;
  } else {
    const parts = [
      dist,
      `<span class="dot ${CLEAN_CLASS[agg.clean!]}"></span> <span class="${CLEAN_CLASS[agg.clean!]}">${CLEAN_LABEL[agg.clean!]}</span>`,
      `<span class="staric">${svgStar(11, '#FFB331')}</span><b class="star">${agg.avgStars.toFixed(1)}</b>`,
    ];
    const fee = agg.fee ?? fac.fee;
    if (fee) parts.push(fee === 'free' ? '무료' : `유료${fac.feeAmount ? ` ${fac.feeAmount.toLocaleString()}원` : ''}`);
    if (fac.type === 'shower' && (agg.hotWater ?? fac.hotWater)) parts.push('온수');
    if (agg.lastTs) parts.push(`제보 ${formatAgo(agg.lastTs)}`);
    meta = parts.join(' · ');
  }
  return `<button type="button" class="frow" data-fac="${fac.id}">
    <div class="fic">${icon}</div>
    <div class="fbody"><div class="fname">${fac.name}</div><div class="fmeta">${meta}</div></div>
    <svg width="15" height="15" viewBox="0 0 24 24" class="fchev"><path d="M9 5 L16 12 L9 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </button>`;
}

/** 'M.D' → 올해의 Date. 개장 기간 판정용. */
function mdToDate(md: string, year: number): Date | null {
  const m = md.match(/^(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  return new Date(year, Number(m[1]) - 1, Number(m[2]));
}

/**
 * 개장 여부 배지. 근거 데이터가 2024년 일정이라 연도별로 며칠 차이가 나므로
 * '개장중'은 단정하지 않고 시즌 판정으로만 쓴다. 근거가 없으면 배지를 달지 않는다 —
 * 전에는 모든 해수욕장에 무조건 '개장중'을 붙여서 사실과 다를 수 있었다.
 */
function beachBadge(spot: Spot): string {
  if (spot.notOpening) return '<span class="badge closed">올해 미개장</span>';
  if (!spot.openStart || !spot.openEnd) return '';
  const now = new Date();
  const y = now.getFullYear();
  const s = mdToDate(spot.openStart, y);
  const e = mdToDate(spot.openEnd, y);
  if (!s || !e) return '';
  // 폐장일 당일까지 개장으로 본다
  e.setHours(23, 59, 59);
  if (now < s) return '<span class="badge caution">개장 예정</span>';
  if (now > e) return '<span class="badge closed">폐장</span>';
  return '<span class="badge open">개장 시즌</span>';
}

export function openSpotSheet(spotId: string): void {
  if (!state) return;
  const spot = spotById(spotId);
  if (!spot) return;
  state.selectedSpotId = spotId;

  const sheet = document.getElementById('spot-sheet')!;
  const facs = facilitiesOf(spotId);
  const toilets = facs.filter((f) => f.type === 'toilet').length;
  const showers = facs.filter((f) => f.type === 'shower').length;
  const aggs = facs.map((f) => aggregateFor(f.id)).filter((a) => a.count > 0);
  const avg = aggs.length
    ? (aggs.reduce((s, a) => s + a.avgStars, 0) / aggs.length).toFixed(1)
    : '-';

  const badge = spot.type === 'beach' ? beachBadge(spot) : '';

  const subParts = [spot.region];
  if (spot.openStart) subParts.push(`개장 ${spot.openStart}~${spot.openEnd} <span class="basis">(2024년 기준)</span>`);
  if (spot.note) subParts.push(spot.note);

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="srow1"><span class="sname">${spot.name}</span>${badge}</div>
    <div class="ssub">${subParts.join(' · ')}</div>
    <div class="stats">
      <div class="stat"><div class="v">${toilets}</div><div class="k">화장실</div></div>
      <div class="sep"></div>
      <div class="stat"><div class="v">${showers}</div><div class="k">샤워실</div></div>
      <div class="sep"></div>
      <div class="stat"><div class="v"><span class="staric">${svgStar(13, '#FFB331')}</span> ${avg}</div><div class="k">평균 별점</div></div>
    </div>
    ${spot.showerNote ? `<div class="shnote">${svgShower(15, '#1B9CF0')}<span>${spot.showerNote}</span></div>` : ''}
    <div class="frows">${facs.map((f) => facilityRowHtml(f, state!.myPos)).join('')}</div>
  `;
  sheet.hidden = false;

  sheet.querySelectorAll<HTMLButtonElement>('.frow').forEach((b) => {
    b.addEventListener('click', () => openReportSheet(b.dataset.fac!, state!.myPos));
  });

  refreshMarkers();
}

export function closeSheet(): void {
  if (!state) return;
  state.selectedSpotId = null;
  const sheet = document.getElementById('spot-sheet')!;
  sheet.hidden = true;
  refreshMarkers();
}

/** 제보 저장 후 열린 시트/핀 배지를 최신 집계로 갱신 */
export function refreshAfterReport(): void {
  if (!state) return;
  if (state.selectedSpotId) openSpotSheet(state.selectedSpotId);
  else refreshMarkers();
}

// ---------- 카카오맵 ----------

const KMAP_LOG = '[kakao-map]';

/**
 * 카카오맵 SDK 로더. 두 단계 모두 개별 타임아웃을 둔다:
 *  1) <script> 자체 로드 (네트워크/404)
 *  2) kakao.maps.load() 콜백 (도메인 미등록 시 콜백이 영영 안 오는 게 알려진 실패 모드 — techchat 3859)
 * 어느 쪽이 실패해도 false를 반환해 목업 지도로 폴백하고, 원인을 콘솔에 남긴다.
 */
function loadKakaoSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.kakao?.maps?.Map) {
      resolve(true);
      return;
    }
    if (!KAKAO_JS_KEY || KAKAO_JS_KEY.startsWith('__REPLACE')) {
      console.warn(`${KMAP_LOG} JS 키 미설정 — 목업 지도로 폴백합니다. .env.local의 VITE_KAKAO_JS_KEY를 확인하세요.`);
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (ok: boolean, reason?: string) => {
      if (settled) return;
      settled = true;
      if (!ok) console.error(`${KMAP_LOG} 로드 실패 — 목업 지도로 폴백합니다. 원인: ${reason}`);
      resolve(ok);
    };

    const scriptTimeout = window.setTimeout(() => finish(false, 'script 태그 로드 타임아웃(8s) — 네트워크 또는 키 형식 확인'), 8000);

    const s = document.createElement('script');
    s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_JS_KEY}&autoload=false`;
    s.onload = () => {
      window.clearTimeout(scriptTimeout);
      if (!window.kakao?.maps) {
        finish(false, 'script는 로드됐으나 window.kakao.maps 없음');
        return;
      }
      // 도메인 미등록 시 이 콜백이 오지 않을 수 있어(webview 무한 로딩의 실제 원인) 별도 타임아웃을 건다.
      const loadTimeout = window.setTimeout(
        () => finish(false, 'kakao.maps.load() 콜백 타임아웃(6s) — Web 플랫폼에 현재 도메인이 등록됐는지 확인 (개발자센터 > 플랫폼)'),
        6000,
      );
      try {
        window.kakao.maps.load(() => {
          window.clearTimeout(loadTimeout);
          finish(true);
        });
      } catch (e) {
        window.clearTimeout(loadTimeout);
        finish(false, `kakao.maps.load() 호출 중 예외: ${e}`);
      }
    };
    s.onerror = () => {
      window.clearTimeout(scriptTimeout);
      finish(false, 'script 태그 로드 에러(네트워크/404) — appkey 값 확인');
    };
    document.head.appendChild(s);
  });
}

function overlayFromHtml(html: string, onClick: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const el = wrap.firstElementChild as HTMLElement;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick();
  });
  return el;
}

function initKakaoMap(container: HTMLElement): void {
  if (!state) return;
  const { kakao } = window;
  const map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(state.myPos.lat, state.myPos.lng),
    level: DEFAULT_ZOOM,
  });
  state.kakaoMap = map;
  kakao.maps.event.addListener(map, 'click', () => closeSheet());
  renderKakaoOverlays();

  const my = document.createElement('div');
  my.className = 'mydot';
  new kakao.maps.CustomOverlay({
    position: new kakao.maps.LatLng(state.myPos.lat, state.myPos.lng),
    content: my,
    map,
    zIndex: 5,
  });
}

function renderKakaoOverlays(): void {
  if (!state?.kakaoMap) return;
  const { kakao } = window;
  state.kakaoOverlays.forEach((o) => o.setMap(null));
  state.kakaoOverlays = [];

  for (const fac of visibleFacilities()) {
    const el = overlayFromHtml(facilityPinHtml(fac, false), () => openReportSheet(fac.id, state!.myPos));
    const ov = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(fac.lat, fac.lng),
      content: el, map: state.kakaoMap, yAnchor: 1, zIndex: 10,
      clickable: true, // 필수 — 없으면 실기기 터치가 오버레이 클릭이 아니라 지도 팬 제스처로 먹힌다
    });
    state.kakaoOverlays.push(ov);
  }
  for (const spot of visibleSpots()) {
    const el = overlayFromHtml(spotPinHtml(spot, state.selectedSpotId === spot.id), () => openSpotSheet(spot.id));
    const ov = new kakao.maps.CustomOverlay({
      position: new kakao.maps.LatLng(spot.lat, spot.lng),
      content: el, map: state.kakaoMap, yAnchor: 1, zIndex: 20,
      clickable: true, // 데스크톱 브라우저 클릭은 됐지만 실기기 터치는 이게 없으면 안 눌린다(실측)
    });
    state.kakaoOverlays.push(ov);
  }
}

// ---------- 목업 지도 폴백 (카카오 JS 키 발급 전 개발용 — 땡모반 구조 승계) ----------

const MOCK_SPAN = { lat: 0.007, lng: 0.011 };

function project(container: HTMLElement, pos: LatLng): { x: number; y: number } {
  if (!state) return { x: 0, y: 0 };
  const w = container.clientWidth;
  const h = container.clientHeight;
  const x = ((pos.lng - state.myPos.lng) / MOCK_SPAN.lng) * (w / 2) + w / 2;
  const y = ((state.myPos.lat - pos.lat) / MOCK_SPAN.lat) * (h / 2) + h / 2;
  return { x, y };
}

function initMockMap(container: HTMLElement): void {
  if (!state) return;
  container.classList.add('mockmap');
  container.innerHTML = `
    <svg class="basemap" width="100%" height="100%" viewBox="0 0 390 700" preserveAspectRatio="xMidYMid slice">
      <rect width="390" height="700" fill="#F1F3EE"/>
      <g fill="#E7EAE3">
        <rect x="-20" y="10" width="120" height="90" rx="6"/><rect x="115" y="-10" width="150" height="110" rx="6"/>
        <rect x="280" y="20" width="130" height="80" rx="6"/><rect x="-30" y="115" width="105" height="120" rx="6"/>
        <rect x="90" y="115" width="80" height="70" rx="6"/><rect x="185" y="115" width="120" height="95" rx="6"/>
        <rect x="320" y="115" width="90" height="95" rx="6"/><rect x="90" y="200" width="80" height="85" rx="6"/>
        <rect x="-30" y="250" width="105" height="60" rx="6"/><rect x="185" y="225" width="60" height="60" rx="6"/>
      </g>
      <g fill="#DCEBD1"><rect x="250" y="230" width="100" height="70" rx="14"/></g>
      <g stroke="#FFFFFF" fill="none" stroke-linecap="round">
        <path d="M82 -10 L82 420" stroke-width="12"/>
        <path d="M-10 105 L400 105" stroke-width="12"/>
        <path d="M175 -10 L175 420" stroke-width="10"/>
        <path d="M-10 292 L400 292" stroke-width="10"/>
        <path d="M310 -10 L312 420" stroke-width="9"/>
      </g>
      <path d="M-5 430 Q195 405 395 435" stroke="#FFD98E" stroke-width="9" fill="none"/>
      <path d="M0 440 Q195 416 390 445 L390 545 Q195 575 0 532 Z" fill="#F9E7BA"/>
      <path d="M0 532 Q195 575 390 545 L390 700 L0 700 Z" fill="#7CC8F8"/>
      <path d="M0 566 Q195 605 390 578 L390 700 L0 700 Z" fill="#57B7F6" opacity=".65"/>
      <path d="M0 620 Q195 650 390 632 L390 700 L0 700 Z" fill="#3AA6F3" opacity=".55"/>
      <g stroke="#FFFFFF" opacity=".55" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M34 590 q19 -9 38 0 t38 0"/><path d="M216 630 q19 -9 38 0 t38 0"/><path d="M96 668 q19 -9 38 0 t38 0"/>
      </g>
    </svg>
    <div class="mock-badge">지도 미리보기 · 카카오맵 연동 전</div>
    <div class="mock-layer"></div>`;

  const layer = container.querySelector('.mock-layer') as HTMLElement;
  layer.addEventListener('click', () => closeSheet());
  renderMockMarkers(container, layer);

  const ro = new ResizeObserver(() => renderMockMarkers(container, layer));
  ro.observe(container);
}

function renderMockMarkers(container: HTMLElement, layer: HTMLElement): void {
  if (!state) return;
  if (container.clientWidth === 0 || container.clientHeight === 0) return;
  layer.innerHTML = '';

  const my = document.createElement('div');
  my.className = 'mydot';
  const mp = project(container, state.myPos);
  my.style.left = `${mp.x}px`;
  my.style.top = `${mp.y}px`;
  layer.appendChild(my);

  const place = (html: string, pos: LatLng, onClick: () => void) => {
    const { x, y } = project(container, pos);
    if (x < 12 || x > container.clientWidth - 12 || y < 24 || y > container.clientHeight - 24) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = html;
    const pin = wrap.firstElementChild as HTMLElement;
    pin.style.left = `${x}px`;
    pin.style.top = `${y}px`;
    pin.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    layer.appendChild(pin);
  };

  for (const fac of visibleFacilities()) {
    place(facilityPinHtml(fac, false), { lat: fac.lat, lng: fac.lng }, () => openReportSheet(fac.id, state!.myPos));
  }
  for (const spot of visibleSpots()) {
    place(spotPinHtml(spot, state.selectedSpotId === spot.id), { lat: spot.lat, lng: spot.lng }, () => openSpotSheet(spot.id));
  }
}

function refreshMarkers(): void {
  if (!state) return;
  if (state.kakaoMap) {
    renderKakaoOverlays();
  } else {
    const container = document.getElementById('map-container')!;
    const layer = container.querySelector('.mock-layer') as HTMLElement | null;
    if (layer) renderMockMarkers(container, layer);
  }
}

// ---------- 필터 칩 ----------

function initFilterChips(): void {
  document.querySelectorAll<HTMLButtonElement>('#chiprow .fchip').forEach((b) => {
    b.addEventListener('click', () => {
      if (!state) return;
      state.filter = b.dataset.filter as PinFilter;
      document.querySelectorAll<HTMLButtonElement>('#chiprow .fchip').forEach((x) => {
        x.classList.toggle('on', x === b);
      });
      refreshMarkers();
    });
  });
}

// ---------- 진입점 ----------

export async function initMapView(myPos: LatLng): Promise<void> {
  state = {
    myPos,
    filter: 'all',
    selectedSpotId: null,
    kakaoMap: null,
    kakaoOverlays: [],
  };

  const container = document.getElementById('map-container')!;
  const sdkOk = await loadKakaoSdk();
  let usedKakao = false;
  if (sdkOk) {
    try {
      initKakaoMap(container);
      usedKakao = true;
    } catch (e) {
      console.error(`${KMAP_LOG} 지도 초기화 중 예외 — 목업 지도로 폴백합니다:`, e);
    }
  }
  if (!usedKakao) {
    initMockMap(container);
  }

  initFilterChips();

  const chip = document.getElementById('map-chip')!;
  const chipText = document.getElementById('map-chip-text')!;
  const nearest = SPOTS
    .map((s) => ({ s, d: haversineM(myPos.lat, myPos.lng, s.lat, s.lng) }))
    .sort((a, b) => a.d - b.d)[0];
  chipText.textContent = nearest.d <= 3000
    ? `${nearest.s.name} 근처예요`
    : `가까운 물놀이 스팟 ${formatDist(nearest.d)}`;
  chip.hidden = false;

  document.getElementById('btn-locate')!.addEventListener('click', () => {
    if (state?.kakaoMap) {
      state.kakaoMap.setCenter(new window.kakao.maps.LatLng(myPos.lat, myPos.lng));
    } else {
      toast('현재 위치 기준으로 표시 중이에요');
    }
  });
}
