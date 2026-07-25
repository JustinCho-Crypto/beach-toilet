// 스팟(해수욕장/계곡)·시설(화장실/샤워실) 타입과 시드 데이터.
// 시드는 개발용 샘플 — 출시 전 공공데이터 배치(기획안 §5)로 교체한다.
//   해수욕장: 해양수산부 개폐장일정(15056091) + 지오코딩
//   계곡: 행안부 물놀이관리지역 API(15101866)
//   화장실: 전국공중화장실표준데이터(15012892, 좌표 중단 → 주소 지오코딩)
//   샤워실: 방문객 상위 30곳 수작업 시딩

export type SpotType = 'beach' | 'valley';
export type FacilityType = 'toilet' | 'shower';
export type Cleanliness = 'clean' | 'normal' | 'dirty';

export interface Spot {
  id: string;
  type: SpotType;
  name: string;
  region: string;
  lat: number;
  lng: number;
  /** 해수욕장: 개장 기간 (M-D). 계곡: 없음 */
  openStart?: string;
  openEnd?: string;
  /** 계곡: 생활안전지도 물놀이관리지역 등급 */
  risk?: 'normal' | 'caution' | 'danger';
  /** 이용객 순위 등 한 줄 참고 */
  note?: string;
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

export const SPOTS: Spot[] = [
  { id: 'haeundae', type: 'beach', name: '해운대해수욕장', region: '부산 해운대구', lat: 35.1587, lng: 129.1604, openStart: '6.1', openEnd: '8.31', note: '작년 이용객 1위' },
  { id: 'gwangalli', type: 'beach', name: '광안리해수욕장', region: '부산 수영구', lat: 35.1532, lng: 129.1187, openStart: '6.1', openEnd: '8.31' },
  { id: 'sokcho', type: 'beach', name: '속초해수욕장', region: '강원 속초시', lat: 38.1901, lng: 128.6035, openStart: '6.28', openEnd: '8.25' },
  { id: 'eurwangni', type: 'beach', name: '을왕리해수욕장', region: '인천 중구', lat: 37.4485, lng: 126.3728, openStart: '6.20', openEnd: '8.31' },
  { id: 'yongchu', type: 'valley', name: '용추계곡', region: '경기 가평군', lat: 37.8859, lng: 127.5217, risk: 'caution' },
  { id: 'baegundong', type: 'valley', name: '백운동계곡', region: '경기 포천시', lat: 38.0182, lng: 127.4235, risk: 'danger' },
];

export const FACILITIES: Facility[] = [
  // 해운대 (와이어프레임 기준 시딩)
  { id: 'hd-t1', spotId: 'haeundae', type: 'toilet', name: '중앙 공중화장실', lat: 35.1594, lng: 129.1598, fee: 'free' },
  { id: 'hd-s1', spotId: 'haeundae', type: 'shower', name: '해변 샤워장 (탈의실)', lat: 35.1589, lng: 129.1617, fee: 'paid', feeAmount: 2000, hotWater: true },
  { id: 'hd-t2', spotId: 'haeundae', type: 'toilet', name: '서편 주차장 화장실', lat: 35.1598, lng: 129.1573, fee: 'free' },
  { id: 'hd-t3', spotId: 'haeundae', type: 'toilet', name: '동편 광장 화장실', lat: 35.1585, lng: 129.1645, fee: 'free' },
  { id: 'hd-s2', spotId: 'haeundae', type: 'shower', name: '구남로 샤워장', lat: 35.1601, lng: 129.1608, fee: 'paid', feeAmount: 1000 },
  { id: 'hd-t4', spotId: 'haeundae', type: 'toilet', name: '미포 방면 화장실', lat: 35.1576, lng: 129.1672, fee: 'free' },
  // 광안리
  { id: 'ga-t1', spotId: 'gwangalli', type: 'toilet', name: '광안리 중앙 화장실', lat: 35.1536, lng: 129.1181, fee: 'free' },
  { id: 'ga-s1', spotId: 'gwangalli', type: 'shower', name: '광안리 해변 샤워장', lat: 35.1528, lng: 129.1199, fee: 'paid', feeAmount: 2000 },
  // 속초
  { id: 'sc-t1', spotId: 'sokcho', type: 'toilet', name: '속초해변 동편 화장실', lat: 38.1907, lng: 128.6041, fee: 'free' },
  { id: 'sc-s1', spotId: 'sokcho', type: 'shower', name: '속초해변 샤워장', lat: 38.1896, lng: 128.6029, fee: 'paid', feeAmount: 1500 },
  // 을왕리
  { id: 'ew-t1', spotId: 'eurwangni', type: 'toilet', name: '을왕리 공중화장실', lat: 37.4488, lng: 126.3735, fee: 'free' },
  // 용추계곡
  { id: 'yc-t1', spotId: 'yongchu', type: 'toilet', name: '용추계곡 입구 화장실', lat: 37.8853, lng: 127.5211, fee: 'free' },
  // 백운동계곡
  { id: 'bu-t1', spotId: 'baegundong', type: 'toilet', name: '백운동 주차장 화장실', lat: 38.0176, lng: 127.4229, fee: 'free' },
];

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
