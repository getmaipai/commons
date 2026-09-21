# Session B handoff (2026-09-21, end of context)

Written per COORDINATOR's standing rule: HOME-STACK-04a and HOME-STACK-01
(stack-side and home-side, both accepted and pushed) are a natural stop
point - no precise context-percent readout was available this session,
but the honest assessment given the scope below (two full items, dozens
of large tool outputs, several full-gate runs, multiple live builds and
verification cycles) was "very likely past 60%," so handing off rather
than starting the chat-program backend item (a different, large,
multi-part task) cold. This note replaces the previous one in this file
(HOME-STACK-05 and the HOME-STACK-01 design paragraph) - both landed
and accepted, no longer relevant to what's next.

## Restart line

```
cd /Users/jessetorres/Developer/github.com/getmaipai/home-b && claude --dangerously-skip-permissions
```

That worktree is on branch `b/home-stack-02b` (the name is stale, it
tracks `main` directly), already pushed and even with `origin/main` at
`4856f6be`. No uncommitted state, no stash, nothing to recover. There is
also a `stack-b` worktree at `/Users/jessetorres/Developer/github.com/getmaipai/stack-b`
(branch `b/home-stack-01-installer`, also tracks `main` directly, even
with `origin/main` at `233bc4f`) - needed again only if a future Stack-
side change is asked for; nothing pending there either.

## What landed this session (all pushed, all reported, all accepted)

- **`home` `1337e8d3` (HOME-STACK-04a, the Engines API)**: twelve
  `createRoute()`/`.openapi()` routes at `/api/engines` (roles/engines/
  budget, hardware, per-engine actions, models, per-model actions,
  health, health-item fix, and the update-state/check/apply/rollback
  trio delegating to `lib/stackUpdates.ts`'s existing functions rather
  than a second call path), owner/admin gated like `repairs.ts`. One
  `classifyStackError()` maps every `StackError` kind to its real
  status. A real routing bug found live (a two-segment dynamic
  catch-all registered before two same-shaped literal paths swallowed
  both) fixed by registration order. `tests/enginesRoutes.test.ts`, 23
  tests. One minor drift finding from the medium review (ROLE_IDS
  hand-copied from `stack/types.ts`, out of this item's file scope)
  filed as `getmaipai/home#127`, not fixed here.
- **`stack` `b1f40da` then `233bc4f` (HOME-STACK-01, the Stack's own
  half): the compiled binary.** `scripts/build-binary.sh` compiles
  `maipai-stack` via `bun build --compile`, ships `migrations/` (a real
  bug: `import.meta.dir` is a virtual `/$bunfs/root` path inside a
  compiled binary, invisible to drizzle's migrator's plain `node:fs` -
  fixed via `lib/paths.ts`'s new `isCompiledBinary`) and `backend-src/`
  (a real, dereferenced copy of `backend/`) as required siblings. The
  `stt` role needed a real fix, not a documented gap: a compiled binary
  can never load `sherpa-onnx-node`'s native binding once the same
  binary also contains the daemon's own graph - a genuine Bun bundler
  bug, minimal repro filed at `getmaipai/stack#8` (left open on
  COORDINATOR's instruction: it describes a real, still-unfixed Bun
  defect, not something this repo's own workaround resolves). Fixed by
  running the `stt` worker through a real `bun` (`STACK_BUN_BIN`)
  against `backend-src/` instead of a re-invocation of the compiled
  binary - `lib/supervisor.ts`'s `speechWorkerCommand()` picks the
  shape. `233bc4f` is a follow-up fix: `build-binary.sh`'s own
  `OUT_DIR` handling silently broke on an absolute path (which Home's
  installer always passes), found wiring the home-side install.sh into
  it for real.
- **`home` `4856f6be` (HOME-STACK-01, the home-side half): `install.sh`
  places the Stack** (fetches `getmaipai/stack@$STACK_TAG`, builds via
  that repo's own `build-binary.sh`, runs as the console user rather
  than root, waits for `/healthz`, writes `engines.stack.url` last,
  only when it's still empty or a previous local write);
  **`uninstall.sh` removes it** inside the existing single "DELETE MY
  DATA" confirmation; the upgrade branch stops, rebuilds and restarts
  it, clearing the setting if the rebuild fails. `--dry-run` covers the
  Stack section only (a stated scope boundary, not a retrofit of
  Home's pre-existing flow). **Two review rounds found eight real bugs,
  all fixed** - the full list, and why each mattered, is in
  `home/docs/dev.md`'s own "The Stack inside Home's installer, built"
  entry and `home/docs/BACKLOG.md`'s HOME-STACK-01 line; the two worth
  repeating here because they're general, not just this item's own:
  - **`main()` silently never ran under this script's own documented
    `curl -fsSL ... | bash` usage** - `[[ "${BASH_SOURCE[0]}" ==
    "${0}" ]]` is false for piped execution (`BASH_SOURCE[0]` empty,
    `$0` is `"bash"`); fixed with the portable `(return 0 2>/dev/null)`
    "am I sourced" test instead, which is correct for direct execution,
    piped execution, and `bash script.sh` alike. **Any script in this
    repo meant to be both `source`-able (for its own tests, or by a
    sibling script wanting to reuse its functions) and directly
    runnable needs this exact idiom, not a `$0`/`BASH_SOURCE` comparison.**
  - **macOS ships bash 3.2.57 as `/usr/bin/env bash`'s own system
    default** (Apple has not shipped a newer one in years, GPLv3
    licensing) **and this installer's shebang resolves to exactly
    that on an unmodified Mac - its own primary target.** `mapfile`/
    `readarray` (bash 4+) do not exist there; found live by running a
    fix under `/bin/bash` directly and watching `mapfile: command not
    found`, not by reading a compatibility table. **Every function in
    `install.sh`/`uninstall.sh`, and any future installer-adjacent
    script in this repo meant to run on a bare Mac, needs to stay
    bash-3.2-compatible: no `mapfile`/`readarray`, no `declare -A`, no
    `${var,,}`/`${var^^}`.** Arrays, `+=`, `[[ ]]`, and process
    substitution are all fine - only the bash-4-and-later builtins are
    the trap. The fix pattern: `while IFS= read -r line; do arr+=("$line"); done < <(...)`.
  - The other six (dry-run overwriting `engines.stack.url`
    unconditionally, a failed upgrade rebuild leaving it stale,
    `find_console_user()` accepting `root`, `uninstall.sh` silently
    orphaning `stack/data` when the binary was missing,
    `ensure_service_user_linux()`'s own recursive chown clobbering the
    Stack's ownership on Linux, and `--dry-run` making a real loopback
    network call) are specific to this item - full detail in
    `docs/dev.md`, not repeated here.
  - Verified live on this MacBook, explicitly under `/bin/bash` the
    final time (not a dev shell's `PATH`-preferred bash), never Home's
    own root-level service: `install-service`, `/healthz`, `status`
    showing every env var actually baked into the running LaunchAgent,
    `uninstall-service --remove-data`, `launchctl list | grep maipai`
    empty afterward, the data directory gone.
  - **Stated gap, not run this session: a real clean-account install
    and the entire Linux path** (`systemd --user`, `loginctl
    enable-linger`, `find_console_user()`'s `logname` branch, and the
    `ensure_service_user_linux()` chown-ordering fix) - no Linux box
    available. The render functions are unit-tested and
    `service/systemd.ts`'s own tests on the `stack` side cover the
    unit content, but none of the Linux-specific behavior above has
    run for real.

## Standing gotchas for whoever picks this up

- **The two bash idioms above** (the sourced-vs-executed guard, and
  bash-3.2 compatibility) apply to any bash script this org's
  installers touch, not just `install.sh`/`uninstall.sh` - worth a
  second look before assuming a bash-4+ convenience is safe to use
  anywhere in `getmaipai/home` or `getmaipai/stack`'s own scripts.
- **`bun install --force`, not a plain `bun install`,** in `backend/`
  and `frontend/` after any `commons`/`stack` pin bump - a `file:`
  dependency resolves into bun's content-addressed store, a snapshot
  taken at install time, not a live link.
- **`scripts/check.sh`'s API-docs drift check diffs the working tree
  against the *index*, not `HEAD`.** Regenerate, then stage the
  result, before running the gate.
- **Code review is budgeted**: low for an S item or docs/config,
  medium for an M item or a route/guard/wire change, high only if
  named. One pass per commit; after fixes, the re-review covers the
  fix hunks only; a second pass finding real defects is reported (this
  session's HOME-STACK-01 fix-hunk re-review found two more real bugs,
  reported and fixed, not chased with a third pass).
- **Never touch the real household app on this machine** - `home/`'s
  own checkout at the repo root (not a worktree), port 8787, Jesse's
  real data. This session's Stack live-verification runs all used
  scratch data directories under `home-b/data-scratch-b/` (git-ignored)
  and scratch ports, never the real install.
- **This laptop runs low on free memory under concurrent sessions** -
  ask COORDINATOR to clear a gate slot before a full-repo run.
- **A rebase across concurrent lanes is usually mechanical** but worth
  a sanity re-run of the full gate after, not just trusting a clean
  `rebase --continue` - both of this session's pushes rebased cleanly
  onto commits another session landed in between (04a onto HOME-UI-02f,
  the final home-side HOME-STACK-01 push onto Session A's design/
  hand-off docs).

## What's next

**The backend half of the chat program's shell-on-shadcndashboard
work** (`home/docs/plans/shell-on-shadcndashboard-2026-09-21.md` -
read it first) - COORDINATOR's brief, not repeated in full here since
it should come fresh rather than be summarized stale, but the shape:
read assistant-ui's Elements wiring pages
(https://www.assistant-ui.com/elements) and write "The wire the
Elements expect" into the program record; design and land a commons
spec `artifact` record (fixtures, a Home table/migration, versions as
rows with a current pointer, the child projection, an export route);
the turn-engine tool to create/update an artifact and the stream shape
that carries it; the generative-UI rule (a tool's result renders as
the Element-matched structured part, never narrated prose, never
hand-drawn), wired for weather/almanac first. Backend and spec only,
no frontend - Session A is vendoring the Elements into the kit in
parallel. Two owner rules named as binding for tonight's work:
`.github` commits `da28bdc` and `919881b` ("no hand-built UI, Elements
as shipped") - worth reading those two commits directly before
starting, not just trusting this summary of them.

Whoever picks this up should get the actual full brief from COORDINATOR
rather than starting from this note alone - this is a summary of state,
not the work order itself.
