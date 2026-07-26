import { Accuracy, getCurrentLocation, Storage } from '@apps-in-toss/web-framework';
import { DEFAULT_CENTER } from './config';

// 앱인토스 웹뷰 브릿지 어댑터. @apps-in-toss/web-framework 연동 지점.
// 토스 웹뷰 밖(로컬 개발 등)에서는 브릿지 호출이 실패하므로 매 함수마다
// 브라우저 표준 API로 폴백해 개발 서버에서도 그대로 동작한다.

export interface LatLng {
  lat: number;
  lng: number;
}

function getBrowserPosition(): Promise<{ pos: LatLng; isFallback: boolean }> {
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

export async function getCurrentPosition(): Promise<{ pos: LatLng; isFallback: boolean }> {
  // 토스 웹뷰 밖(로컬 개발)에서는 브릿지가 동기적으로 예외를 던질 수도 있어
  // (isSupported()류 함수에서 실측) try/catch로 감싸고, 거부(Promise reject)도 폴백한다.
  try {
    const loc = await getCurrentLocation({ accuracy: Accuracy.Balanced });
    return { pos: { lat: loc.coords.latitude, lng: loc.coords.longitude }, isFallback: false };
  } catch {
    return getBrowserPosition();
  }
}

// ---------- 저장소 ----------
// 공식 Storage는 비동기라, 동기 API(storageGet/storageSet)를 유지하기 위해
// in-memory 캐시를 앞에 두는 write-through 패턴을 쓴다 (geumsongaji useGame.ts 승계).
// 앱 부팅 시 반드시 hydrateStorage(keys)를 await한 뒤에 storageGet을 호출할 것 —
// 하이드레이션 전에는 fallback 값만 반환된다.

const cache = new Map<string, string>();

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * 부팅 시 1회 호출: 공식 Storage에서 알려진 키들을 읽어 캐시를 채운다.
 * 공식 Storage가 비어 있으면(신규 유저) 구버전 localStorage 값을 1회 구제 이관한다.
 * 토스 웹뷰 밖(로컬 개발)이라 Storage 호출 자체가 실패하면 localStorage를 그대로 쓴다.
 */
export async function hydrateStorage(keys: string[]): Promise<void> {
  await Promise.all(
    keys.map(async (key) => {
      try {
        const value = await Storage.getItem(key);
        if (value !== null) {
          cache.set(key, value);
          return;
        }
      } catch {
        // 공식 Storage 미지원 환경 — 아래 localStorage 폴백으로 진행
      }
      const legacy = safeLocalStorageGet(key);
      if (legacy !== null) cache.set(key, legacy);
    }),
  );
}

export function storageGet<T>(key: string, fallback: T): T {
  const raw = cache.get(key);
  if (raw === undefined) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function fallbackLocalStorageSet(raw: string, key: string): void {
  try {
    localStorage.setItem(key, raw);
  } catch {
    // 저장 실패는 치명적이지 않음 (다음 저장에서 재시도)
  }
}

export function storageSet(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  cache.set(key, raw);
  try {
    // 공식 Storage가 동기적으로 예외를 던질 수도 있어 try/catch로 한 번 더 감싼다.
    Storage.setItem(key, raw).catch(() => fallbackLocalStorageSet(raw, key));
  } catch {
    fallbackLocalStorageSet(raw, key);
  }
}
