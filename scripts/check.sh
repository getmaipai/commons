#!/usr/bin/env bash
# MaiPai Shared pre-commit gate. Runs each populated workspace's own
# lint and tests, then the pinned @maipai/standards core. See docs/dev.md.
# With --docs it runs only the standards core, the gate for a commit that
# touches only Markdown.
set -euo pipefail
cd "$(dirname "$0")/.."

DOCS_ONLY=0; if [ "${1:-}" = "--docs" ]; then DOCS_ONLY=1; fi

if [ "$DOCS_ONLY" = 0 ]; then
  for workspace in core ui spec; do
    if [ -f "$workspace/package.json" ]; then
      echo "== $workspace: install"
      (cd "$workspace" && bun install --silent)

      echo "== $workspace: lint"
      (cd "$workspace" && bun run lint)

      echo "== $workspace: test"
      (cd "$workspace" && bun test)
    fi
  done

  if [ -f "spec/pyproject.toml" ]; then
    echo "== spec: ruff"
    (cd spec && uv run ruff check . && uv run ruff format --check .)

    echo "== spec: pytest"
    (cd spec && uv run pytest tests/py -q)
  fi
fi

STANDARDS_DIR="${MAIPAI_STANDARDS_DIR:-../.github}"
if [ ! -d "$STANDARDS_DIR/standards" ]; then
  echo "missing @maipai/standards checkout at $STANDARDS_DIR (pin std-v0.2.0)"
  exit 1
fi

echo "== standards core (std-v0.2.0)"
bash "$STANDARDS_DIR/standards/bin/check-core.sh" "$(pwd)"

echo "== all checks passed"
