import './style.css';
import { getCurrentPosition } from './bridge';
import { initMapView, closeSheet } from './map';
import { initPoints } from './points';
import { renderPointsView } from './pointsView';
import { mountBanner } from './ads';
import { toast } from './ui';

type Tab = 'map' | 'points';

/**
 * 활성 배경을 버튼마다 즉시 켜고 끄는 대신, 인디케이터 하나를 transform으로 슬라이드시킨다
 * (땡모반 지도 패턴 승계) — 레이아웃 리플로우 없이 GPU 합성만으로 움직여서 실기기에서도
 * 버벅이지 않는다. 버튼 쪽은 색상만 바뀌므로 CSS transition으로 충분히 부드럽다.
 */
function moveTabIndicator(activeBtn: HTMLElement): void {
  const indicator = document.getElementById('tab-indicator');
  if (!indicator) return;
  indicator.style.width = `${activeBtn.offsetWidth}px`;
  indicator.style.transform = `translateX(${activeBtn.offsetLeft}px)`;
}

function switchTab(tab: Tab): void {
  document.getElementById('view-map')!.hidden = tab !== 'map';
  document.getElementById('view-points')!.hidden = tab !== 'points';
  document.querySelectorAll<HTMLButtonElement>('#tabbar .tab').forEach((b) => {
    const active = b.dataset.tab === tab;
    b.classList.toggle('active', active);
    if (active) moveTabIndicator(b);
  });
  if (tab === 'points') {
    closeSheet();
    renderPointsView();
  }
}

/**
 * 부팅 단계를 하나로 이어 쓰지 않고 각각 독립적으로 실행한다.
 * 실기기(실제 토스 앱)에서 SDK 호출 하나가 예외를 던져 boot() 전체가 멈추는 사고가
 * 실제로 있었다(2026-07-27, 배너 광고 초기화 실패로 지도·포인트까지 통째로 안 뜸).
 * 데스크톱 브라우저 테스트로는 이런 실기기 전용 실패가 안 보였다 —
 * 그래서 "한쪽이 죽어도 나머지는 살아야 한다"를 구조로 강제한다.
 */
async function step(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (e) {
    console.error(`[boot] ${name} 실패`, e);
  }
}

async function boot(): Promise<void> {
  await step('배너 광고', () => mountBanner(document.getElementById('ad-banner')!));

  await step('탭 전환 바인딩', () => {
    const tabs = document.querySelectorAll<HTMLButtonElement>('#tabbar .tab');
    tabs.forEach((b) => {
      b.addEventListener('click', () => switchTab(b.dataset.tab as Tab));
    });
    const active = document.querySelector<HTMLButtonElement>('#tabbar .tab.active');
    if (active) moveTabIndicator(active); // 초기 활성 탭(지도) 위치로 인디케이터 배치
  });

  await step('포인트 초기화', async () => {
    await initPoints(); // 공식 Storage 하이드레이션 + 서버 제보 동기화
    renderPointsView();
  });

  await step('지도 초기화', async () => {
    const { pos, isFallback } = await getCurrentPosition();
    await initMapView(pos);
    if (isFallback) toast('위치 권한이 없어 해운대 기준으로 표시해요');
  });
}

boot();
