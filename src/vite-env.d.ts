/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_KAKAO_JS_KEY?: string;
  /** 빌드 대상 환경. 'live'일 때만 운영 광고 ID·실 프로모션 코드가 들어간다 (config.ts 참고) */
  readonly VITE_AIT_ENV?: 'test' | 'live';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
