import { GPS_RADIUS_M, DEV_BYPASS_GPS } from './config';
import { facilityById, haversineM, formatDist, Cleanliness } from './data';
import { LatLng } from './bridge';
import { showReportInterstitial } from './ads';
import { saveReport, reportedToday, rewardsRemainingToday } from './points';
import { toast, svgShower, svgWc, svgStar, svgPinLoc, CLEAN_LABEL, CLEAN_CLASS } from './ui';
import { refreshAfterReport } from './map';
import { renderPointsView } from './pointsView';

// 제보 플로우 (기획안 §3: 별점 · 청결도 · 요금 + 샤워실만 온수 토글).
// CTA "제보하고 토스 포인트 받기" → 보상형 광고 시청 완료 콜백 → 100~1,000원 지급.

interface Draft {
  stars: 1 | 2 | 3 | 4 | 5;
  clean: Cleanliness | null;
  fee: 'free' | 'paid' | null;
  hotWater: boolean | null;
}

let draft: Draft = { stars: 4, clean: null, fee: null, hotWater: null };
let currentFacId: string | null = null;
let submitting = false;

export function openReportSheet(facilityId: string, myPos: LatLng): void {
  const fac = facilityById(facilityId);
  if (!fac) return;

  const distM = haversineM(myPos.lat, myPos.lng, fac.lat, fac.lng);
  const inRange = distM <= GPS_RADIUS_M;

  if (!inRange && !DEV_BYPASS_GPS) {
    toast(`시설 ${GPS_RADIUS_M}m 이내에서만 제보할 수 있어요 (현재 ${formatDist(distM)})`);
    return;
  }
  if (reportedToday(facilityId)) {
    toast('이 시설은 오늘 이미 제보했어요. 내일 다시 제보할 수 있어요');
    return;
  }

  currentFacId = facilityId;
  draft = { stars: 4, clean: null, fee: fac.fee ?? null, hotWater: fac.type === 'shower' ? (fac.hotWater ?? null) : null };

  const sheet = document.getElementById('report-sheet')!;
  const icon = fac.type === 'shower' ? svgShower(20, '#1B9CF0') : svgWc(20, '#1B9CF0');
  const gpsBadge = inRange
    ? `<span class="badge gps">${svgPinLoc(11, '#1FA85C')} 현장 인증 완료 · ${formatDist(distM)} 거리</span>`
    : `<span class="badge devgps">${svgPinLoc(11, '#D9730D')} 개발 모드 · GPS 인증 생략 (${formatDist(distM)})</span>`;

  const hotWaterBlock = fac.type === 'shower' ? `
    <div class="fcol">
      <div class="flabel">온수 <span class="fsub">(샤워실)</span></div>
      <div class="segrow" id="seg-hot">
        <button type="button" class="seg" data-hot="true">나와요</button>
        <button type="button" class="seg" data-hot="false">안 나와요</button>
      </div>
    </div>` : '';

  sheet.innerHTML = `
    <div class="grab"></div>
    <div class="rhead">
      <div class="fic">${icon}</div>
      <span class="rtitle">${fac.name} 제보하기</span>
    </div>
    <div class="rgps">${gpsBadge}</div>

    <div class="flabel mt20">전체적으로 어땠나요?</div>
    <div class="starrow" id="starrow">
      ${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="starbtn" data-star="${i}">${svgStar(32, i <= draft.stars ? '#FFB331' : '#E5E8EB')}</button>`).join('')}
    </div>

    <div class="flabel mt20">청결 상태</div>
    <div class="segrow" id="seg-clean">
      ${(['clean', 'normal', 'dirty'] as Cleanliness[]).map((c) => `
        <button type="button" class="seg" data-clean="${c}"><span class="dot ${CLEAN_CLASS[c]}"></span>${CLEAN_LABEL[c]}</button>`).join('')}
    </div>

    <div class="fgrid">
      <div class="fcol">
        <div class="flabel">요금</div>
        <div class="segrow" id="seg-fee">
          <button type="button" class="seg" data-fee="free">무료</button>
          <button type="button" class="seg" data-fee="paid">유료</button>
        </div>
      </div>
      ${hotWaterBlock}
    </div>

    <button type="button" class="cta" id="btn-submit">제보하고 토스 포인트 받기</button>
    <div class="ctasub">광고를 보면 100~1,000원 토스포인트를 드려요 · 오늘 남은 보상 ${rewardsRemainingToday()}회</div>
  `;
  sheet.hidden = false;
  document.getElementById('report-dim')!.hidden = false;

  bindDraftControls(fac.type === 'shower');
  syncDraftUi();
}

function closeReportSheet(): void {
  document.getElementById('report-sheet')!.hidden = true;
  document.getElementById('report-dim')!.hidden = true;
  currentFacId = null;
}

function bindDraftControls(isShower: boolean): void {
  document.querySelectorAll<HTMLButtonElement>('#starrow .starbtn').forEach((b) => {
    b.addEventListener('click', () => {
      draft.stars = Number(b.dataset.star) as Draft['stars'];
      syncDraftUi();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('#seg-clean .seg').forEach((b) => {
    b.addEventListener('click', () => {
      draft.clean = b.dataset.clean as Cleanliness;
      syncDraftUi();
    });
  });
  document.querySelectorAll<HTMLButtonElement>('#seg-fee .seg').forEach((b) => {
    b.addEventListener('click', () => {
      draft.fee = b.dataset.fee as 'free' | 'paid';
      syncDraftUi();
    });
  });
  if (isShower) {
    document.querySelectorAll<HTMLButtonElement>('#seg-hot .seg').forEach((b) => {
      b.addEventListener('click', () => {
        draft.hotWater = b.dataset.hot === 'true';
        syncDraftUi();
      });
    });
  }
  document.getElementById('btn-submit')!.addEventListener('click', submit);
  document.getElementById('report-dim')!.addEventListener('click', closeReportSheet);
}

function syncDraftUi(): void {
  document.querySelectorAll<HTMLButtonElement>('#starrow .starbtn').forEach((b) => {
    const i = Number(b.dataset.star);
    b.innerHTML = svgStar(32, i <= draft.stars ? '#FFB331' : '#E5E8EB');
  });
  document.querySelectorAll<HTMLButtonElement>('#seg-clean .seg').forEach((b) => {
    b.classList.toggle('on', b.dataset.clean === draft.clean);
  });
  document.querySelectorAll<HTMLButtonElement>('#seg-fee .seg').forEach((b) => {
    b.classList.toggle('on', b.dataset.fee === draft.fee);
  });
  document.querySelectorAll<HTMLButtonElement>('#seg-hot .seg').forEach((b) => {
    b.classList.toggle('on', draft.hotWater !== null && b.dataset.hot === String(draft.hotWater));
  });
  const btn = document.getElementById('btn-submit') as HTMLButtonElement | null;
  if (btn) btn.classList.toggle('disabled', draft.clean === null || draft.fee === null);
}

async function submit(): Promise<void> {
  if (submitting || !currentFacId) return;
  if (draft.clean === null || draft.fee === null) {
    toast('청결 상태와 요금을 선택해 주세요');
    return;
  }
  submitting = true;
  const facId = currentFacId;

  try {
    // 제보 시에는 전면형만 노출한다. 보상형은 포인트 탭의 '전환'에서만 (justin 확정 2026-07-26).
    await showReportInterstitial();
    const report = saveReport(
      {
        facilityId: facId,
        stars: draft.stars,
        clean: draft.clean,
        fee: draft.fee,
        ...(draft.hotWater !== null ? { hotWater: draft.hotWater } : {}),
      },
      true,
    );
    closeReportSheet();
    if (report.reward > 0) {
      toast(`제보 완료! ${report.reward.toLocaleString()}포인트가 적립됐어요`);
    } else {
      toast('제보 완료! 오늘 적립 횟수를 모두 사용했어요');
    }
    refreshAfterReport();
    renderPointsView();
  } finally {
    submitting = false;
  }
}
