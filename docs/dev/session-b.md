# Session B handoff (2026-09-20, end of context)

Written per COORDINATOR's standing rule: HOME-STACK-05 plus the
HOME-STACK-01 design paragraph below are a natural stop point (~55% of
this session's context budget, and the next item is a different kind
of task - code again, not docs), so hand off rather than continue cold.
This note replaces the previous one in this file (COMMONS-RENAME-01
and SHARED-PIN-01's own handoff) - both long since landed and accepted,
no longer relevant to what's next.

## Restart line

```
cd /Users/jessetorres/Developer/github.com/getmaipai/home-b && claude --dangerously-skip-permissions
```

That worktree is on branch `b/home-stack-02b` (the name is stale, it
tracks `main` directly), already pushed and even with `origin/main` at
`a7b10848`. No uncommitted state, no stash, nothing to recover.

## What landed today (all pushed, all reported, all accepted)

- **HOME-STACK-05** (`home` `d079a072`): Settings > Updates shows the
  Stack's engine/model rows beside Home's own release row with
  Apply/rollback; Repairs shows the Stack's health items through Home's
  existing Issue machinery; a daily scheduler job runs the Stack's own
  maintenance, gated on the Stack's own `stack.updates.enabled`. All
  behind `engines.stack.url`, same as HOME-STACK-02b - empty, nothing
  changes. Two real bugs caught by a medium review and fixed before
  landing (a confirm dialog hardcoded to "the chat engine" regardless
  of which engine; a Stack read failure on `GET /api/updates` silently
  reading as no Stack at all instead of surfacing the error).
- **`commons` `ui-v0.4.5`** (`15e7b91`): a real, previously-latent
  `ThingsTable` bug the gate's own a11y check caught on this item's
  page - `rowActions` had never had a real consumer before, so a 32px
  "More actions" button under the 48px touch-target floor and an
  unlabeled Actions header had never been exercised. Fixed
  (`hitArea(3)`, an `sr-only` header span matching `DataTable.tsx`'s
  own pattern), two new regression tests, low-effort review clean.
  `home`'s own pin moved straight from `ui-v0.4.2` to `ui-v0.4.5`,
  picking up `0.4.3`'s/`0.4.4`'s unrelated fixes (HOME-UI-02e, a
  different lane) along the way. Also fixed: `commons`'s own git remote
  was still `shared.git` (GitHub's redirect was masking it) - now
  `commons.git`, for this checkout at least; other worktrees/checkouts
  on the machine may still have the stale URL, not swept.
- **`home` `a7b10848`** (docs-only, `--docs` gate): "The Stack inside
  Home's installer, designed" in `home/docs/dev.md`, at COORDINATOR's
  request, so HOME-STACK-01 has a design paragraph before anyone types
  it. Answers: ship a compiled `maipai-stack` binary built locally at
  install time from vendored source (not a second `bun install`),
  because the Stack has no release of its own and a compiled binary is
  what `daemon.ts`'s `process.execPath` and `stack/docs/integrations.md`
  already assume; the installer runs the Stack as the household's own
  logged-in account rather than root (Metal/GPU access needs a real GUI
  session; Home's own service stays root/system-level since it needs
  neither); the port only reaches `engines.stack.url` after a real
  `/healthz` check; uninstall's Stack half joins the one existing
  "DELETE MY DATA" confirmation rather than a second prompt; the update
  path replaces the compiled binary the same way `install.sh` already
  replaces everything else on an upgrade; and what a `--dry-run` mode
  and unit tests can prove versus what only a clean-account install
  proves, so the eventual item's acceptance doesn't overclaim.

Also flagged along the way, not chased further: a `backup.test.ts` test
failed once, non-deterministically, in a full-suite gate run;
diagnosed per the established isolation protocol (5 of 6 full-suite
runs clean, no code path from this item's diff to backup/crypto code,
the test predates this item) and classified pre-existing flakiness.

## Standing gotchas for whoever picks this up

- **`bun install --force`, not a plain `bun install`,** in `backend/`
  and `frontend/` after any `commons`/`stack` pin bump - a `file:`
  dependency resolves into bun's content-addressed store, a snapshot
  taken at install time, not a live link. Bumping a pin is always two
  edits (the tag string in `scripts/check.sh`, the matching `file:`
  path in `package.json`) plus that reinstall.
- **`scripts/check.sh`'s API-docs drift check (`git diff --quiet --
  docs/api`) diffs the working tree against the *index*, not `HEAD`.**
  Regenerate (`bun run gen:api-docs` in `backend/`), then stage the
  result, before running the gate - an unstaged regeneration reads as
  "out of date" even when it is not, because nothing has been added to
  the index yet to compare against.
- **Code review is budgeted**: low for an S item or docs/config, medium
  for an M item or a route/guard/wire change, high only if named. One
  pass per commit; after fixes, the re-review covers the fix hunks
  only; a second pass finding real defects is reported, never chased
  with a third. `require-review-before-commit.sh` enforces freshness
  (roughly 30 minutes) - a review that ran, then more code changed,
  needs one more small pass on just the new hunk before the commit hook
  will allow it, even if the earlier pass already covered everything
  else.
- **Never touch the real household app on this machine** - `home/`'s
  own checkout at the repo root (not a worktree), `bun start`/`stop`/
  `restart`, port 8787, Jesse's real data. Every manual verification
  this session did used an isolated backend on a different port with
  its own `MAIPAI_DATA_DIR`, and a standalone scripted Stack fixture
  server, never the real thing.
- **`git diff --quiet` conflicts during a rebase across concurrent
  lanes are usually mechanical** - HOME-STACK-05's rebase onto
  HOME-UI-02e (landed in between) conflicted only on doc-section
  concatenation and the `ui` pin number, where the newer pin always
  wins if it's a strict superset of the older one's fixes (`0.4.5`
  already contains `0.4.4`'s). Worth a quick sanity re-run of the full
  gate after any such rebase, not just trusting a clean `rebase
  --continue`.
- **This laptop runs low on free memory under concurrent sessions** - a
  `check.sh` gate or a large test suite can get flaky under load. Ask
  COORDINATOR to clear a gate slot before a full-repo run, and before
  retrying one that failed in a way that looks like resource
  contention rather than a real regression.

## What's next, in order

1. **HOME-STACK-01: the Stack inside Home's installer.** The design
   paragraph is written (`home/docs/dev.md`, this session, `a7b10848`) -
   read it before starting. Real scope: `scripts/install.sh` and
   `uninstall.sh` in `home`, plus whatever small addition the Stack
   side needs (a `--dry-run` flag on `maipai-stack install-service`,
   and confirming `daemon.ts`'s `install-service`/`uninstall-service`
   commands take the env vars the design assumes - `STACK_DATA_DIR`,
   `PORT` - which they already do). This touches `stack/` for real, not
   just reading it for context - check with COORDINATOR on whether
   that crosses into another lane's territory before editing anything
   there. A new small backend script (`set-setting.ts` or similar) is
   also new surface in `home`, needs its own test.
2. **Then item 06**, after the Engines admin page - COORDINATOR named
   this as the next after HOME-STACK-01 but did not give its full brief
   in this note; get it fresh rather than guessing at scope.

Whoever picks this up should get the actual next brief from COORDINATOR
rather than starting from this note alone - this is a summary of state,
not the work order itself.
