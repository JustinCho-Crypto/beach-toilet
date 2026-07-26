import { REWARD_DAILY_LIMIT } from './config';
import { facilityById, spotById } from './data';
import {
  getReports, totalConverted, pendingPoints, convertPending,
  rewardsRemainingToday, formatAgo,
} from './points';
import { showRewardedAd } from './ads';
import { toast, svgShower, svgWc, svgStar, CLEAN_LABEL, CLEAN_CLASS } from './ui';

// 포인트 탭 (기존 마이 화면을 탭으로 승격 — 기획안 §4).
// 제보로 적립한 앱 내 포인트를 보상형 광고 시청 후 토스포인트로 전환한다.

let converting = false;

async function onConvert(): Promise<void> {
  if (converting) return;
  const amount = pendingPoints();
  if (amount <= 0) {
    toast('전환할 포인트가 없어요');
    return;
  }
  converting = true;
  try {
    const watched = await showRewardedAd();
    if (!watched) {
      toast('광고 시청을 완료해야 전환할 수 있어요');
      return;
    }
    const converted = convertPending();
    toast(`토스포인트 ${converted.toLocaleString()}원으로 전환됐어요`);
    renderPointsView();
  } finally {
    converting = false;
  }
}

export function renderPointsView(): void {
  const root = document.getElementById('points-root');
  if (!root) return;

  const reports = getReports();
  const remaining = rewardsRemainingToday();
  const pending = pendingPoints();

  const historyRows = reports.length === 0
    ? `<div class="empty">
         아직 제보가 없어요.<br>물놀이 가서 화장실·샤워실을 제보하면<br><b>토스포인트</b>를 드려요!
       </div>`
    : reports.slice(0, 30).map((r) => {
        const fac = facilityById(r.facilityId);
        if (!fac) return '';
        const spot = spotById(fac.spotId);
        const icon = fac.type === 'shower' ? svgShower(20, '#1B9CF0') : svgWc(20, '#1B9CF0');
        const metaParts = [
          formatAgo(r.ts),
          `<span class="dot ${CLEAN_CLASS[r.clean]}"></span> <span class="${CLEAN_CLASS[r.clean]}">${CLEAN_LABEL[r.clean]}</span>`,
          `<span class="staric">${svgStar(11, '#FFB331')}</span><b class="star">${r.stars}</b>`,
          r.fee === 'free' ? '무료' : '유료',
        ];
        if (r.hotWater) metaParts.push('온수');
        return `<div class="hrow">
          <div class="fic">${icon}</div>
          <div class="fbody">
            <div class="fname">${spot && !fac.name.includes(spot.name) ? `${spot.name} ` : ''}${fac.name}</div>
            <div class="fmeta">${metaParts.join(' · ')}</div>
          </div>
          <span class="hreward">${r.reward > 0 ? `+${r.reward.toLocaleString()}원` : '—'}</span>
        </div>`;
      }).join('');

  root.innerHTML = `
    <div class="pagehead">
      <h2>포인트</h2>
      <div class="sub">제보하고 모은 토스포인트</div>
    </div>

    <div class="pointcard">
      <div class="pc-label">전환할 수 있는 포인트</div>
      <div class="pc-amount">${pending.toLocaleString()}원</div>
      <div class="pc-stats">
        <div class="pc-stat"><div class="k">오늘 남은 적립</div><div class="v">${remaining} / ${REWARD_DAILY_LIMIT}</div></div>
        <div class="pc-sep"></div>
        <div class="pc-stat"><div class="k">내 제보</div><div class="v">${reports.length}건</div></div>
        <div class="pc-sep"></div>
        <div class="pc-stat"><div class="k">전환 완료</div><div class="v">${totalConverted().toLocaleString()}원</div></div>
      </div>
      <button type="button" class="pc-cta${pending > 0 ? '' : ' off'}" id="btn-convert">
        ${pending > 0 ? '광고 보고 토스포인트로 전환' : '전환할 포인트가 없어요'}
      </button>
    </div>

    <div class="hhead">내 제보 이력</div>
    <div class="hlist">${historyRows}</div>
    <div class="disclaimer">현장 200m 이내에서 제보하면 포인트가 적립돼요 · 토스포인트 전환은 광고 시청 완료 기준</div>
  `;

  document.getElementById('btn-convert')?.addEventListener('click', onConvert);
}
