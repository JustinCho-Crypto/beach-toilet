#!/bin/bash
# GitHub Pages 재배포. 카카오 개발자 콘솔 도메인 등록용 공개 URL 유지가 목적이며,
# 앱인토스 실제 출시 번들과는 별개다 (출시는 BASE=/ 로 빌드 → .ait 번들).
#
# 사용법: ./scripts/deploy-pages.sh
# 카카오 JS 키를 태워서 배포하려면 .env.local에 VITE_KAKAO_JS_KEY를 넣고 실행한다.
# (JS 키는 도메인 화이트리스트로 보호되는 공개 키라 번들에 포함돼도 정상이다.)
#
# 주의: gh-pages 브랜치 히스토리를 반드시 이어서 커밋한다.
#       매번 git init + force push를 하면 GitHub이 사이트를 unpublish 해버린다 (실제로 겪음).
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKTREE="$REPO_DIR/.gh-pages-worktree"

cd "$REPO_DIR"

echo "[1/4] 빌드"
npm run build
touch dist/.nojekyll

echo "[2/4] gh-pages 워크트리 준비"
git fetch -q origin gh-pages 2>/dev/null || true
rm -rf "$WORKTREE"
git worktree prune
if git show-ref -q --verify refs/remotes/origin/gh-pages; then
  git worktree add -q "$WORKTREE" -B gh-pages origin/gh-pages
else
  git worktree add -q --detach "$WORKTREE"
  git -C "$WORKTREE" checkout -q --orphan gh-pages
  git -C "$WORKTREE" rm -rqf . 2>/dev/null || true
fi

echo "[3/4] 산출물 동기화"
# .git은 건드리지 않고 내용만 교체
find "$WORKTREE" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R dist/. "$WORKTREE"/

cd "$WORKTREE"
git add -A
if git diff --cached --quiet; then
  echo "    변경 없음 — 커밋 생략"
else
  git commit -qm "deploy: 바닷가 화장실 빌드 배포"
fi

echo "[4/4] 푸시"
git push -q origin gh-pages

cd "$REPO_DIR"
git worktree remove --force "$WORKTREE"

echo ""
echo "✅ 배포 완료: https://justincho-crypto.github.io/beach-toilet/"
echo "   (반영까지 1~2분 걸릴 수 있음)"
