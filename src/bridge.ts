import { DEFAULT_CENTER } from './config';

// 앱인토스 웹뷰 브릿지 어댑터 (땡모반 지도 구조 승계).
// M3에서 @apps-in-toss/web-framework 연동 시 이 파일만 교체하면 되도록
// 위치/저장소 등 네이티브 의존을 전부 여기로 모은다.

export interface LatLng {
  lat: number;
  lng: number;
}

export function getCurrentPosition(): Promise<{ pos: LatLng; isFallback: boolean }> {
  return new Promise((resolve) => {
    if (!('geolocation' in navigator)) {
      resolve({ pos: DEFAULT_CENTER, isFallback: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ pos: { lat: p.coords.latitude, lng: p.coords.longitude }, isFallback: false }),
      () => resolve({ pos: DEFAULT_CENTER, isFallback: true }),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
    );
  });
}

// 저장소 어댑터. M3에서 @apps-in-toss/framework 의 Storage로 교체
// (커뮤니티 AsyncStorage는 운영 토스에서 데이터 유실 — ait-factory 하드룰).
export function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function storageSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장 실패는 치명적이지 않음 (다음 저장에서 재시도)
  }
}
