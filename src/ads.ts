import { AD_GROUP, INTERSTITIAL_EVERY_N_REPORTS } from './config';

// 앱인토스 인앱 광고 2.0 어댑터 (땡모반 구조 승계).
// 지면 3종 — 배너(상시 하단) / 보상형(포인트 전환) / 전면형(제보 시).
// 개발 단계에서는 플레이스홀더 UI만 렌더하고, M3에서 @apps-in-toss/web-framework의
// 광고 API로 교체한다. 지면 ID는 config.ts에만 둔다.
// 샌드박스는 인앱 광고 미지원이므로 폴백 UI는 운영에서도 no-fill 시 재사용된다.

const REPORT_COUNT_KEY = 'bt.reportAdCount';

export function mountBanner(el: HTMLElement): void {
  // TODO(M3): 앱인토스 배너 광고 마운트. adGroupId = AD_GROUP.banner
  el.innerHTML = `
    <div class="ad-thumb">AD</div>
    <div class="ad-body">
      <div class="ad-t1">배너 광고 영역</div>
      <div class="ad-t2">앱인토스 광고 SDK · ${AD_GROUP.banner}</div>
    </div>
    <div class="ad-mark">광고</div>`;
}

function showFullScreen(title: string, sub: string, buttons: Array<{ id: string; label: string; ok: boolean; primary?: boolean }>): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.getElementById('interstitial');
    if (!el) {
      resolve(false);
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <div class="inter-card">
        <div class="inter-label">${title}</div>
        <div class="inter-sub">${sub}</div>
        ${buttons.map((b) => `<button class="${b.primary ? 'inter-close' : 'inter-skip'}" id="${b.id}">${b.label}</button>`).join('')}
      </div>`;
    const close = (ok: boolean) => {
      el.hidden = true;
      el.innerHTML = '';
      resolve(ok);
    };
    for (const b of buttons) {
      document.getElementById(b.id)?.addEventListener('click', () => close(b.ok));
    }
  });
}

/**
 * 보상형 광고. resolve(true) = 시청 완료(보상 지급 가능).
 * TODO(M3): loadFullScreenAd/showFullScreenAd + 보상 콜백으로 교체. adGroupId = AD_GROUP.rewarded
 * 광고 no-fill(onUnavailable) 시 정책 결정 필요: 현재는 시청 완료로 간주하지 않고 false.
 */
export function showRewardedAd(): Promise<boolean> {
  return showFullScreen(
    '보상형 광고 지면',
    `개발 플레이스홀더 · ${AD_GROUP.rewarded}<br>시청 완료 시에만 포인트가 지급돼요`,
    [
      { id: 'inter-done', label: '광고 시청 완료 (개발용)', ok: true, primary: true },
      { id: 'inter-skip', label: '닫기 (시청 중단)', ok: false },
    ],
  );
}

/**
 * 제보 시 전면형 광고. 보상과 무관하므로 결과를 기다리되 실패해도 흐름을 막지 않는다.
 * INTERSTITIAL_EVERY_N_REPORTS 주기로만 노출한다 (전면형+보상형 2연속 방지).
 * TODO(M3): loadFullScreenAd/showFullScreenAd 로 교체. adGroupId = AD_GROUP.interstitial
 */
export async function maybeShowReportInterstitial(): Promise<void> {
  const n = Number(sessionStorage.getItem(REPORT_COUNT_KEY) ?? '0') + 1;
  sessionStorage.setItem(REPORT_COUNT_KEY, String(n));
  if (n % INTERSTITIAL_EVERY_N_REPORTS !== 0) return;
  await showFullScreen(
    '전면형 광고 지면',
    `개발 플레이스홀더 · ${AD_GROUP.interstitial}<br>제보 ${INTERSTITIAL_EVERY_N_REPORTS}회마다 1회 노출`,
    [{ id: 'inter-done', label: '닫기', ok: true, primary: true }],
  );
}
