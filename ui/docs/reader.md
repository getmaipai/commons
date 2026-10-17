# Reader (MEDIA-BOOKS-01)

Import `Reader` from `@maipai/ui/src/primitives/Reader`. Like Player, it has no barrel export.

| Prop | Type | Default / meaning |
| --- | --- | --- |
| `src` | `string` | Required same-origin HTTP(S) URL, relative or absolute. Credentials and other schemes are refused before importing an engine. |
| `format` | `"epub" \| "pdf"` | Required. |
| `locator` | `ReaderLocator` | Optional resume position; later prop changes navigate without reopening the engine. |
| `onLocatorChange` | `(locator: ReaderLocator, percent: number) => void` | Optional. Debounced 250 ms after relocation, including initial resume. Flushed on close, page hide, hidden document, source change and unmount. Pending reports retain the previous book's callback on source changes. |
| `theme` | `"paper" \| "sepia" \| "night"` | `"paper"`. Theme changes preserve the engine and position. |
| `fontSize` | `number` | EPUB only; integer step 0 to 6: 85%, 100%, 115%, 130%, 150%, 175%, 200%. Default 1. Invalid steps clamp; non-finite values use 1. |
| `onClose` | `() => void` | Optional; draws Close when provided, flushes progress before invoking it. The host owns navigation. |
| `title` | `string` | `"Reader"`; toolbar text and accessible region name. |

```ts
type ReaderLocator =
  | { kind: "cfi"; cfi: string; spine_index?: number; block_index?: number }
  | { kind: "page"; page: number };
```

Pages are 1-based; optional EPUB indices are non-negative. `READER_FONT_SIZES`, `ReaderLocator`, `ReaderFormat` and `ReaderTheme` are exported from the primitive. Invalid or mismatched resume locators open at the start; an oversized PDF page clamps to the final page. EPUB uses the rendition's start CFI and spine index, retaining a supplied block index while that CFI is unchanged.

EPUB percentages use generated CFI locations, independent of font size. PDF percentage is `(page - 1) / (pageCount - 1) * 100`; a single-page book is 100%. Both use the media-progress record's 0 to 100 scale, and the last page is 100%.

The TOC reads EPUB navigation (including nested entries), or PDF outline destinations (named, reference-based or explicit page indices). A PDF without an outline has a disabled TOC control. Buttons and left/right arrows turn pages; shortcuts inside editable fields, links, buttons and menus are left to those controls. EPUB iframe events are forwarded too. Tapping the page hides/shows the top bar; the footer's Menu button is the keyboard equivalent. Under 640 px the Reader covers the viewport with safe-area padding. Larger screens use an 85dvh reader within the app.

All colors and PDF filters live in `src/tokens.css`, under `--reader-{paper,sepia,night}-{background,foreground,pdf-filter}`. The selected values become `--reader-background`, `--reader-foreground`, `--reader-pdf-filter`. Resolved colors are injected into the EPUB iframe; PDF page canvases use the theme filter. PDF images are tinted along with the page. No app CSS is needed.

## Schema node

```json
{
  "type": "reader",
  "bind": { "source": "package", "path": "item", "params": { "id": "$state.id" } },
  "fields": { "src": "file.url", "format": "book.format", "locator": "position.locator" },
  "theme": "paper",
  "font_size": 1,
  "on_locator": {
    "call": {
      "target": "/api/plugins/books/progress/{id}",
      "args": { "locator": "{locator}", "percent": "{percent}" }
    }
  },
  "on_close": { "navigate": { "to": "/apps/books/" } }
}
```

Required: `type`, `bind`. Optional: `format` (`epub` or `pdf`, overrides the bound format), `fields`, `theme`, `font_size`, `on_locator`, `on_close`, `empty_state`. Unknown properties are rejected by JSON Schema and the kit's Zod model. `fields` accepts only `id`, `src`, `title`, `format`, `locator`, each a dotted field path defaulting to its own name. The bound call returns one object or a list whose first row is used. `locator` is bound data, rather than a literal node property. The node forwards the validated locator to Reader. A missing/invalid format or outside source draws its unavailable state.

`on_locator` receives all row fields plus `locator` and `percent`; full placeholders retain JSON types in its call arguments, including nested `{locator.page}` or `{locator.cfi}`. Calls are quiet (no binding refetch or error banner) and keepalive, so final progress can survive navigation. This typed argument mode is opt-in on `useDispatchAction`; existing Player and other actions retain their previous interpolation. `on_close` receives the original row. Package pages bind their own declared `rows: "list"` data; both actions remain inside the package API/app prefixes and cannot `play`.

## Dependency and verification report

The Home design note section 6 selects epub.js and pdf.js because the kit has no EPUB/PDF component, with FileTube's vendored engines as precedent. It does not give dependency versions. The exact pins added here are `epubjs: "0.3.93"` for its 0.3 rendition/navigation/location APIs and `pdfjs-dist: "4.10.38"` for the 4.x ESM document/canvas/outline APIs. These are explicit API baselines, not a claim about the versions FileTube vendors or the latest releases.

The note's statement that both are MIT should be checked against the installed upstream notices: epub.js uses BSD-2-Clause and pdf.js uses Apache-2.0. FileTube's own MIT license does not change its dependencies' licenses. Preserve the installed packages' license notices.

No installation, network fetch, lockfile regeneration, server, commit or tag was run in this worktree. The reviewer must run **`cd ui && bun install`** and review the resulting lockfile. Both engines use literal dynamic imports; PDF's matching worker is also lazy and resolved with a `?url` import by the consuming Vite build. It is served from the app's own bundled assets, without a CDN. A different bundler needs the equivalent URL-import support. `readerLibraries.d.ts` describes only the documented subset used here so the offline checkout can type-check; it does not prove upstream runtime compatibility.

The copied fixtures are `tests/fixtures/reader/clockwork-garden.epub` (2,003 bytes) and `moon-rivets.pdf` (956 bytes), by Iris Quill. The tests read their actual EPUB navigation and PDF page count. Library boundary doubles exercise resume locators, percentages, CFI generation calls, TOC destination resolution, debouncing, source changes, abort/failure cleanup, keyboard/tap handling, theme/font application and schema dispatch. The supplied PDF has no outline; outline cases use synthetic destinations. The doubles do not perform real pagination or canvas rendering.

Focused checks:

```sh
cd ui
bun test src/primitives/Reader.test.tsx src/schema/readerNode.test.tsx src/schema/fieldPath.test.ts src/schema/catalog.test.ts src/schema/mediaNodes.test.tsx
cd ../spec
bun test tests/ts/ui-schema.test.ts tests/ts/app-kind.test.ts
```

Run results: 38 UI tests and 58 spec tests passed. Targeted ESLint passed. The single allowed `bunx --no-install tsc --noEmit` run passed in spec; UI found typing issues in the new fixture mocks, loader injection signature and test assertions. Those were corrected and the focused tests/lint passed again. UI type checking was not rerun, respecting the one-run limit; the reviewer should rerun it after installation.

Real engine loading, browser pagination, PDF rendering and emitted worker assets remain unverified in this offline run. After installation, verify both fixtures in the consuming app, CFI/page resume after closing, TOC jumps, theme and font reflow, a phone toolbar tap, rapid turns, and source disposal. The desktop/phone mockup shots depict the Books library; the full-screen reading behavior comes from the design note's section 6.
