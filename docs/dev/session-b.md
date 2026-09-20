# Session B handoff (2026-09-20, end of context)

Written per COORDINATOR's standing rule: past 60% of this session's
context budget (this session ended near 80%), hand off at the next
stop point rather than start the next step cold. SHARED-PIN-01 (all
three legs, plus its CI verification) just landed and was accepted;
this is a natural boundary. This note supersedes the previous one
(step 6, the spec move) - that work is long since landed and accepted,
no longer relevant to what's next. The file itself is still named
`session-b.md` under `shared/`; the folder rename to `commons/` is
part of the next assignment below, not done yet.

## Identity and the hard boundary

"Session B" in the multi-session refocus effort. **Hard boundary,
still in force: never touch `stack/`.** Session A owns `stack/`; it
never touches `shared/`/`commons/`, `home/`, or `catalog/`. Reading
stack's own plan docs for context is fine; editing anything under
`stack/` is not.

COORDINATOR directs sessions via cross-session messages (`SendMessage`/
`ListAgents`, she shows as `COORDINATOR`). Reporting contract: `ready`
(done), `done <step>` with commit hash and `git show --stat HEAD`,
`blocked [owner: what]`, `question` (try the `design-resolver` agent
first for anything resolvable from spec/code alone), `low context`
(this note). Never poll another session's git; never send "still
waiting."

## What's landed (all pushed, all reported, all accepted)

**SHARED-PIN-01** (shared's own pins moved from a mutable shared
checkout to immutable per-tag `git worktree`s, adopted in `home` and
`catalog`, verified live via two throwaway CI PRs):

- **`shared`**: `45c137f` (`scripts/ensure-tag.sh` + docs/dev.md - the
  core mechanism: `<workspace> <tag>` resolves to
  `../shared-tags/<workspace>-<tag>`, created once via `git worktree
  add --detach`, reused after, refuses an unknown tag, verifies a
  reused worktree's HEAD still matches the tag rather than trusting a
  directory that merely exists), `57fd32f` (backlog: `ui` should pin
  `spec` by an exact tag, not a bare relative path - they can drift
  now that they're independently pinned), `7529331` (backlog: a
  composite CI action so every consumer's workflow doesn't
  reimplement the checkout-then-`ensure-tag.sh` dance), `5690a4d`
  (README: the repo is public), `6ebd6c6` (backlog: the `std-` pin has
  the identical mutable-checkout gap, found live - see gotchas below).
- **`home`**: `fe8b790e` - `backend`/`frontend` `package.json` `file:`
  paths name the worktree directly, `scripts/check.sh` resolves each
  pin via `ensure-tag.sh` with a version-vs-tag sanity check,
  `scripts/screenshot.ts`'s stub-server import moved from a static
  path into the mutable checkout to a dynamic one resolved from
  `backend/package.json`'s own pin, `AGENTS.md` rewritten. A review
  caught the settings-registry drift check writing straight into the
  shared `spec` worktree (a cache every consumer shares) -  fixed to
  use a private `mktemp` scratch dir instead, verified live
  (`git status` in the worktree stayed clean through a full gate run).
- **`catalog`**: `53684fb` (pin adoption, plus a check.sh cross-check
  that `tools/package.json`'s `file:` path names the same tag as the
  script's own `SPEC_TAG` - a review caught they could silently
  drift), `80fa810` (`permission-diff` job was missing the `shared`
  checkout entirely - a pre-existing gap, found live in the first
  throwaway PR - plus the `getmaipai/commons` rename mid-flight),
  `ce643fb` (`fetch-tags: true` at shallow depth left a tag's ref
  resolvable but not its commit, proven live; `fetch-depth: 0` is what
  actually works), `63bffd6` (`permission-diff` was ALSO missing the
  `@maipai/standards` checkout - same class of gap, same job), `24f7b31`
  (docs: the real CI outcome, replacing "unverified").
- **CI verification, for real**: two throwaway PRs
  (`ci-verify/shared-pin`, `ci-verify/shared-pin-2`), both closed
  unmerged, both branches deleted. PR 1 hit a genuine pre-existing
  blocker unrelated to this item's own mechanics - `getmaipai/shared`
  was private and `catalog`'s CI had no cross-repo credential
  (confirmed via `gh api`/`gh secret list`, not assumed). Reported to
  COORDINATOR rather than provisioning a token unilaterally
  (credentials are Jesse's call); his decision was to make the repo
  public instead, now `getmaipai/commons`. PR 2 then found and fixed,
  live, the two `permission-diff` gaps and the `fetch-tags` limit
  above. Final state: `permission-diff` fully green; `check` gets all
  the way through `tools/` install/typecheck/tests/7-of-7-package
  scorecard - the pin/worktree mechanics this item is about are
  confirmed working end to end - and only fails on a real,
  pre-existing prose-lint violation unrelated to this item (below).

## Standing gotchas for whoever picks this up

- **This session's own local `.github` checkout was NOT pinned to
  `std-v0.2.0`** - it sat on `main`, 113 commits ahead
  (`git describe --tags` -> `std-v0.2.0-113-gb67acef`), the whole
  session. Every local `scripts/check.sh` run in `shared`/`home`/
  `catalog` this session therefore enforced whatever `main` happened
  to be, not the tag it claims to pin - caught only because a
  correctly-pinned CI run (checking out the real `std-v0.2.0` tag)
  failed prose-lint on real exclamation points in `catalog`'s
  `CLAUDE.md`/`README.md`/six package READMEs that local runs never
  saw. Do not assume a green local `check.sh` proves what a correctly-
  pinned CI run would show for the standards-core step specifically,
  until this is fixed (filed: `shared/docs/BACKLOG.md`, "Standards").
  Do NOT `git checkout std-v0.2.0` in the local `../.github` sibling
  yourself to "fix" this locally - it is a machine-shared checkout
  other sessions rely on staying on `main` for their own work; that's
  exactly the class of mutable-shared-checkout bug SHARED-PIN-01 fixed
  for `commons`, don't reintroduce it for standards.
- **`getmaipai/shared` is now `getmaipai/commons`, public.** GitHub's
  redirect works (old clone URLs and `gh api repos/getmaipai/shared`
  both still resolve), but don't rely on it going forward - see
  COMMONS-RENAME-01 below.
- **`bun install --force` after every `commons`/`shared` edit.** A
  `file:` dependency resolves into a content-addressed store, a
  snapshot taken at install time, not a live link.
- **Code review is budgeted**: low effort for an S item or a
  docs-and-config change, medium for an M item or a route/guard/wire
  change. One pass per commit; after fixes, re-review the fix hunks
  only; never a third pass. State the review level, pass count, and
  dispositions in every done report.
- **Context percentage goes in every done report too.** Past 60%, hand
  off at the next stop point - a note like this one, then COORDINATOR
  hands it to Jesse for a fresh session.
- **`actions/checkout@v4` refuses any `path` that resolves outside
  `$GITHUB_WORKSPACE`** - a nested checkout plus a plain `ln -s` shell
  step is the workaround, not `path: ../other-repo` directly.
  **`fetch-tags: true` at the default shallow depth is NOT enough**
  for a later `git worktree add` against that tag to work - proven
  live, not assumed; `fetch-depth: 0` (full history) is the version
  that actually leaves a tag's commit fetchable, at the cost of a full
  clone every run (the composite-action backlog item is the eventual
  fix for the cost, not this).
- **The live app on this laptop** (`home/data/local-app`, `bun start`/
  `stop`/`restart` from the `home/` root) is Jesse's own real household
  data on port 8787 - never sign in with his real PIN.
- **This laptop runs low on free memory under concurrent sessions** - a
  `check.sh` gate or a large test suite got noticeably flaky under load
  in an earlier session. Ask COORDINATOR to clear a "gate slot" before
  a retry if a failure looks like resource contention rather than a
  real regression.

## What's next: COMMONS-RENAME-01

GitHub has already renamed `getmaipai/shared` to `getmaipai/commons`
(public). This item is the local and cross-repo follow-through:

- **Local folder**: `shared` -> `commons` on this machine, then
  `git worktree repair` for every worktree that still points at the
  old path - `shared-a` (another session's worktree; coordinate before
  touching it) and every `../shared-tags/<workspace>-<tag>` worktree
  (`core-core-v0.1.0`, `spec-spec-v0.1.1`, `spec-spec-v0.1.2`,
  `ui-ui-v0.3.3`, `ui-ui-v0.4.0` as of this note), which themselves
  become `commons-tags/<workspace>-<tag>`.
- **Every consumer** (`home`, `catalog`, `stack`): every `../shared`,
  `../../shared-tags`, and `MAIPAI_SHARED_DIR` reference (in
  `scripts/check.sh`, `package.json` `file:` paths, `AGENTS.md`,
  `.github/workflows/check.yml`, dev docs) becomes `../commons`,
  `../../commons-tags`, `MAIPAI_COMMONS_DIR` respectively.
  `catalog/.github/workflows/check.yml` already points its
  `repository:` fields at `getmaipai/commons` (done this session,
  `80fa810`); its step names/comments still say "shared" and need the
  same sweep as everything else.
- **`commons`'s own scripts and docs**: `scripts/ensure-tag.sh`,
  `scripts/check.sh`, `docs/dev.md`, `docs/BACKLOG.md`, `README.md`
  (already has one line about being public, `5690a4d`) - every
  internal "shared"/"`shared-tags`" reference becomes "commons"/
  "`commons-tags`".
- **Org-wide**: `getmaipai/.github/CLAUDE.md`'s product table (the
  `shared` row) and a `docs/DECISIONS.md` line recording commons is
  public and why.
- **Coordinate with `stack`'s own lane**: `stack`'s half of this is
  tracked in that lane's `c-94` item - check with COORDINATOR before
  touching anything under `stack/` (still off-limits directly; the
  lane handles its own repo).
- Exit check for the whole item: every repo's `scripts/check.sh` green
  with no remaining `shared`/`shared-tags` string outside historical
  dev-doc entries (those stay - they're describing what was true when
  written), a fresh `git worktree list` in `commons/` showing the
  repaired paths, and (per the standing gotcha above) a live check
  that a correctly-pinned `std-v0.2.0` is what local gates actually
  enforce, not a side effect to assume.

Whoever picks this up should get the brief from COORDINATOR rather
than starting from this note alone - this is a summary of state, not
the work order itself.
