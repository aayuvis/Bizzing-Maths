#!/usr/bin/env bash
# deploy.sh — build Bizzing Maths and publish it to the gh-pages branch.
#
# Every push comes from one chat now (owner, 3 Oct 2026), which runs npm test and
# npm run check before it commits — so the deploy no longer re-runs the suite and
# goes live in seconds. --test runs it anyway. The staged-file count below stays:
# it is instant, and it is what stops a silent partial publish.
#
# GitHub Pages serves the site from the ROOT of gh-pages, so the build output
# goes there unwrapped, exactly as bizzingindia.com and bizzingfinance do it. .nojekyll stops
# Jekyll eating the assets/ directory.
#
#   ./deploy.sh            build and deploy
#   ./deploy.sh --test     run npm test first, then build and deploy
#   ./deploy.sh --dry      build only, show what would be published
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
WORK="$(mktemp -d)"
trap 'git -C "$ROOT" worktree remove --force "$WORK" 2>/dev/null || true; rm -rf "$WORK"' EXIT

cd "$HERE"
if [ "${1:-}" = "--test" ]; then npm test; fi   # the chat runs the suite before every commit
npm run build
touch build/.nojekyll

if [ "${1:-}" = "--dry" ]; then
  echo "would publish:"; find build -type f | sed "s|build/|  |"; exit 0
fi

git -C "$ROOT" fetch origin gh-pages --quiet 2>/dev/null || true
if git -C "$ROOT" show-ref --verify --quiet refs/remotes/origin/gh-pages; then
  git -C "$ROOT" worktree add --quiet "$WORK" origin/gh-pages
  git -C "$WORK" checkout --quiet -B gh-pages
else
  git -C "$ROOT" worktree add --quiet --detach "$WORK"
  git -C "$WORK" checkout --quiet --orphan gh-pages
fi

# replace the contents wholesale — stale hashed assets would pile up forever
find "$WORK" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -r build/. "$WORK"/

cd "$WORK"
git add -A

# Bizzing India learnt this one expensively: their publish step quietly did
# nothing once app/voice passed 700 MB, and the script reported success while
# the live site sat four hours behind. A deploy that no-ops and says so
# cheerfully is worse than one that fails. So count what we meant to publish
# against what is actually staged, and refuse to lie.
WANT=$(find "$HERE/build" -type f | wc -l)
GOT=$(git ls-files --cached | wc -l)
if [ "$WANT" -ne "$GOT" ]; then
  echo "REFUSING TO DEPLOY: built $WANT files, staged $GOT." >&2
  echo "Something dropped files on the way in — do not trust a partial publish." >&2
  exit 1
fi
echo "staged $GOT/$WANT files"

if git diff --cached --quiet; then echo "nothing changed"; exit 0; fi
git commit -q -m "Deploy Bizzing Maths

Built from $(git -C "$ROOT" rev-parse --short HEAD) on $(git -C "$ROOT" rev-parse --abbrev-ref HEAD).

Co-Authored-By: Claude <noreply@anthropic.com>"
git push -q origin gh-pages
echo "published → https://aayuvis.github.io/Bizzing-Maths/"
