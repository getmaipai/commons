#!/usr/bin/env bash
# Resolves a consumer's pin to an immutable per-tag worktree instead of
# this repo's own working checkout. Before this script existed, every
# consumer's file: dependency and check.sh pin read whatever was checked
# out in the sibling `commons/` directory - a single mutable checkout
# shared by every session on the machine, so one session gating Home at
# ui-v0.2.4 (`git checkout ui-v0.2.4` there) silently detached every
# other consumer's install underneath it. See docs/dev.md, "How a
# consumer pins a workspace".
#
# Usage: scripts/ensure-tag.sh <workspace> <tag>
# Prints the worktree path on stdout. Creates
# ../commons-tags/<workspace>-<tag> as a detached worktree of <tag> if it
# doesn't already exist there; reuses it otherwise. Refuses a tag this
# repo doesn't have.
set -euo pipefail

if [ $# -ne 2 ]; then
  echo "usage: ensure-tag.sh <workspace> <tag>" >&2
  exit 1
fi

WORKSPACE="$1"
TAG="$2"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if ! git -C "$REPO_ROOT" rev-parse -q --verify "refs/tags/$TAG^{commit}" >/dev/null; then
  echo "unknown tag: $TAG (not found in $REPO_ROOT - fetch it or check the pin)" >&2
  exit 1
fi
EXPECTED_HEAD="$(git -C "$REPO_ROOT" rev-parse "refs/tags/$TAG^{commit}")"

TAGS_DIR="$(cd "$REPO_ROOT/.." && pwd)/commons-tags"
WORKTREE_PATH="$TAGS_DIR/$WORKSPACE-$TAG"

# Checks the candidate is registered as one of this repo's worktrees
# (grep -F: a literal path match, not a regex - a tag like core-v0.1.0
# has a "." that would otherwise match any character) AND still checked
# out at the tag's commit, not just present as a directory. A worktree
# whose HEAD has drifted (someone ran `git checkout` inside it) is
# exactly the mutable-pin bug this script exists to prevent, so it's a
# hard error here, never silently reused or silently fixed up.
is_valid_worktree_at_head() {
  git -C "$REPO_ROOT" worktree list --porcelain | grep -qxF "worktree $WORKTREE_PATH" \
    && [ "$(git -C "$WORKTREE_PATH" rev-parse HEAD)" = "$EXPECTED_HEAD" ]
}

if [ -d "$WORKTREE_PATH" ]; then
  if ! is_valid_worktree_at_head; then
    echo "$WORKTREE_PATH exists but isn't a worktree of $REPO_ROOT at $TAG - remove it and re-run for a clean one." >&2
    exit 1
  fi
  echo "$WORKTREE_PATH"
  exit 0
fi

mkdir -p "$TAGS_DIR"
if ! git -C "$REPO_ROOT" worktree add --detach "$WORKTREE_PATH" "$TAG" >&2; then
  # Two consumers' check.sh gates can run in parallel (the org's own
  # workflow allows it) and both reach here for a tag neither has a
  # worktree for yet - only one `git worktree add` wins the race. If the
  # loser's path is now a valid worktree at the right tag anyway, that's
  # a win, not a failure.
  if is_valid_worktree_at_head; then
    echo "$WORKTREE_PATH"
    exit 0
  fi
  echo "failed to create a worktree at $WORKTREE_PATH for $TAG" >&2
  exit 1
fi
echo "$WORKTREE_PATH"
