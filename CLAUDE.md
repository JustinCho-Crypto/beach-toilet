# 바닷가 화장실 — 앱인토스 미니앱

여름 시즌 웹뷰 방식 미니앱. 기획 확정본은 [docs/기획안.md](docs/기획안.md) — **작업 전 필독. 기획안과 다른 동작을 임의로 추가하지 말 것.**

한 줄 컨셉: "물놀이 가서 여는 지도" — 해수욕장·계곡의 화장실/샤워실 위치·상태를 GPS 인증 제보로 쌓는다.

## 아키텍처 (땡모반 지도 구조 승계)

- **웹뷰 방식** (Granite RN 아님) — 지도 JS SDK가 웹에서만 동작하기 때문. ait-factory 규칙(플레이스홀더 ID 체계, M3 교체)은 승계.
- Vite + TypeScript, 프레임워크 없음. 탭 2개(지도/포인트, 하단 플로팅 알약) + 스팟 바텀시트 + 제보 시트가 화면 전부.
- `src/config.ts`에 운영 전환 시 교체할 값 집중: 카카오 JS 키, 광고 지면 ID(`ait.v2.live.__REPLACE_AT_M3__`), 보상 확률표, 일일 한도(10), GPS 반경(200m), `DEV_BYPASS_GPS`.
- **카카오맵 SDK 로드 실패 시 목업 지도 폴백** 자동 동작 — 개발은 키 없이 가능. 로컬 개발 중 실제 지도로 확인하려면 `.env.local`(gitignore 대상)에 `VITE_KAKAO_JS_KEY=발급받은키` 추가. M3(운영 전환) 시점엔 `config.ts`의 플레이스홀더 상수를 실키로 교체. 카카오 콘솔 Web 플랫폼에 `http://localhost:5199` / `*.apps.tossmini.com` / `*.private-apps.tossmini.com` 도메인 등록 필수(도메인 미등록이 무한 로딩의 추정 원인, techchat 3859 — `loadKakaoSdk()`가 script 로드와 `kakao.maps.load()` 콜백 양쪽에 개별 타임아웃+콘솔 진단을 둬서 원인을 구분해준다). 실패 시 네이버지도 폴백 검토.
- 네이티브 의존(위치/저장소)은 `src/bridge.ts`, 광고는 `src/ads.ts`에 격리. M3에서 `@apps-in-toss/web-framework` 연동 시 이 두 파일만 교체.
- 시드 데이터는 `src/data.ts` — **출시 전 공공데이터 배치로 교체** (기획안 §5: 해수욕장 264곳 지오코딩, 물놀이관리지역 API, 공중화장실 표준데이터 지오코딩, 샤워실 방문객 상위 30곳 수작업).

## 불변 규칙

1. **광고 시청 완료 콜백에서만 포인트 지급** (기획안 §3). 포인트 선지급 금지 — 보상형 광고 SDK의 reward callback 기준.
2. **보상 확률표·한도는 `config.ts`에서만 변경**: 100원 99.4% / 500원 0.4% / 1,000원 0.2% (EV≈103원), 1일 10회. ⚠️ 광고 회당 수익 < EV면 역마진 — M3 전 금송아지 실측 eCPM 대조 필수.
3. **GPS 200m 인증 + 같은 시설 1인 1일 1회** 어뷰징 방어를 약화시키지 말 것. `DEV_BYPASS_GPS`는 M3에서 반드시 false.
4. **외부 이동 금지**: 외부 브라우저/앱 스킴으로 사용자를 내보내는 코드 금지 (앱인토스 정책).
5. **이모지 UI 금지** — 아이콘은 `src/ui.ts`의 TDS 톤 SVG만 사용 (justin 결정, 2026-07-26).
6. 리뷰는 텍스트 없음 — 별점·청결도·요금·온수(샤워실만) 4항목 고정. 항목 추가는 기획 변경(justin 결정) 사항.

## 명령

- `npm run dev` — 개발 서버 (5199 포트 고정 — 5173은 다른 프로젝트가 사용 중)
- `npm run build` — 타입체크 + 빌드
- `npm run deploy` — GitHub Pages 재배포 → https://justincho-crypto.github.io/beach-toilet/

## 배포 URL (카카오 도메인 등록용)

- 저장소: https://github.com/JustinCho-Crypto/beach-toilet (public, `gh-pages` 브랜치 서빙)
- 공개 URL: **https://justincho-crypto.github.io/beach-toilet/** — 2026-07-26 실 카카오맵 렌더링 확인 완료
- 이 URL은 **카카오 도메인 등록 + 실 지도 동작 확인 목적**이다. 앱인토스 실제 출시는 별개(`BASE=/` 빌드 → `.ait` 번들 → 콘솔 업로드).
- 카카오 JS 키는 도메인 화이트리스트로 보호되는 **공개 키**라 번들에 포함돼도 정상. 단 등록 도메인은 필요한 것만 유지할 것.

### 카카오맵 설정 — 실제로 막혔던 지점 (재현 방지용 기록)

1. **제품 활성화가 먼저다.** 키가 맞아도 `제품 설정 → 카카오맵 → 활성화 설정 ON`이 안 돼 있으면 SDK가 403 `NotAuthorizedError: disabled OPEN_MAP_AND_LOCAL service`를 반환한다. 진단은 `curl "https://dapi.kakao.com/v2/maps/sdk.js?appkey=<키>&autoload=false"` — 200이면 정상, 403이면 이 문제.
2. **JS 키와 도메인 등록 위치가 개편됐다.** 예전 `앱 키` / `플랫폼 > Web 사이트 도메인`이 아니라, 지금은 `앱 설정 → 앱 → 플랫폼 키 → JavaScript 키`에서 키를 확인하고 같은 화면의 **JavaScript SDK 도메인**에 도메인을 등록한다.
3. 현재 등록된 도메인은 `https://justincho-crypto.github.io` **하나뿐**이라, **localhost에서는 실 지도가 안 뜨고 목업 지도로 폴백된다** (의도된 동작). 로컬에서 실 지도를 봐야 하면 `http://localhost:5199`를 추가 등록할 것.

### GitHub Pages 배포 주의

- `scripts/deploy-pages.sh`는 **worktree로 gh-pages 히스토리를 이어서** 커밋한다. 예전처럼 `git init` + force push를 하면 **GitHub이 Pages 사이트를 unpublish 해버린다** (실제 발생).
- 무료 플랜은 **private 저장소에 Pages를 지원하지 않는다.** 저장소가 private으로 되돌아가면 Pages가 즉시 죽는다.
- `docs/기획안.md`는 사업 전략 문서라 **공개 저장소에서 제외**(gitignore)되어 있다. 로컬에만 존재.
