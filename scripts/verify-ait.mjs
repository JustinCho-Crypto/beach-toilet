#!/usr/bin/env node
// 빌드된 .ait 안에 실제로 어떤 광고 지면 ID / 프로모션 코드가 박혔는지 확인한다.
//
// 왜 필요한가: 테스트/운영 구분이 빌드 시점 환경변수(VITE_AIT_ENV)에 달려 있는데,
// 이 값은 `ait build` → vite 자식 프로세스로 전달돼야 비로소 번들에 반영된다.
// 전달이 끊기면 조용히 '기본값(test)' 아티팩트가 나오고, 그걸 모른 채 출시하면
// 실 지면·실 지급이 전부 죽는다. 반대로 테스트 빌드에 운영 ID가 섞이면 제재 대상이다.
// 눈으로 확인할 수 있는 유일한 지점이 최종 산출물이라 여기서 검사한다.
//
// 사용법: node scripts/verify-ait.mjs [경로]   (기본 ./beachtoilet.ait)

import fs from 'node:fs';
import path from 'node:path';
import { AppsInTossBundle } from '@apps-in-toss/ait-format';

const AD_TEST = ['ait-ad-test-banner-id', 'ait-ad-test-rewarded-id', 'ait-ad-test-interstitial-id'];
const AD_LIVE = [
  'ait.v2.live.5f9ffc08b15e4961',
  'ait.v2.live.04365262dcbb47f6',
  'ait.v2.live.cb506a794f3948fd',
];
const PROMO_TEST = 'TEST_01KYD2YVYEYA5AWG55PSNBYNQD';
const PROMO_LIVE = '01KYD2YVYEYA5AWG55PSNBYNQD';

const target = process.argv[2] ?? 'beachtoilet.ait';

if (!fs.existsSync(target)) {
  console.error(`✗ 아티팩트를 찾을 수 없어요: ${target}`);
  console.error('  먼저 `npm run ait:test` 또는 `npm run ait:live`를 실행하세요.');
  process.exit(1);
}

const reader = AppsInTossBundle.reader(new Uint8Array(fs.readFileSync(target)));
const entries = reader.listEntries();
const jsEntries = entries.filter((name) => name.endsWith('.js') || name.endsWith('.html'));

const decoder = new TextDecoder();
let haystack = '';
for (const name of jsEntries) {
  haystack += decoder.decode(await reader.readEntry(name));
}

const found = {
  adTest: AD_TEST.filter((id) => haystack.includes(id)),
  adLive: AD_LIVE.filter((id) => haystack.includes(id)),
  promoTest: haystack.includes(PROMO_TEST),
};
// 실 코드는 TEST_ 코드의 부분 문자열이라, TEST_ 접두사를 뺀 자리에서만 세야 정확하다.
found.promoLive = haystack.split(PROMO_LIVE).length - 1 > (found.promoTest ? 1 : 0);

const isLive = found.adLive.length > 0 || found.promoLive;
const isTest = found.adTest.length > 0 || found.promoTest;

console.log(`\n  파일      ${path.resolve(target)}`);
console.log(`  appName   ${reader.appName}`);
console.log(`  배포 ID   ${reader.deploymentId}`);
console.log(`  권한      ${reader.permissions.map((p) => `${p.name}:${p.access}`).join(', ') || '(없음)'}`);
console.log(`  번들 파일 ${entries.length}개 (검사 대상 JS/HTML ${jsEntries.length}개)\n`);
console.log(`  광고 테스트 ID   ${found.adTest.length}/3`);
console.log(`  광고 운영 ID     ${found.adLive.length}/3`);
console.log(`  프로모션 TEST_   ${found.promoTest ? '있음' : '없음'}`);
console.log(`  프로모션 실코드  ${found.promoLive ? '있음' : '없음'}\n`);

const problems = [];
if (isLive && isTest) problems.push('테스트 ID와 운영 ID가 한 아티팩트에 섞여 있어요.');
if (!isLive && !isTest) problems.push('광고 ID도 프로모션 코드도 발견되지 않았어요 (번들 구조 변경 의심).');
if (isLive && found.adLive.length !== 3) problems.push(`운영 빌드인데 운영 광고 ID가 ${found.adLive.length}/3개만 있어요.`);
if (isTest && !isLive && found.adTest.length !== 3) problems.push(`테스트 빌드인데 테스트 광고 ID가 ${found.adTest.length}/3개만 있어요.`);
if (isLive && !found.promoLive) problems.push('운영 빌드인데 실 프로모션 코드가 없어요.');

if (problems.length > 0) {
  console.error('✗ 검증 실패');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (isLive) {
  console.log('✓ LIVE 아티팩트 — 운영 광고 지면 + 실 토스포인트 지급. 출시용입니다.');
  console.log('  ⚠️ 이 빌드로 QR 테스트를 하면 실제 광고가 노출되고 실제 포인트가 지급돼요.');
} else {
  console.log('✓ TEST 아티팩트 — 테스트 광고 지면 + TEST_ 프로모션. 지급·과금 없이 안전합니다.');
}
console.log('');
