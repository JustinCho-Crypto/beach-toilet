import './style.css';
import { getCurrentPosition } from './bridge';
import { initMapView, closeSheet } from './map';
import { initPoints } from './points';
import { renderPointsView } from './pointsView';
import { mountBanner } from './ads';
import { toast } from './ui';

type Tab = 'map' | 'points';

function switchTab(tab: Tab): void {
  document.getElementById('view-map')!.hidden = tab !== 'map';
  document.getElementById('view-points')!.hidden = tab !== 'points';
  document.querySelectorAll<HTMLButtonElement>('#tabbar .tab').forEach((b) => {
    b.classList.toggle('active', b.dataset.tab === tab);
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
    document.querySelectorAll<HTMLButtonElement>('#tabbar .tab').forEach((b) => {
      b.addEventListener('click', () => switchTab(b.dataset.tab as Tab));
    });
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
