import './style.css';
import { getCurrentPosition } from './bridge';
import { initMapView, closeSheet } from './map';
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

async function boot(): Promise<void> {
  mountBanner(document.getElementById('ad-banner')!);

  document.querySelectorAll<HTMLButtonElement>('#tabbar .tab').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.tab as Tab));
  });

  renderPointsView();

  const { pos, isFallback } = await getCurrentPosition();
  await initMapView(pos);

  if (isFallback) toast('위치 권한이 없어 해운대 기준으로 표시해요');
}

boot().catch((e) => {
  console.error(e);
  toast('불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
});
