#!/usr/bin/env bash
# MaiPai Shared pre-commit gate. Runs each populated workspace's own
# lint and tests, then the pinned @maipai/standards core. See docs/dev.md.
# With --docs it runs only the standards core, the gate for a commit that
# touches only Markdown.
set -euo pipefail
cd "$(dirname "$0")/.."

DOCS_ONLY=0; if [ "${1:-}" = "--docs" ]; then DOCS_ONLY=1; fi

STANDARDS_DIR="${MAIPAI_STANDARDS_DIR:-../.github}"
if [ ! -d "$STANDARDS_DIR/standards" ]; then
  echo "missing @maipai/standards checkout at $STANDARDS_DIR (pin std-v0.2.0)"
  exit 1
fi

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

if [ "$DOCS_ONLY" = 0 ] && [ -d spec/schemas ]; then
  # spec/README.md, "Cross-repo schemas": a schema here $ref's a standards
  # schema by bare filename, so gen:ts/gen-py.sh silently produce a broken
  # import if the sibling checkout's own gen/ output is missing or stale.
  # Moved here from home/scripts/check.sh at spec-v0.1.0 (this workspace's
  # own schemas/gen/ live here now, not in a product). Runs after the
  # workspace loop above so spec's own node_modules are already
  # installed - no second `bun install` here.
  echo "== spec: standards gen/ presence"
  STANDARDS_DIR_ABS="$(cd "$STANDARDS_DIR" && pwd)"
  for lang in ts py; do
    dir="$STANDARDS_DIR_ABS/standards/gen/$lang"
    if [ ! -d "$dir" ] || [ -z "$(ls -A "$dir" 2>/dev/null)" ]; then
      echo "missing or empty $dir - generate the sibling @maipai/standards checkout's own gen/ output first (its own gen:ts / gen-py.sh)."
      exit 1
    fi
  done

  echo "== spec: regenerate and check for drift"
  export MAIPAI_STANDARDS_DIR="$STANDARDS_DIR_ABS"
  (cd spec && bun run gen:ts >/dev/null)
  (cd spec && bash scripts/gen-py.sh >/dev/null)
  if ! git diff --quiet -- spec/gen; then
    echo "spec/gen/ is out of date with spec/schemas/. Run the gen scripts and commit the result."
    git --no-pager diff --stat -- spec/gen
    exit 1
  fi
fi

echo "== standards core (std-v0.2.0)"
bash "$STANDARDS_DIR/standards/bin/check-core.sh" "$(pwd)"

echo "== all checks passed"
