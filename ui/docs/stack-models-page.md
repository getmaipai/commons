# The AI and models page

`StackModelsPage` is the one "AI and models" page. The Stack admin page and Home both render it, so the layout, the wording and the choice logic exist once. It saves every choice to the Stack through a `StackClient` and never calls `fetch` itself (owner decision, 2026-11-21; design: `docs/plans/shared-ai-models-page-2026-11-21.md` in the Stack repo).

Reader: a developer wiring the page into a host app. Time: about 15 minutes.

## What the person sees

- A summary: one card per feature with the chosen model's plain name, a one-line status (Ready, Downloading 42%, Needs a look, Off) and a size in GB. The switch on a card turns the feature on or off.
- A search box. It matches the model's name, id, repository, family, version, precision, licence, engine, description and its feature's name. "3.8" finds version 3.8 and not version 3 or 8.
- A sheet per feature: the model each level (Reduced, Standard, Boost, Max) uses, every model with Download and Remove, and under More the order models are tried in and the choices kept for other computer sizes. The raw id is only in a model's Details, next to a copy button.
- Recommended setup (a preview first, then Apply), Free up space (a list to tick, then a confirmation), Add a chat model, and under More the order features are served in when memory is tight.

## Use it

1. Pin `ui` and `spec` at the tags in `CHANGELOG.md`.
2. Write a `StackClient` (`src/stack/StackClient.ts`). Each method is one Stack route; the comment on the method names it. Throw `StackClientError(sentence, code)` for a refusal so the page can show the Stack's own sentence.
3. Render the page:

```tsx
import { StackModelsPage } from "@maipai/ui/src/stack/StackModelsPage";

<StackModelsPage client={client} lockedItems={locks} extraSections={sections} onNavigate={go} />
```

The page needs no provider. `useStackChoices(client)` keeps one cache per client object. If the client has `subscribe`, a change made in the other app shows at once; otherwise the page asks again every 2 seconds while a model downloads.

## Host slots

| Prop | What it does |
|---|---|
| `extraSections` | `{ id, title, description?, content }` blocks drawn after the page's own (Home: disk and backup links; the admin page: tools). |
| `lockedItems` | A map from a key to the sentence to show. Keys: a feature id (`chat`), a level (`chat:max`), or an action (`recommended`, `free-space`, `add-model`, `priority`). A locked control is disabled or hidden and its sentence is shown. The page never knows who is asking; the host decides. |
| `onNavigate` | Adds quiet links under More for `resources`, `disk`, `updates` and `health`. |
| `pollMs`, `queryClient` | Polling interval (0 turns it off) and an optional shared cache. |

## Test and preview without a Stack

`createFakeStackClient()` (`src/stack/fakeStackClient.ts`) is an in-memory client seeded with a realistic 64 GB computer: a download in progress, a saved pick that stopped fitting, a switched-off feature, a model that needs a licence, unused models. It refuses the way the Stack does (does not fit, Standard cannot be off, model in use). `failNext(method, sentence, code)` makes the next call fail; `calls` lists what the page asked for.

Testing Library's global `screen` is unbound under this kit's test preload. Use `within(document.body)`.

## Rules the page follows

- Every string goes through `i18n._`. The seed file uses non-label property names (`name`, `feature`) so the string scanner does not count sample data as kit text; no baseline entry was added.
- Colors come from tokens (`--primary`, `--status-ok`, `--status-warning`, `--status-error`). Pills and chips are the same tinted look the Stack admin page has had.
- Sizes are always GB. States are words, never a bare color.
- The page is checked at 375 px, in light and dark, with reduced motion left to the kit's own tokens.
