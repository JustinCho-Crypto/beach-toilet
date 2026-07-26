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

// ---------- 빌드 대상 환경 (test / live) ----------
//
// ⚠️ 런타임으로 테스트/운영을 구분할 수 없다. QR 테스트도 '실제 토스 앱'에서 돌기 때문에
// getOperationalEnvironment()는 'toss'를 돌려준다(구분 가능한 건 샌드박스뿐).
// 공식 답변: "QR 환경에서 실코드 적용시, 실제 광고가 노출됩니다 / 실제로 유저 포인트가
// 지급됩니다. 테스트 광고 코드로 테스트 후, 최종 출시 부탁드립니다."
//   — techchat https://techchat-apps-in-toss.toss.im/t/id-qr/4352
// 즉 실 광고 ID로 반복 테스트하면 제재 대상이고, 실 프로모션 코드로 테스트하면 진짜 돈이 나간다.
//
// 그래서 테스트/운영은 반드시 '빌드 시점'에 가른다. 기본값은 안전한 test —
// 플래그를 깜빡해도 테스트 아티팩트가 나올 뿐, 실 지면/실 지급이 새어나가지 않는다.
//   npm run ait:test  → 테스트 광고 ID + TEST_ 프로모션 코드 (지급·과금 없음)
//   npm run ait:live  → 운영 광고 ID + 실 프로모션 코드 (실제 지급)  ※ 출시 직전에만
export const IS_LIVE = import.meta.env.VITE_AIT_ENV === 'live';

// 앱인토스 인앱 광고 2.0 지면 ID.
// 테스트 ID는 공식 문서 고정값 (https://developers-apps-in-toss.toss.im/ads/develop.html),
// 운영 ID는 콘솔 발급분 (2026-07-26).
const AD_GROUP_TEST = {
  banner: 'ait-ad-test-banner-id',
  rewarded: 'ait-ad-test-rewarded-id',
  interstitial: 'ait-ad-test-interstitial-id',
} as const;

const AD_GROUP_LIVE = {
  banner: 'ait.v2.live.5f9ffc08b15e4961',
  rewarded: 'ait.v2.live.04365262dcbb47f6',
  interstitial: 'ait.v2.live.cb506a794f3948fd',
} as const;

export const AD_GROUP: {
  /** 상시 하단 배너 */
  readonly banner: string;
  /** 포인트 전환 시 보상형 — 시청 완료 콜백에서만 토스포인트 지급 */
  readonly rewarded: string;
  /** 제보 시 전면형 */
  readonly interstitial: string;
} = IS_LIVE ? AD_GROUP_LIVE : AD_GROUP_TEST;

// 광고 노출 시점 (justin 확정 2026-07-26):
//   제보 완료 → 전면형만. 포인트는 '앱 내 포인트'로 적립된다.
//   포인트 탭에서 '토스포인트로 전환' → 보상형. 시청 완료 시에만 전환된다.
// 두 시점이 분리돼 있어 풀스크린 광고가 연달아 뜨지 않는다.

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

// 개발 편의: true면 GPS 반경 밖에서도 제보 허용.
// 수동 플래그 대신 빌드 대상에 결속한다 — 운영 빌드에서는 무조건 false라
// 'false로 바꾸는 걸 깜빡함' 사고가 원천적으로 불가능하다.
// 테스트 빌드에서는 켜 둔다: QR 테스트를 해변 200m 안에서 할 수는 없기 때문에,
// 끄면 제보→전면형 광고 경로 자체를 테스트할 수 없다.
export const DEV_BYPASS_GPS = !IS_LIVE;

// 프로모션(포인트 지급) 코드 (콘솔 발급, 2026-07-27).
// TEST_ 코드는 프로모션 머니가 차감되지 않고 실제 토스포인트도 지급되지 않는다 —
// 콘솔의 '프로모션 테스트' 단계(API 1회 성공 필요)를 통과하는 용도.
const PROMOTION_CODE_TEST = 'TEST_01KYD2YVYEYA5AWG55PSNBYNQD';
const PROMOTION_CODE_LIVE = '01KYD2YVYEYA5AWG55PSNBYNQD';

export const PROMOTION_CODE: string = IS_LIVE ? PROMOTION_CODE_LIVE : PROMOTION_CODE_TEST;

// 기본 지도 중심 (위치 권한 거부/실패 시): 해운대해수욕장
export const DEFAULT_CENTER = { lat: 35.1587, lng: 129.1604 };
export const DEFAULT_ZOOM = 5; // kakao level
