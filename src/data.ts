// 스팟(해수욕장)·시설(화장실/샤워실) 타입 정의.
//
// 실제 데이터는 `npm run build:data`가 생성하는 data.generated.ts에서 온다:
//   스팟/샤워장/화장실 POI — 카카오 로컬 API 검색
//   화장실 — 전국공중화장실표준데이터(15012892, 2025.2부터 좌표 미제공 → 주소 지오코딩)
// 생성 파일은 저장소에 커밋되므로 클론 직후에도 빌드된다.

export type SpotType = 'beach';
export type FacilityType = 'toilet' | 'shower';
export type Cleanliness = 'clean' | 'normal' | 'dirty';

export interface Spot {
  id: string;
  type: SpotType;
  name: string;
  region: string;
  lat: number;
  lng: number;
  /**
   * 해수욕장 개장 기간 (M.D 형식). 출처는 해양수산부 2024년 개폐장일정이라
   * 연도별로 며칠씩 달라질 수 있어 '대략의 시즌'으로 다룬다.
   */
  openStart?: string;
  openEnd?: string;
  /** 공식 목록에 '미개장'으로 표기된 해수욕장 (헛걸음 방지용) */
  notOpening?: boolean;
  /**
   * 이용객 순위 등 한 줄 참고.
   */
  note?: string;
  /**
   * 샤워장이 있는 건 확인됐지만 정확한 위치를 모를 때의 안내 문구.
   * 지자체 공지에 개수·요금만 있고 좌표가 없는 경우가 많다 — 그때 없는 좌표를 지어내
   * 핀을 찍는 대신 스팟 단위로 알려준다. 정확한 위치는 유저 제보로 채워진다.
   */
  showerNote?: string;
}

export interface Facility {
  id: string;
  spotId: string;
  type: FacilityType;
  name: string;
  lat: number;
  lng: number;
  /** 시딩 시점의 기본값 — 제보가 쌓이면 제보 집계가 우선 */
  fee?: 'free' | 'paid';
  feeAmount?: number;
  hotWater?: boolean;
}

// 실제 데이터는 생성 파일에서 온다. `npm run build:data`로 재생성.
// (generated 쪽은 `import type`만 쓰므로 런타임 순환 참조가 생기지 않는다.)
export { SPOTS, FACILITIES } from './data.generated';
import { SPOTS, FACILITIES } from './data.generated';

export function spotById(id: string): Spot | undefined {
  return SPOTS.find((s) => s.id === id);
}

export function facilitiesOf(spotId: string): Facility[] {
  return FACILITIES.filter((f) => f.spotId === spotId);
}

export function facilityById(id: string): Facility | undefined {
  return FACILITIES.find((f) => f.id === id);
}

// ---------- 거리 ----------

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDist(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`;
}
