let toastTimer: number | undefined;

export function toast(msg: string): void {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    el.hidden = true;
  }, 2200);
}

// ---------- 공용 SVG (로고의 남녀 픽토그램과 동일 계열 — TDS 톤, 이모지 금지) ----------

export function svgWc(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <circle cx="6" cy="3.6" r="2.3"/><rect x="3.6" y="6.7" width="4.8" height="8" rx="2.4"/>
    <rect x="4.2" y="14.4" width="1.7" height="6.4" rx="0.85"/><rect x="6.4" y="14.4" width="1.7" height="6.4" rx="0.85"/>
    <rect x="11.4" y="2" width="1.2" height="20" rx="0.6" opacity=".45"/>
    <circle cx="18" cy="3.6" r="2.3"/><rect x="16.7" y="6.4" width="2.6" height="3.4" rx="1.3"/>
    <path d="M18 7.6 L13.9 15.4 a.7.7 0 0 0 .62 1.02 h6.96 a.7.7 0 0 0 .62-1.02 Z"/>
    <rect x="16.2" y="15.6" width="1.6" height="5.4" rx="0.8"/><rect x="18.3" y="15.6" width="1.6" height="5.4" rx="0.8"/>
  </svg>`;
}

export function svgShower(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M5.5 10.5 V5.4 A3.4 3.4 0 0 1 8.9 2 h1.7 a3.2 3.2 0 0 1 3.1 2.4" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M9.2 8.6 a5.3 3.6 0 0 1 10.6 0 Z"/>
    <circle cx="10.6" cy="12.6" r="1.25"/><circle cx="14.5" cy="13.4" r="1.25"/><circle cx="18.4" cy="12.6" r="1.25"/>
    <circle cx="12.2" cy="16.8" r="1.25"/><circle cx="16.8" cy="17" r="1.25"/><circle cx="14.5" cy="20.6" r="1.25"/>
  </svg>`;
}

export function svgParasol(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 2.2 C6.2 2.2 2.6 7.6 2.4 11.4 a.8.8 0 0 0 .8.85 h17.6 a.8.8 0 0 0 .8-.85 C21.4 7.6 17.8 2.2 12 2.2 Z"/>
    <path d="M11.1 12.2 h1.8 V20 a.9.9 0 0 1-1.8 0 Z"/><circle cx="12" cy="21" r="1.15"/>
    <rect x="11.3" y="1" width="1.4" height="2.4" rx="0.7"/>
  </svg>`;
}

export function svgValley(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M8.2 4.6 a1.1 1.1 0 0 1 1.9 0 L15.6 14 H2.7 Z"/>
    <path d="M15.1 8.2 a1.05 1.05 0 0 1 1.8 0 L21.4 14 H11.6 Z" opacity=".75"/>
    <path d="M2.5 17.2 q2.4-1.7 4.8 0 t4.8 0 t4.8 0 t4.6 0" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round"/>
    <path d="M2.5 20.6 q2.4-1.7 4.8 0 t4.8 0 t4.8 0 t4.6 0" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" opacity=".55"/>
  </svg>`;
}

export function svgStar(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 2.6 l2.8 5.9 6.4.8 -4.7 4.4 1.2 6.3 L12 16.9 6.3 20 l1.2-6.3 L2.8 9.3 l6.4-.8 Z"/>
  </svg>`;
}

export function svgPinLoc(size: number, color: string): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}">
    <path d="M12 1.8 a7.6 7.6 0 0 0-7.6 7.6 c0 5.4 6.3 11.9 7 12.6 a.85.85 0 0 0 1.2 0 c.7-.7 7-7.2 7-12.6 A7.6 7.6 0 0 0 12 1.8 Z m0 10.3 a2.8 2.8 0 1 1 0-5.6 a2.8 2.8 0 0 1 0 5.6 Z"/>
  </svg>`;
}

export function starsHtml(filled: number, size = 13): string {
  let out = '';
  for (let i = 1; i <= 5; i += 1) {
    out += `<span class="staric">${svgStar(size, i <= filled ? '#FFB331' : '#E5E8EB')}</span>`;
  }
  return out;
}

export const CLEAN_LABEL = { clean: '깨끗해요', normal: '보통', dirty: '더러워요' } as const;
export const CLEAN_CLASS = { clean: 'g', normal: 'y', dirty: 'r' } as const;
