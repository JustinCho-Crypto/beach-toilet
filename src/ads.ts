import { AD_GROUP } from './config';

// 앱인토스 인앱 광고 2.0 어댑터 (땡모반 구조 승계).
// 개발 단계에서는 플레이스홀더 UI만 렌더하고, M3에서 @apps-in-toss/web-framework의
// 광고 API로 교체한다. 배너: 리스트형 고정. 보상형: 제보 완료 → 광고 시청 완료 콜백에서 포인트 지급 (기획 §3).
// 샌드박스는 인앱 광고 미지원이므로 폴백 UI는 운영에서도 no-fill 시 재사용된다.

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

/**
 * 보상형 전면 광고를 노출한다. resolve(true) = 시청 완료(보상 지급 가능).
 * TODO(M3): loadFullScreenAd/showFullScreenAd + 보상 콜백으로 교체. adGroupId = AD_GROUP.rewarded
 * 광고 no-fill(onUnavailable) 시 정책 결정 필요: 현재는 시청 완료로 간주하지 않고 false.
 */
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    const el = document.getElementById('interstitial');
    if (!el) {
      resolve(false);
      return;
    }
    el.hidden = false;
    el.innerHTML = `
      <div class="inter-card">
        <div class="inter-label">보상형 전면 광고 지면</div>
        <div class="inter-sub">개발 플레이스홀더 · M3에서 실제 광고로 교체<br>시청 완료 시에만 포인트가 지급돼요</div>
        <button class="inter-close" id="inter-done">광고 시청 완료 (개발용)</button>
        <button class="inter-skip" id="inter-skip">닫기 (시청 중단)</button>
      </div>`;
    const close = (ok: boolean) => {
      el.hidden = true;
      el.innerHTML = '';
      resolve(ok);
    };
    document.getElementById('inter-done')?.addEventListener('click', () => close(true));
    document.getElementById('inter-skip')?.addEventListener('click', () => close(false));
  });
}
