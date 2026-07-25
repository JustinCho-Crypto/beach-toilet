import { defineConfig } from 'vite';

// GitHub Pages는 https://<user>.github.io/<repo>/ 하위 경로로 서빙되므로 base가 필요하다.
// 앱인토스(*.apps.tossmini.com) 배포 시에는 루트 서빙이므로 BASE=/ 로 빌드한다.
export default defineConfig({
  base: process.env.BASE ?? '/beach-toilet/',
  server: { port: 5199, strictPort: true },
});
