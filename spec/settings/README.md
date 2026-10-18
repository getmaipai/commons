# The settings registry

`keys.json` is the generated-from-declarations settings index (platform
plan 3.2 and docs/SETTINGS.md rule 5): every entry conforms to
[`../schemas/settings-key.schema.json`](../schemas/settings-key.schema.json).

This is not a placeholder to fill in by hand: core and packages declare
their own settings, and this file is regenerated from those declarations
(plus whatever a robot sends on `hello` for its own robot-only keys,
which the hub stores no copy of). KS-00 adds the eight knowledge-search
keys alongside the shared record shapes; Home implements their readers
and controls in the dependent slices.

The search source mode (KS-MODE-00) draws its options and copy from
[`../vocab/source-mode.json`](../vocab/source-mode.json). Migration of the
retired `search.wikipedia_fallback`: a stored `false` becomes
`search.source_mode.wikimedia = offline`; a stored `true` or no stored value
becomes `inherit`. The old key stays in `keys.json` until the tag paired with
KS-MODE-01, which also removes Home's local declaration of it.

A worked example of a valid entry lives in
[`../fixtures/records/settings-key.example.json`](../fixtures/records/settings-key.example.json).

## Coding (phase 1)

Coding starts off. Adults may code by default. A child or teen needs an
admin's `use:code` grant. The grant action table stays the same.

The seven `coding.person.*` keys use band and person layers. A null band
default follows the household value: the host list, session cap or daily
token cap. An empty host list means no internet. Home clamps person limits
to the household caps. A child's `git_hosts` stays false. The session, git
and workspace keys reserve the grant limits for the later Code app.

`coding.thinking_budget` counts tokens per request and starts at 2,000.
Home clamps it and any client request to `coding.thinking_budget_ceiling`,
which starts at 2,000 and only an admin may change. Both allow zero. These
keys only limit thinking. They never turn it on for a child or teen.

There is no read-only install-state key in this registry. Engine and model
installs use the existing package and status records, not new settings.
The settings schema lists Home as the consumer of the idle unload key;
Home passes that limit to the Stack.

Data classes are product declarations, not a list in commons. The coding
example in `fixtures/data-class/valid-coding.json` follows that mechanism.
Records and saved chats enter backups. Workspaces do not.
