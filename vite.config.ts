import { defineConfig } from 'vite';

// GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로 빌드 시 base가 필요하다.
// 앱인토스(*.apps.tossmini.com) 배포 시에는 루트 서빙이므로 BASE=/ 로 빌드한다.
// 로컬 dev는 항상 루트(/)로 서빙해 카카오 도메인 등록을 localhost:5199 하나로 끝낸다.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? (process.env.BASE ?? '/beach-toilet/') : '/',
  server: { port: 5199, strictPort: true },
}));
