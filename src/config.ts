// 운영 전환 시 교체가 필요한 값은 전부 이 파일에 모은다 (ait-factory M3 규칙).

// 카카오맵 JavaScript 키. 발급 전까지는 플레이스홀더 → SDK 로드 실패 시 목업 지도로 폴백된다.
// 로컬 개발 중엔 .env.local(gitignore 대상)에 VITE_KAKAO_JS_KEY=발급받은키 를 넣으면 즉시 적용된다.
// M3(운영 전환) 시점엔 아래 플레이스홀더 상수 자체를 실키로 교체 (ait-factory 컨벤션 — config.ts에만 값 집중).
// 필수: 카카오 개발자 콘솔 → 내 애플리케이션 → 플랫폼 → Web 플랫폼에 아래 도메인 등록
//   - http://localhost:5199 (로컬 개발)
//   - https://beach-toilet.apps.tossmini.com (실 서비스)
//   - https://beach-toilet.private-apps.tossmini.com (테스트)
// (도메인 미등록이 토스 웹뷰 무한 로딩의 추정 원인 — techchat 스레드 3859). 실패 시 네이버지도 폴백 검토.
export const KAKAO_JS_KEY: string = (import.meta.env.VITE_KAKAO_JS_KEY as string | undefined) || '__REPLACE_KAKAO_JS_KEY__';

// 앱인토스 인앱 광고 2.0 지면 ID. 콘솔 발급 후 M3에서 교체.
export const AD_GROUP = {
  banner: 'ait.v2.live.__REPLACE_AT_M3__',
  rewarded: 'ait.v2.live.__REPLACE_AT_M3__',
} as const;

// 제보 보상 확률표 (기획안 §3 확정: EV ≈ 103.4원, 100원에 근접)
export const REWARD_TABLE: ReadonlyArray<{ amount: number; p: number }> = [
  { amount: 100, p: 0.994 },
  { amount: 500, p: 0.004 },
  { amount: 1000, p: 0.002 },
];

// 보상 지급 1일 제한 (기획안 §3)
export const REWARD_DAILY_LIMIT = 10;

// GPS 현장 인증 반경 (기획안 §3)
export const GPS_RADIUS_M = 200;

// 같은 시설 재제보 쿨다운: 1인 1일 1회 (기획안 §3)

// 개발 편의: true면 GPS 반경 밖에서도 제보 허용 (M3에서 반드시 false)
export const DEV_BYPASS_GPS = true;

// 기본 지도 중심 (위치 권한 거부/실패 시): 해운대해수욕장
export const DEFAULT_CENTER = { lat: 35.1587, lng: 129.1604 };
export const DEFAULT_ZOOM = 5; // kakao level
