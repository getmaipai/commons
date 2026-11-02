// Validates every page in spec/ui/pages/ against spec/ui/schema.json using
// ajv (proper $ref/oneOf/discriminator support for a recursive schema; see
// spec/ui/README.md for why this doesn't go through the Zod codegen path).
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";

const UI_DIR = join(import.meta.dir, "..", "..", "ui");
const schema = JSON.parse(readFileSync(join(UI_DIR, "schema.json"), "utf-8"));

const ajv = new Ajv2020({ strict: true });
const validate = ajv.compile(schema);

const pageFiles = readdirSync(join(UI_DIR, "pages")).filter((f) => f.endsWith(".json"));

describe("UI schema", () => {
  test("HANDOFF-01a: play accepts an optional start position or placeholder", () => {
    const action = ajv.compile({ $schema: schema.$schema, $id: "https://example.com/action.schema.json", $defs: schema.$defs, $ref: "#/$defs/action" });
    for (const play of [{ media_id: "media-atlas" }, { media_id: "media-atlas", position_s: 0 }, { media_id: "media-atlas", position_s: 12.5 }, { media_id: "{id}", position_s: "{position_s}" }]) {
      expect(action({ play })).toBe(true);
    }
    for (const position_s of [-1, null, true, {}, []]) {
      expect(action({ play: { media_id: "media-atlas", position_s } })).toBe(false);
    }
  });

  test("MEDIA-BOOKS-01: reader accepts field paths, format, tone and font steps", () => {
    const reader = { type: "reader", bind: { source: "package", path: "item" } };
    expect(validate(reader)).toBe(true);
    for (const format of ["epub", "pdf"]) expect(validate({ ...reader, format, theme: "sepia", font_size: 6, fields: { src: "file.url", locator: "position.locator", format: "book.format" }, on_locator: { call: { target: "/api/plugins/books/progress/{id}" } } })).toBe(true);
    for (const invalid of [{ format: "html" }, { theme: "blue" }, { font_size: -1 }, { font_size: 7 }, { font_size: 1.5 }, { fields: { unknown: "x" } }, { fields: { locator: "" } }, { locator: { kind: "page", page: 1 } }]) expect(validate({ ...reader, ...invalid })).toBe(false);
    expect(validate({ type: "reader" })).toBe(false);
  });

  test("CREATION-HEADER-01: creation_header has bound identity, optional profile href, and call-only sharing actions", () => {
    const node = {
      type: "creation_header",
      bind: { source: "package", path: "created" },
      share_change: {
        add: { call: { target: "/api/plugins/media/created/share", args: { person_id: "{person_id}" } } },
        remove: { call: { target: "/api/plugins/media/created/share", method: "DELETE", args: { person_id: "{person_id}" } } },
        make_private: { call: { target: "/api/plugins/media/created/private" } },
      },
    };
    expect(validate({ type: "page", id: "detail", title: "Detail", body: [node] })).toBe(true);
    expect(validate({ type: "page", id: "detail", title: "Detail", body: [{ ...node, share_change: { ...node.share_change, add: { navigate: { to: "/apps/media" } } } }] })).toBe(false);
  });
  test("at least one page exists to validate", () => {
    expect(pageFiles.length).toBeGreaterThan(0);
  });

  for (const file of pageFiles) {
    test(`pages/${file} conforms to schema.json`, () => {
      const page = JSON.parse(readFileSync(join(UI_DIR, "pages", file), "utf-8"));
      const valid = validate(page);
      if (!valid) {
        throw new Error(JSON.stringify(validate.errors, null, 2));
      }
      expect(valid).toBe(true);
    });
  }

  test("an empty_state action may carry a short button label; a long one is refused", () => {
    const base = { type: "empty_state", icon: "film", text: "No videos yet.", action: { navigate: { to: "/settings/home/media-library" } } };
    expect(validate({ type: "page", id: "p", title: "P", body: [{ ...base, action_label: "Add a folder" }] })).toBe(true);
    expect(validate({ type: "page", id: "p", title: "P", body: [base] })).toBe(true);
    expect(validate({ type: "page", id: "p", title: "P", body: [{ ...base, action_label: "x".repeat(41) }] })).toBe(false);
    expect(validate({ type: "page", id: "p", title: "P", body: [{ ...base, action_label: "" }] })).toBe(false);
  });

  test("a deprecated cinema page tone remains accepted", () => {
    const page = { type: "page", id: "p", title: "P", body: [{ type: "empty_state", icon: "x", text: "t" }] };
    expect(validate({ ...page, tone: "cinema" })).toBe(true);
    expect(validate({ ...page, tone: "neon" })).toBe(false);
  });

  test("MEDIA-POLISH-01: a split_view is list and detail, or main and aside", () => {
    const kid = { type: "empty_state", icon: "x", text: "t" };
    expect(validate({ type: "split_view", main: [kid], aside: [kid], aside_label: "Up next" })).toBe(true);
    expect(validate({ type: "split_view", main: [kid] })).toBe(false);
    expect(validate({ type: "split_view" })).toBe(false);
  });

  test("MEDIA-POLISH-01: a shelf variant and orientation are closed sets", () => {
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    expect(validate({ ...shelf, variant: "plain", orientation: "vertical", hide_when_empty: true, see_all: { label: "See all", action: { navigate: { to: "/apps/x/all" } } } })).toBe(true);
    expect(validate({ ...shelf, variant: "framed" })).toBe(false);
    expect(validate({ ...shelf, orientation: "diagonal" })).toBe(false);
  });

  test("a node with an unknown type is rejected", () => {
    const bad = { type: "not_a_real_type" };
    expect(validate(bad)).toBe(false);
  });

  // Session B step 4 rebuilt Chat on @assistant-ui/react, which owns its
  // own history/streaming/actions entirely in React - message_thread is
  // now just a mount point (step 5), so the old per-turn bind/
  // sender_field/text_field properties are no longer part of its shape.
  test("a message_thread is just a bare mount point - old v0 turn-list properties are rejected", () => {
    const bareIsValid = { type: "message_thread" };
    expect(validate(bareIsValid)).toBe(true);
    const stale = { type: "message_thread", bind: { source: "route", path: "/api/conversations" }, sender_field: "x", text_field: "y" };
    expect(validate(stale)).toBe(false);
  });

  test("settings_editor is a bare mount point for the kit's own generic settings renderer", () => {
    expect(validate({ type: "settings_editor" })).toBe(true);
    expect(validate({ type: "settings_editor", extra: true })).toBe(false);
  });

  test("a list missing its required bind is rejected", () => {
    const bad = { type: "list", item_key_field: "id", item_label_field: "text" };
    expect(validate(bad)).toBe(false);
  });

  test("a minimal list validates", () => {
    const good = {
      type: "list",
      bind: { source: "route", path: "/api/memory" },
      item_key_field: "id",
      item_label_field: "text",
    };
    expect(validate(good)).toBe(true);
  });

  test("a list's batch action requires a scope of selected or all", () => {
    const badScope = {
      type: "list",
      bind: { source: "route", path: "/api/memory" },
      item_key_field: "id",
      item_label_field: "text",
      batch: {
        actions: [{ label: "Archive", scope: "everything", action: { call: { target: "/api/memory/{id}/archive" } } }],
      },
    };
    expect(validate(badScope)).toBe(false);

    const goodScope = {
      ...badScope,
      batch: {
        actions: [{ label: "Archive", scope: "selected", action: { call: { target: "/api/memory/{id}/archive" } } }],
      },
    };
    expect(validate(goodScope)).toBe(true);
  });

  test("card_grid, media_shelf, detail_pane and split_view validate their own minimal shapes", () => {
    expect(
      validate({ type: "card_grid", bind: { source: "route", path: "/api/x" }, item_key_field: "id", item_label_field: "title" }),
    ).toBe(true);
    expect(
      validate({
        type: "media_shelf",
        bind: { source: "route", path: "/api/x" },
        item_key_field: "id",
        item_label_field: "title",
        item_media_field: "poster",
      }),
    ).toBe(true);
    expect(
      validate({ type: "detail_pane", title: "A thing", body: [{ type: "empty_state", icon: "inbox", text: "Nothing." }] }),
    ).toBe(true);
    expect(
      validate({
        type: "split_view",
        list: { type: "list", bind: { source: "route", path: "/api/x" }, item_key_field: "id", item_label_field: "title" },
        detail: { type: "detail_pane", title: "A thing", body: [{ type: "empty_state", icon: "inbox", text: "Nothing." }] },
      }),
    ).toBe(true);
  });

  test("widget_card and widget_row validate a minimal bind and reject an unbound one", () => {
    expect(validate({ type: "widget_card", bind: { source: "route", path: "/api/widgets" } })).toBe(true);
    expect(validate({ type: "widget_row", bind: { source: "route", path: "/api/widgets" } })).toBe(true);
    expect(validate({ type: "widget_card" })).toBe(false);
    expect(validate({ type: "widget_row" })).toBe(false);
    // Neither carries item_key_field/item_label_field the way list/
    // card_grid do - a widget's display shape (title/subtitle/value/
    // icon/href/image) is fixed by the D-to-E contract, not authored
    // per page, so an authored field here is a mistake, not a variant.
    expect(validate({ type: "widget_card", bind: { source: "route", path: "/api/widgets" }, item_key_field: "id" })).toBe(false);
  });
});

// APP-KIND-01: package bindings, answer_blocks and picker.
describe("UI schema, package apps", () => {
  const forecast = { source: "package", path: "forecast", params: { place: "$state.place" } };

  test("a package binding with params validates", () => {
    expect(validate({ type: "answer_blocks", bind: forecast })).toBe(true);
    expect(validate({ type: "answer_blocks", bind: forecast, kinds: ["weather_card"], empty_state: { type: "empty_state", icon: "cloud-off", text: "Nothing." } })).toBe(true);
  });

  test("an absolute or dotted path is rejected on a package binding", () => {
    expect(validate({ type: "answer_blocks", bind: { source: "package", path: "/api/people" } })).toBe(false);
    expect(validate({ type: "answer_blocks", bind: { source: "package", path: "../people" } })).toBe(false);
    expect(validate({ type: "answer_blocks", bind: { source: "package", path: "Forecast" } })).toBe(false);
  });

  test("params belong to a package binding only", () => {
    expect(validate({ type: "list", bind: { source: "route", path: "/api/x", params: { a: 1 } }, item_key_field: "id", item_label_field: "t" })).toBe(false);
  });

  test("VIDEO-CREATE-01: prompt_bar needs a label and a submit action, and refuses unknown keys, tiers and chip counts", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    expect(validate(ok)).toBe(true);
    expect(validate({ ...ok, chips: [{ state: "shape", label: "Shape", default: "a", options: [{ value: "a", label: "A" }, { value: 5, label: "Five" }] }], tier: { state: "tier", tiers: [{ id: "standard", label: "Standard" }] } })).toBe(true);
    expect(validate({ type: "prompt_bar", label: "Describe" })).toBe(false);
    expect(validate({ ...ok, extra: 1 })).toBe(false);
    expect(validate({ ...ok, chips: [{ state: "Shape", label: "S", options: [{ value: "a", label: "A" }] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ state: "s", label: "S", options: [] }] })).toBe(false);
    expect(validate({ ...ok, tier: { state: "tier", tiers: [{ id: "ultra", label: "Ultra" }] } })).toBe(false);
  });

  test("VIDEO-CREATE-02: a chip takes variant cards and an option media path; prompt_bar takes references", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const cards = { state: "look", label: "Look", variant: "cards", options: [{ value: "anime", label: "Anime", media: "loops/anime.mp4" }, { value: "none", label: "Natural" }] };
    expect(validate({ ...ok, chips: [cards] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...cards, variant: "dropdown" }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...cards, variant: "grid" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...cards, options: [{ value: "a", label: "A", media: "../x.mp4" }] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...cards, options: [{ value: "a", label: "A", media: "/abs.mp4" }] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...cards, options: [{ value: "a", label: "A", media: "https://x.test/a.mp4" }] }] })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Picture", kind: "picture" }, { state: "who", label: "Character", kind: "character" }, { state: "where", label: "Place", kind: "place" }] })).toBe(true);
    expect(validate({ ...ok, references: [{ state: "x", label: "X", kind: "movie" }] })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "x", label: "X" }] })).toBe(false);
  });

  test("VIDEO-UI-04: result_feed needs a binding, fields.words and fields.status, and a poll_while", () => {
    const ok = {
      type: "result_feed",
      bind: { source: "package", path: "recipes", params: { scope: "feed", favorites: "$state.favorites_only" } },
      fields: { words: "prompt", status: "status", tags: "tags", references: "references", progress: "percent", poster: "still", src: "src", favorite: "favorite", created_at: "created_at" },
      filters: [{ kind: "toggle", state: "favorites_only", label: "Favorites only" }, { kind: "toggle", state: "group_by_words", label: "Group by words", group: true }, { kind: "select", state: "type", label: "Type", options: [{ value: "all", label: "All" }, { value: "video", label: "Videos" }] }],
      handlers: { stop: { call: { target: "/api/plugins/videos/actions/cancel", args: { id: "{id}" } } }, retry: { starts: "video", call: { target: "/api/plugins/videos/actions/another" } }, edit_words: { navigate: { to: "/apps/videos/create", state: { prompt: "{prompt}" } } }, favorite: { call: { target: "/api/plugins/videos/actions/favorite" } } },
      actions: [{ label: "Remix", icon: "pencil", when: ["ready"], action: { navigate: { to: "/apps/videos/create" } } }, { label: "Make it Max", starts: "video", action: { call: { target: "/api/plugins/videos/actions/max" } } }],
      actions_variant: "icons",
      actions_inline: 4,
      poll_while: { statuses: ["queued", "generating"], record: { path: "recipes", params: { scope: "job", id: "{id}" } } },
    };
    expect(validate(ok)).toBe(true);
    const { poll_while: _p, ...noPoll } = ok;
    expect(validate(noPoll)).toBe(false);
    expect(validate({ ...ok, poll_while: { statuses: [], record: { path: "recipes" } } })).toBe(false);
    expect(validate({ ...ok, poll_while: { statuses: ["ready"], record: { path: "recipes" } } })).toBe(false);
    expect(validate({ ...ok, poll_while: { statuses: ["queued"] } })).toBe(false);
    expect(validate({ ...ok, fields: { words: "prompt" } })).toBe(false);
    expect(validate({ ...ok, bind: undefined })).toBe(false);
    expect(validate({ ...ok, handlers: { unknown: { call: { target: "/x" } } } })).toBe(false);
    expect(validate({ ...ok, handlers: { stop: { starts: "audio", call: { target: "/x" } } } })).toBe(false);
    expect(validate({ ...ok, handlers: { stop: { starts: "video" } } })).toBe(false);
    expect(validate({ ...ok, handlers: { stop: { play: { media_id: "x" } } } })).toBe(false);
    expect(validate({ ...ok, filters: [{ kind: "radio", state: "x", label: "X" }] })).toBe(false);
    expect(validate({ ...ok, actions: [{ label: "A", starts: "audio", action: { call: { target: "/x" } } }] })).toBe(false);
    expect(validate({ ...ok, actions_variant: "wide" })).toBe(false);
  });
  test("VIDEO-UI-14: result_feed look and filters_presentation, media_shelf media_loop and item_loop_field (all optional)", () => {
    const feed = { type: "result_feed", bind: { source: "package", path: "recipes" }, fields: { words: "prompt", status: "status" }, poll_while: { statuses: ["queued"], record: { path: "recipes" } } };
    expect(validate(feed)).toBe(true);
    for (const look of ["default", "media"]) expect(validate({ ...feed, look })).toBe(true);
    for (const look of ["grid", "wide", true]) expect(validate({ ...feed, look })).toBe(false);
    for (const filters_presentation of ["inline", "popover"]) expect(validate({ ...feed, filters_presentation })).toBe(true);
    for (const filters_presentation of ["sheet", false]) expect(validate({ ...feed, filters_presentation })).toBe(false);
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    expect(validate({ ...shelf, media_loop: true, item_loop_field: "loop" })).toBe(true);
    expect(validate({ ...shelf, media_loop: false })).toBe(true);
    expect(validate({ ...shelf, media_loop: "yes" })).toBe(false);
    expect(validate({ ...shelf, item_loop_field: 3 })).toBe(false);
  });
  test("VIDEO-UI-03: prompt_bar placement, suggestions, submit_detail, starts, chip presentation, group and fold, reference placement and kinds", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const look = { state: "look", label: "Look", variant: "cards", presentation: "popover", group: "Style", options: [{ value: "a", label: "A" }] };
    expect(validate({ ...ok, placement: "panel", starts: "video", suggestions: [{ label: "Fox", text: "A fox in snow" }], submit_detail: { state: "tier", labels: { standard: "Under a minute" } }, chips: [look, { ...look, state: "voices", fold: true, presentation: "inline" }] })).toBe(true);
    expect(validate({ ...ok, placement: "dock" })).toBe(false);
    expect(validate({ ...ok, starts: "song" })).toBe(false);
    expect(validate({ ...ok, suggestions: [1, 2, 3, 4, 5].map((n) => ({ label: `L${n}`, text: "t" })) })).toBe(false);
    expect(validate({ ...ok, suggestions: [{ label: "Fox" }] })).toBe(false);
    expect(validate({ ...ok, submit_detail: { state: "Tier", labels: {} } })).toBe(false);
    expect(validate({ ...ok, submit_detail: { state: "tier", labels: { standard: "" } } })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...look, presentation: "sheet" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...look, group: "" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...look, fold: "yes" }] })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "in_field" }, { state: "voice", label: "Voice clip", kind: "audio" }, { state: "src", label: "Source", kind: "video", placement: "row" }] })).toBe(true);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "inside" }] })).toBe(false);
  });

  test("VIDEO-UI-03: split_view takes aside_side start or end", () => {
    const view = { type: "split_view", main: [{ type: "empty_state", icon: "x", text: "t" }], aside: [{ type: "empty_state", icon: "x", text: "t" }] };
    expect(validate({ ...view, aside_side: "start" })).toBe(true);
    expect(validate({ ...view, aside_side: "end" })).toBe(true);
    expect(validate({ ...view, aside_side: "left" })).toBe(false);
  });

  test("VIDEO-UI-12: aside_width, field_size, reference tile and hint, tier presentation, submit_detail placement; each default stays valid", () => {
    const view = { type: "split_view", main: [{ type: "empty_state", icon: "x", text: "t" }], aside: [{ type: "empty_state", icon: "x", text: "t" }] };
    expect(validate({ ...view, aside_width: "wide" })).toBe(true);
    expect(validate({ ...view, aside_width: "default" })).toBe(true);
    expect(validate({ ...view, aside_width: "huge" })).toBe(false);
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    expect(validate({ ...ok, field_size: "large" })).toBe(true);
    expect(validate({ ...ok, field_size: "default" })).toBe(true);
    expect(validate({ ...ok, field_size: "xl" })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "tile", hint: "Optional. Begin from a picture." }] })).toBe(true);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Start frame", kind: "picture", placement: "tile", hint: "" }] })).toBe(false);
    const tier = { state: "tier", tiers: [{ id: "standard", label: "Standard", hint: "Fast" }] };
    expect(validate({ ...ok, tier: { ...tier, presentation: "cards" } })).toBe(true);
    expect(validate({ ...ok, tier: { ...tier, presentation: "segment" } })).toBe(true);
    expect(validate({ ...ok, tier: { ...tier, presentation: "rows" } })).toBe(false);
    expect(validate({ ...ok, tier, submit_detail: { state: "tier", placement: "in_button", labels: { standard: "About a minute" } } })).toBe(true);
    expect(validate({ ...ok, tier, submit_detail: { state: "tier", placement: "below", labels: {} } })).toBe(true);
    expect(validate({ ...ok, tier, submit_detail: { state: "tier", placement: "inside", labels: {} } })).toBe(false);
  });

  test("VIDEO-UI-13: split_view main_surface and a chip's trigger and popover_size, defaults unchanged", () => {
    const view = { type: "split_view", main: [{ type: "empty_state", icon: "x", text: "t" }], aside: [{ type: "empty_state", icon: "x", text: "t" }] };
    expect(validate(view)).toBe(true);
    expect(validate({ ...view, main_surface: "stage" })).toBe(true);
    expect(validate({ ...view, main_surface: "page" })).toBe(true);
    expect(validate({ ...view, main_surface: "dark" })).toBe(false);
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const look = { state: "look", label: "Look", variant: "cards", presentation: "popover", group: "Style", options: [{ value: "a", label: "A" }] };
    expect(validate({ ...ok, chips: [look] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...look, trigger: "banner", popover_size: "wide" }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...look, trigger: "default", popover_size: "default" }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...look, trigger: "poster" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...look, popover_size: "huge" }] })).toBe(false);
  });

  test("ADULT-LOCK-01: media_shelf locked_field and making_field, result_feed fields.locked and making; defaults unchanged", () => {
    const shelf = { type: "media_shelf", bind: { source: "package", path: "clips" }, item_key_field: "id", item_label_field: "title", item_media_field: "thumb" };
    expect(validate(shelf)).toBe(true);
    expect(validate({ ...shelf, locked_field: "locked", making_field: "making" })).toBe(true);
    expect(validate({ ...shelf, locked_field: "" })).toBe(false);
    expect(validate({ ...shelf, locked_field: true })).toBe(false);
    const feed = { type: "result_feed", bind: { source: "package", path: "recipes" }, fields: { words: "prompt", status: "status" }, poll_while: { statuses: ["queued"], record: { path: "recipes" } } };
    expect(validate(feed)).toBe(true);
    expect(validate({ ...feed, fields: { ...feed.fields, locked: "locked", making: "making" } })).toBe(true);
    expect(validate({ ...feed, fields: { ...feed.fields, locked: 1 } })).toBe(false);
  });

  test("VIDEO-STUDIO-02: page surface is page or studio, default unchanged", () => {
    const page = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t" }] };
    expect(validate(page)).toBe(true);
    expect(validate({ ...page, surface: "studio" })).toBe(true);
    expect(validate({ ...page, surface: "page" })).toBe(true);
    expect(validate({ ...page, surface: "dark" })).toBe(false);
  });

  test("answer_blocks needs a package binding and refuses a route binding", () => {
    expect(validate({ type: "answer_blocks" })).toBe(false);
    expect(validate({ type: "answer_blocks", bind: { source: "route", path: "/api/people" } })).toBe(false);
    expect(validate({ type: "answer_blocks", bind: forecast, kinds: [] })).toBe(false);
    expect(validate({ type: "answer_blocks", bind: forecast, extra: true })).toBe(false);
  });

  test("answer_blocks states: three stated reasons, each a sentence with at most three buttons of the three kinds", () => {
    const withStates = (states: unknown) => ({ type: "answer_blocks", bind: forecast, states });
    const needs = { text: "Choose a place.", actions: [{ label: "Add a place", navigate: { to: "/settings/weather" } }, { label: "Use my location", locate: { state: "place" } }, { label: "Try again", retry: true }] };
    expect(validate(withStates({ needs_place: needs, down: { text: "Offline." }, timed_out: { text: "Slow." } }))).toBe(true);
    expect(validate(withStates({ elsewhere: { text: "x" } }))).toBe(false);
    expect(validate(withStates({ down: {} }))).toBe(false);
    expect(validate(withStates({ down: { text: "x", actions: [{ label: "A", retry: true }, { label: "B", retry: true }, { label: "C", retry: true }, { label: "D", retry: true }] } }))).toBe(false);
    expect(validate(withStates({ down: { text: "x", actions: [{ label: "A", call: {} }] } }))).toBe(false);
    expect(validate(withStates({ needs_place: { text: "x", actions: [{ label: "A", locate: { state: "Place" } }] } }))).toBe(false);
  });

  test("a picker needs a state name and a label; bind needs both item fields", () => {
    expect(validate({ type: "picker", state: "place", label: "Place", leading: [{ value: "current", label: "Current location", needs: "geolocation" }] })).toBe(true);
    expect(validate({ type: "picker", state: "Place", label: "Place" })).toBe(false);
    expect(validate({ type: "picker", state: "place" })).toBe(false);
    expect(validate({ type: "picker", state: "place", label: "Place", bind: { source: "package", path: "places" } })).toBe(false);
    expect(validate({ type: "picker", state: "place", label: "Place", bind: { source: "package", path: "places" }, item_key_field: "id", item_label_field: "label" })).toBe(true);
    expect(validate({ type: "picker", state: "place", label: "Place", leading: [{ value: "x", label: "X", needs: "microphone" }] })).toBe(false);
  });

  test("NEWS-LOOK-02: a search node and the answer_blocks filter_state", () => {
    const bind = { source: "package", path: "recents" };
    expect(validate({ type: "search" })).toBe(true);
    expect(validate({ type: "search", state: "q", label: "Search News", placeholder: "Search stories", recents: bind, item_key_field: "key", item_label_field: "label", submit: { navigate: { to: "/apps/news/search", state: { q: "{q}" } } }, clear_recents: { call: { target: "/api/plugins/news/actions/clear-recents" } } })).toBe(true);
    expect(validate({ type: "search", state: "Q" })).toBe(false);
    expect(validate({ type: "search", label: "" })).toBe(false);
    expect(validate({ type: "search", recents: { source: "route", path: "/api/x" } })).toBe(false);
    expect(validate({ type: "search", extra: 1 })).toBe(false);
    const blocks = { type: "answer_blocks", bind: { source: "package", path: "today" } };
    expect(validate({ ...blocks, filter_state: "topic" })).toBe(true);
    expect(validate({ ...blocks, filter_state: "Topic" })).toBe(false);
  });

  test("MEDIA-PLAYER-01: player, billboard and the media_shelf additions", () => {
    const bind = { source: "package", path: "item" };
    expect(validate({ type: "player", bind })).toBe(true);
    expect(validate({ type: "player", bind, layout: "mini", kind: "audio", fields: { src: "file.path" } })).toBe(true);
    expect(validate({ type: "player", bind, fields: { unknown: "x" } })).toBe(false);
    expect(validate({ type: "player", bind, layout: "tv" })).toBe(false);
    const play = { play: { media_id: "{id}" } };
    const billboard = { type: "billboard", bind, item_key_field: "id", item_title_field: "title", primary: { label: "Play", action: play } };
    expect(validate(billboard)).toBe(true);
    expect(validate({ ...billboard, primary: undefined })).toBe(false);
    const three = Array.from({ length: 3 }, (_, i) => ({ label: `B${i}`, action: play }));
    expect(validate({ ...billboard, secondary: three })).toBe(false);
    expect(validate({ type: "empty_state", icon: "x", text: "t", action: { play: { media_id: "" } } })).toBe(false);
    const shelf = { type: "media_shelf", bind, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    expect(validate({ ...shelf, heading: "Continue watching", item_progress_field: "p", item_badge_field: "b", item_meta_field: "d", item_subtitle_field: "{c}", on_select: play })).toBe(true);
    expect(validate({ ...shelf, item_progress: "p" })).toBe(false);
  });
});
