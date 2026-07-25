#!/bin/bash
# GitHub Pages 재배포. 카카오 개발자 콘솔 Web 플랫폼 등록용 공개 URL 유지가 목적이며,
# 앱인토스 실제 출시 번들과는 별개다 (출시는 BASE=/ 로 빌드 → .ait 번들).
#
# 사용법: ./scripts/deploy-pages.sh
# 카카오 JS 키를 실제로 태워서 배포하려면 .env.local에 VITE_KAKAO_JS_KEY를 넣고 실행한다.
# (JS 키는 도메인 화이트리스트로 보호되는 공개 키라 번들에 포함돼도 정상이다.)
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="/tmp/bt-ghpages"
REMOTE="https://github.com/JustinCho-Crypto/beach-toilet.git"

cd "$REPO_DIR"
echo "[1/3] 빌드"
npm run build

echo "[2/3] gh-pages 스테이징"
touch dist/.nojekyll
rm -rf "$STAGE"
cp -R dist "$STAGE"
cd "$STAGE"
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email=denovejr@gmail.com -c user.name=JustinCho-Crypto commit -qm "deploy: 바닷가 화장실 빌드 배포"
git remote add origin "$REMOTE"

echo "[3/3] 푸시"
git push -q --force origin gh-pages

echo ""
echo "✅ 배포 완료: https://justincho-crypto.github.io/beach-toilet/"
echo "   (반영까지 최대 1분 정도 걸릴 수 있음)"
