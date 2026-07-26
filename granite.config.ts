import { defineConfig } from '@apps-in-toss/web-framework/config';

// 웹뷰 타입 앱인토스 미니앱 설정. Granite RN 프로젝트가 아니므로
// @granite-js/react-native/config가 아니라 이 web-framework 설정을 쓴다.
// appName은 콘솔에서 발급받은 mTLS 인증서의 CN(beachtoilet)과 일치해야 한다.
export default defineConfig({
  appName: 'beachtoilet',
  brand: {
    displayName: '바닷가 화장실',
    primaryColor: '#1B9CF0',
    icon: 'https://static.toss.im/appsintoss/36029/618778fd-aa30-4faf-9011-19baf072e665.png',
  },
  permissions: [{ name: 'geolocation', access: 'access' }],
  web: {
    port: 5199,
    commands: {
      dev: 'vite',
      build: 'tsc --noEmit && vite build',
    },
  },
  webViewProps: {
    type: 'partner',
    pullToRefreshEnabled: false,
  },
  outdir: 'dist',
});
