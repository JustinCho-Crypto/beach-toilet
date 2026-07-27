import { loadFullScreenAd, showFullScreenAd, TossAds } from '@apps-in-toss/web-framework';
import { AD_GROUP } from './config';

// 앱인토스 인앱 광고 2.0 어댑터.
// 지면 3종 — 배너(상시 하단) / 보상형(포인트 전환) / 전면형(제보 시).
// 토스 웹뷰 밖(로컬 개발, 샌드박스 미지원 등)에서는 isSupported()가 false이거나
// 브릿지 호출이 실패하므로, 그 경우엔 기존 플레이스홀더 UI로 폴백해 개발을 이어간다.

const REPORT_COUNT_KEY = 'bt.reportAdCount';

/**
 * isSupported()는 지원 여부를 boolean으로 돌려주는 게 계약이지만, 실제로는
 * 토스 웹뷰 밖(로컬 개발 등)에서 네이티브 상수를 못 찾아 예외를 던지는 경우가 있다
 * (`fetchTossAd_isSupported is not a constant handler` 실측). 항상 이 래퍼로만 호출한다.
 */
function isSupported(check?: () => boolean): boolean {
  try {
    return check?.() === true;
  } catch {
    return false;
  }
}

/**
 * 배너 광고. 반드시 TossAds.initialize()의 onInitialized 콜백 안에서만 attachBanner를
 * 호출한다 — 초기화 완료 전에 부착을 시도하면 조용히 아무것도 안 뜨는 게 실기기 실측
 * 결과였다(2026-07-27). isSupported() 게이트도 attachBanner가 아니라 initialize
 * 쪽으로 건다 — attachBanner.isSupported()는 초기화 이전엔 신뢰할 수 없다.
 * (땡모반 지도 ads.ts 패턴 그대로 승계 — 실기기에서 검증된 유일한 순서.)
 */
export function mountBanner(el: HTMLElement): void {
  if (!isSupported(TossAds.initialize.isSupported)) {
    mountBannerPlaceholder(el);
    return;
  }
  try {
    TossAds.initialize({
      callbacks: {
        onInitialized: () => attachBanner(el),
        onInitializationFailed: (error) => {
          console.warn('[ads] TossAds 초기화 실패', error);
          collapseBanner(el);
        },
      },
    });
  } catch (e) {
    console.warn('[ads] TossAds 초기화 예외', e);
    mountBannerPlaceholder(el);
  }
}

function attachBanner(el: HTMLElement): void {
  el.innerHTML = '';
  el.classList.add('adbanner-live');

  // --banner-h 계약: 다른 하단 UI(위치 버튼·플로팅 탭·바텀시트·토스트)가
  // calc(banner-h + safe-b)로 오프셋을 잡으므로, 이 값은 항상 "실제 배너 박스 높이"와
  // 같아야 한다. 실광고 모드는 padding을 두지 않아(위 CSS 주석 참고) 렌더 높이에
  // safe-b가 안 섞이는데, 소비자 쪽 공식은 여전히 +safe-b를 더하니 저장 전에 미리 뺀다.
  const syncHeight = () => {
    const rectH = Math.ceil(el.getBoundingClientRect().height);
    const h = Math.max(0, rectH - getSafeBottomPx());
    if (h > 20) document.documentElement.style.setProperty('--banner-h', `${h}px`);
  };
  new ResizeObserver(syncHeight).observe(el);

  try {
    TossAds.attachBanner(AD_GROUP.banner, el, {
      theme: 'auto',
      variant: 'expanded',
      callbacks: {
        onNoFill: () => collapseBanner(el),
        onAdFailedToRender: (payload) => {
          console.warn('[ads] 배너 렌더 실패', payload);
          collapseBanner(el);
        },
      },
    });
  } catch (e) {
    console.warn('[ads] 배너 부착 예외', e);
    collapseBanner(el);
  }
}

/** 광고가 없을 때 빈 회색 띠를 남기지 않도록 배너 영역을 접는다 */
function collapseBanner(el: HTMLElement): void {
  el.innerHTML = '';
  el.classList.add('adbanner-collapsed');
  document.documentElement.style.setProperty('--banner-h', '0px');
}

/** 토스 웹뷰 밖(로컬 개발 등)에서 지면 위치를 확인하기 위한 표시 */
function mountBannerPlaceholder(el: HTMLElement): void {
  el.innerHTML = `
    <div class="ad-thumb">AD</div>
    <div class="ad-body">
      <div class="ad-t1">배너 광고 영역</div>
      <div class="ad-t2">앱인토스 광고 SDK · ${AD_GROUP.banner}</div>
    </div>
    <div class="ad-mark">광고</div>`;
}

/** style.css --safe-b(env(safe-area-inset-bottom))와 동일한 값을 px로 읽어온다 */
function getSafeBottomPx(): number {
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;bottom:0;left:0;height:0;padding-bottom:env(safe-area-inset-bottom, 0px);visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return px;
}

function showFullScreenPlaceholder(
  title: string,
  sub: string,
  buttons: Array<{ id: string; label: string; ok: boolean; primary?: boolean }>,
): Promise<boolean> {
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
 * 전면형/보상형 공용 재생 함수. load → loaded 시 show → 이벤트로 결과 판정.
 * 정책: dismissed만으로는 절대 보상 확정하지 않음 — userEarnedReward가 선행돼야 true.
 * (geumsongaji playRewardedAd 패턴 승계 — load 에러 메시지에 '로드'/'준비' 포함 시
 *  이미 로드된 상태로 보고 show()를 바로 시도)
 */
function playFullScreenAd(adGroupId: string, requireReward: boolean): Promise<boolean> {
  return new Promise((resolve) => {
    let earned = false;
    let settled = false;

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const show = () => {
      try {
        showFullScreenAd({
          options: { adGroupId },
          onEvent: (event) => {
            switch (event.type) {
              case 'userEarnedReward':
                earned = true;
                break;
              case 'dismissed':
                settle(requireReward ? earned : true);
                break;
              case 'failedToShow':
                settle(false);
                break;
              default:
                break;
            }
          },
          onError: () => settle(false),
        });
      } catch {
        settle(false);
      }
    };

    try {
      const cleanupLoad = loadFullScreenAd({
        options: { adGroupId },
        onEvent: (loadEvent) => {
          if (loadEvent.type !== 'loaded') return;
          cleanupLoad();
          show();
        },
        onError: (err) => {
          const message = err instanceof Error ? err.message : String(err ?? '');
          if (message.includes('로드') || message.includes('준비')) {
            show();
            return;
          }
          settle(false);
        },
      });
    } catch {
      settle(false);
    }
  });
}

/**
 * 보상형 광고. resolve(true) = 시청 완료(보상 지급 가능).
 * 토스 웹뷰 밖(로컬 개발)이거나 미지원 환경이면 플레이스홀더 UI로 폴백한다.
 */
export async function showRewardedAd(): Promise<boolean> {
  if (!isSupported(loadFullScreenAd.isSupported)) {
    return showFullScreenPlaceholder(
      '보상형 광고 지면',
      `개발 플레이스홀더 · ${AD_GROUP.rewarded}<br>시청 완료 시에만 포인트가 지급돼요`,
      [
        { id: 'inter-done', label: '광고 시청 완료 (개발용)', ok: true, primary: true },
        { id: 'inter-skip', label: '닫기 (시청 중단)', ok: false },
      ],
    );
  }
  return playFullScreenAd(AD_GROUP.rewarded, true);
}

/**
 * 제보 시 전면형 광고. 보상과 무관하므로 결과와 상관없이 제보는 저장된다.
 * 제보와 포인트 전환이 서로 다른 시점이라 풀스크린이 연달아 뜨지 않는다 —
 * 그래서 주기 제한 없이 매 제보마다 노출한다.
 */
export async function showReportInterstitial(): Promise<void> {
  const n = Number(sessionStorage.getItem(REPORT_COUNT_KEY) ?? '0') + 1;
  sessionStorage.setItem(REPORT_COUNT_KEY, String(n));

  if (!isSupported(loadFullScreenAd.isSupported)) {
    await showFullScreenPlaceholder(
      '전면형 광고 지면',
      `개발 플레이스홀더 · ${AD_GROUP.interstitial}<br>제보 시 노출`,
      [{ id: 'inter-done', label: '닫기', ok: true, primary: true }],
    );
    return;
  }
  await playFullScreenAd(AD_GROUP.interstitial, false);
}
