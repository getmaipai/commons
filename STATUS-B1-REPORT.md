# STATUS-B1 correction report

- Confirmed branch `codex-b-status-b1` was based on current `origin/main` tip `a567c39`, with the original STATUS-B1 commit `71f72e4` on top.
- Checked `git tag --list 'spec-v0.1.6*'`: `spec-v0.1.60` already exists locally for SIZER-SPEC-03; `spec-v0.1.61` was unused.
- Updated only STATUS-B1 metadata: `spec/package.json` now reports `0.1.61`, and `spec/CHANGELOG.md` has a `spec-v0.1.61` entry. Kept the existing `0.1.60` SIZER-SPEC-03 changelog and backlog history unchanged.
- Gate run 1: `bash scripts/check.sh` from the commons root — passed. Core lint and tests passed (208 tests); UI lint completed with 0 errors and 7 existing warnings and UI tests passed (712 tests); spec Ruff checks passed; pytest passed (404 tests); tag helper, generated-file drift check, and standards core passed. The gate emitted a `datamodel-code-generator` FutureWarning.
- Amended commit: `3fe07a5b7c84a0b5ad9f099f667d23c07a7505fc`, with the requested first line.
- Created local tag `spec-v0.1.61` on that commit. Kept the existing local `spec-v0.1.60` tag unchanged.
- Final commit hash: `3fe07a5b7c84a0b5ad9f099f667d23c07a7505fc`.
- No push performed.
