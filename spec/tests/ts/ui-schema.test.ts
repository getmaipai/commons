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
  test("VIDEO-UI-15: fresh_confirm and conditional result-feed actions validate", () => {
    const callAction = ajv.compile({ $schema: schema.$schema, $id: "https://example.com/fresh-action.schema.json", $defs: schema.$defs, $ref: "#/$defs/action" });
    expect(callAction({ call: { target: "/mark", args: { id: "{id}", ticket: "{ticket}" }, fresh_confirm: { title: "Confirm", description: "Fresh check", action_label: "Continue" } } })).toBe(true);
    expect(callAction({ call: { target: "/mark", fresh_confirm: { unknown: true } } })).toBe(false);
    const node = { type: "result_feed", bind: { source: "route", path: "/results" }, fields: { words: "words", status: "status" }, actions: [{ label: "Unmark", show_when: "adult.nsfw", action: { call: { target: "/unmark", fresh_confirm: { title: "Confirm" } } } }], poll_while: { statuses: ["queued"], record: { path: "job" } } };
    expect(validate(node)).toBe(true);
    expect(validate({ ...node, actions: Array.from({ length: 9 }, () => node.actions[0]) })).toBe(false);
    expect(validate({ ...node, actions: [{ ...node.actions[0], show_when: "" }] })).toBe(false);
  });
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
  test("PARITY-01: media parity fields validate and reject malformed values", () => {
    const player = { type: "player", bind: { source: "package", path: "item" } };
    expect(validate({ ...player, sleep_timer: true, skip: { back: 15, forward: 30 }, double_tap_seek: true, long_press_speed: true, pip: true, details_show: ["transcript"], transcript_bind: { source: "package", path: "transcript" }, fields: { transcript: "tr" } })).toBe(true);
    for (const bad of [{ skip: { back: 15 } }, { skip: { back: 0, forward: 30 } }, { sleep_timer: "yes" }, { details_show: ["lyrics"] }, { pip: 1 }]) expect(validate({ ...player, ...bad })).toBe(false);
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    const opts = [{ value: "a", label: "A" }, { value: "b", label: "B" }];
    expect(validate({ ...shelf, sort: { state: "sort", label: "Sort", options: opts }, chips: { state: "k", label: "Filter", options: opts }, item_avatar_field: "av", pinned_field: "pinned", pinned_max: 6, pinned_heading: "Pinned" })).toBe(true);
    for (const bad of [{ sort: { state: "Sort", label: "Sort", options: opts } }, { chips: { state: "k", label: "F", options: [opts[0]] } }, { pinned_max: 13 }, { row_actions: Array.from({ length: 4 }, () => ({ icon: "play", label: "x", action: { navigate: { to: "/a" } } })) }]) expect(validate({ ...shelf, ...bad })).toBe(false);
    const three = Array.from({ length: 3 }, () => ({ icon: "play", label: "x", action: { navigate: { to: "/a" } } }));
    expect(validate({ ...shelf, row_actions: three })).toBe(true);
    expect(validate({ type: "track_rows", bind: { source: "package", path: "x" }, label: "T", item_key_field: "id", item_label_field: "t", on_play: { navigate: { to: "/a" } }, row_actions: three })).toBe(true);
    const action = ajv.compile({ $schema: schema.$schema, $id: "https://example.com/action2.schema.json", $defs: schema.$defs, $ref: "#/$defs/action" });
    expect(action({ share: { to: "/apps/music/album?id={id}", title: "{title}" } })).toBe(true);
    for (const bad of [{ share: { to: "https://example.com" } }, { share: {} }, { share: { to: "/a" }, navigate: { to: "/b" } }]) expect(action(bad)).toBe(false);
    const header = { type: "creation_header", bind: { source: "package", path: "h" }, share_change: { add: { call: { target: "/a" } }, remove: { call: { target: "/a" } }, make_private: { call: { target: "/a" } } } };
    expect(validate({ ...header, backdrop: "art_gradient" })).toBe(true);
    expect(validate({ ...header, backdrop: "blue" })).toBe(false);
    const opt = { state: "kind", label: "Type", options: opts };
    expect(validate({ type: "search", type_chips: opt })).toBe(true);
    expect(validate({ type: "search", type_chips: { ...opt, options: [] } })).toBe(false);
  });

  test("MEDIA-PARITY-02: reorder, dot badge, search suggest, confirm status and widget_tiles", () => {
    const opts = { call: { call: { target: "/api/x/order" } }, id_param: "ids" };
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    const rows = { type: "track_rows", bind: { source: "package", path: "x" }, label: "T", item_key_field: "id", item_label_field: "t", on_play: { navigate: { to: "/a" } } };
    for (const node of [shelf, rows]) {
      expect(validate(node)).toBe(true);
      expect(validate({ ...node, reorder: opts })).toBe(true);
      for (const bad of [{ id_param: "Ids" }, { id_param: undefined }, { call: { navigate: { to: "/a" } } }, { call: undefined }, { extra: 1 }]) expect(validate({ ...node, reorder: { ...opts, ...bad } })).toBe(false);
    }
    expect(validate({ ...shelf, item_badge_field: "unplayed", item_badge_presentation: "dot" })).toBe(true);
    expect(validate({ ...shelf, item_badge_field: "unplayed", item_badge_presentation: "label" })).toBe(true);
    expect(validate({ ...shelf, item_badge_presentation: "ring" })).toBe(false);
    const suggest = { bind: { source: "package", path: "suggest", params: { q: "$state.q" } }, max: 6, min_chars: 2 };
    expect(validate({ type: "search", suggest })).toBe(true);
    expect(validate({ type: "search" })).toBe(true);
    for (const bad of [{ bind: { source: "route", path: "/x" } }, { ...suggest, max: 11 }, { ...suggest, min_chars: 0 }, { max: 3 }]) expect(validate({ type: "search", suggest: bad })).toBe(false);
    const action = ajv.compile({ $schema: schema.$schema, $id: "https://example.com/action3.schema.json", $defs: schema.$defs, $ref: "#/$defs/action" });
    const confirm = { prompt: "Remove {title}?", on_confirm: { call: { target: "/x" } } };
    expect(action({ confirm })).toBe(true);
    expect(action({ confirm: { ...confirm, status: { source: "package", path: "remove-status" } } })).toBe(true);
    expect(action({ confirm: { ...confirm, status: { source: "route", path: "/x" } } })).toBe(false);
    expect(validate({ type: "widget_tiles", bind: { source: "route", path: "/api/widgets" } })).toBe(true);
    expect(validate({ type: "widget_tiles" })).toBe(false);
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

  test("QA-FINISH-01: list.hide_when_empty and call.success_label", () => {
    const list = { type: "list", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t" };
    expect(validate({ ...list, hide_when_empty: true })).toBe(true);
    expect(validate({ ...list, hide_when_empty: "yes" })).toBe(false);
    const withCall = (call: unknown) => validate({ ...list, row_action: { icon: "plus", label: "Save", action: { call } } });
    expect(withCall({ target: "/api/x", success_label: "Saved" })).toBe(true);
    expect(withCall({ target: "/api/x", success_label: "" })).toBe(false);
    expect(withCall({ target: "/api/x", success_label: 3 })).toBe(false);
  });

  test("PODCAST-RATE-01: player.rate takes field, value and on_change", () => {
    const player = { type: "player", bind: { source: "package", path: "episode" } };
    const change = { call: { target: "/api/x/{id}", args: { rate: "{rate}" } } };
    expect(validate({ ...player, rate: { field: "show_rate", value: 1.25, on_change: change } })).toBe(true);
    expect(validate({ ...player, rate: { value: 2 } })).toBe(true);
    expect(validate(player)).toBe(true);
    for (const rate of [{}, { value: 9 }, { value: "fast" }, { field: "" }, { speed: 1 }, { on_change: { bogus: 1 } }]) expect(validate({ ...player, rate })).toBe(false);
  });

  test("CLIPS-FEED-01: clip_feed takes item_fields, like and remake, an empty state and autoplay switches", () => {
    const fields = { src: "s", poster: "p", title: "t", duration_s: "d", id: "id" };
    const feed = { type: "clip_feed", bind: { source: "package", path: "clips" }, item_fields: fields, empty_state: { type: "empty_state", icon: "film", text: "None" } };
    expect(validate(feed)).toBe(true);
    const good = { ...feed, item_fields: { ...fields, subtitle: "u", liked: "l" }, start_id: "c1", on_close: { navigate: { to: "/x" } }, autoplay: false, autoplay_field: "autoplay",
      actions: { like: { call: { target: "/api/x/{id}", args: { liked: "{liked}" } } }, remake: { starts: "video", navigate: { to: "/y" } } } };
    expect(validate(good)).toBe(true);
    const bad: unknown[] = [
      { ...feed, bind: { source: "route", path: "/api/clips" } },
      { ...feed, item_fields: { src: "s", poster: "p", title: "t", id: "id" } },
      { ...feed, item_fields: { ...fields, extra: "x" } },
      { ...feed, actions: { save: { call: { target: "/x" } } } },
      { ...feed, actions: { share: { call: { target: "/x" } } } },
      { ...feed, actions: { like: {} } },
      { ...feed, actions: { remake: { starts: "audio", navigate: { to: "/y" } } } },
      { ...feed, empty_state: undefined },
      { ...feed, autoplay: "no" },
      { ...feed, start_id: "" },
      { ...feed, speed: 2 },
    ];
    for (const invalid of bad) expect(validate(invalid)).toBe(false);
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

  test("media_shelf poll_while names row values that keep the whole shelf current", () => {
    const shelf = { type: "media_shelf", bind: { source: "package", path: "recent" }, item_key_field: "id", item_label_field: "title", item_media_field: "image", poll_while: { field: "badge", values: ["making"] } };
    expect(validate(shelf)).toBe(true);
    expect(validate({ ...shelf, poll_while: { field: "badge", values: [] } })).toBe(false);
    expect(validate({ ...shelf, poll_while: { statuses: ["queued"], record: { path: "recent" } } })).toBe(false);
  });

  test("player marks take bind, field and heading and reject unknown keys", () => {
    const player = { type: "player", bind: { source: "package", path: "item" } };
    expect(validate({ ...player, marks: { field: "marks", heading: "Moments" } })).toBe(true);
    expect(validate({ ...player, marks: { bind: { source: "package", path: "marks" } }, actions: [{ label: "Save moment", action: { call: { target: "/x", args: { at_s: "{position_s}" } } } }] })).toBe(true);
    expect(validate({ ...player, marks: {} })).toBe(false);
    expect(validate({ ...player, marks: { field: "marks", extra: 1 } })).toBe(false);
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
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Picture", kind: "picture", max: 3 }] })).toBe(true);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Picture", kind: "picture", max: 0 }] })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Picture", kind: "picture", max: 4 }] })).toBe(false);
    expect(validate({ ...ok, references: [{ state: "start_frame", label: "Picture", kind: "picture", max: 1.5 }] })).toBe(false);
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
  test("VIDEO-STUDIO-03: creation_header studio variant (eyebrow, secondary, fields.locked) and heading_style on media_shelf and result_feed", () => {
    const header = { type: "creation_header", bind: { source: "package", path: "clip" }, share_change: { add: { call: { target: "/x" } }, remove: { call: { target: "/x" } }, make_private: { call: { target: "/x" } } } };
    for (const variant of ["full", "byline", "collection", "studio"]) expect(validate({ ...header, variant })).toBe(true);
    expect(validate({ ...header, variant: "wide" })).toBe(false);
    const studio = { ...header, variant: "studio", eyebrow: "STUDIO", fields: { art: "poster", locked: "locked" }, secondary: { label: "Back to the clip", action: { navigate: { to: "/apps/videos" } } }, primary: { label: "Export as a new clip", action: { call: { target: "/x" } } } };
    expect(validate(studio)).toBe(true);
    for (const bad of [{ eyebrow: "" }, { eyebrow: 3 }, { secondary: { label: "" , action: { navigate: { to: "/a" } } } }, { secondary: { label: "A" } }, { fields: { nope: "x" } }]) expect(validate({ ...studio, ...bad })).toBe(false);
    const feed = { type: "result_feed", bind: { source: "package", path: "recipes" }, fields: { words: "prompt", status: "status" }, poll_while: { statuses: ["queued"], record: { path: "recipes" } } };
    const shelf = { type: "media_shelf", bind: { source: "package", path: "x" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };
    for (const node of [feed, shelf]) {
      expect(validate(node)).toBe(true);
      for (const heading_style of ["default", "eyebrow"]) expect(validate({ ...node, heading_style })).toBe(true);
      for (const heading_style of ["large", true, ""]) expect(validate({ ...node, heading_style })).toBe(false);
    }
  });
  test("STYLES-04: prompt_bar style_suggest takes a binding, state names and a max of 1 or 2", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const rows = { source: "package", path: "suggest", params: { text: "$state.prompt" } };
    expect(validate({ ...ok, style_suggest: { rows } })).toBe(true);
    expect(validate({ ...ok, style_suggest: { rows, style_state: "style", character_state: "character", max: 1 } })).toBe(true);
    expect(validate({ ...ok, style_suggest: { rows, max: 3 } })).toBe(false);
    expect(validate({ ...ok, style_suggest: { rows, max: 0 } })).toBe(false);
    expect(validate({ ...ok, style_suggest: { rows, style_state: "Style" } })).toBe(false);
    expect(validate({ ...ok, style_suggest: {} })).toBe(false);
    expect(validate({ ...ok, style_suggest: { rows, extra: 1 } })).toBe(false);
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

  test("VIDEO-COMPOSER-02: prompt_bar supports the compact Chat input layout", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    expect(validate({ ...ok, layout: "block" })).toBe(true);
    expect(validate({ ...ok, layout: "composer" })).toBe(true);
    expect(validate({ ...ok, layout: "chat" })).toBe(true);
    expect(validate({ ...ok, layout: "chat", chat_distribution: "start_end", chips: [{ state: "sound", label: "Sound", align: "end", options: [{ value: "off", label: "Off", icon: "volume-x" }] }], tier: { state: "tier", presentation: "dropdown", tiers: [{ id: "standard", label: "Standard", hint: "Fast, sound, up to 10 seconds" }] } })).toBe(true);
    expect(validate({ ...ok, layout: "columns" })).toBe(false);
  });

  test("VIDEO-COMPOSER-03: prompt_bar chip and option icons and reference disabled_reason", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const chip = { state: "style", label: "Style", icon: "sparkles", options: [{ value: "a", label: "A", icon: "brush" }] };
    expect(validate({ ...ok, chips: [chip], references: [{ state: "start_frame", label: "Start frame", kind: "picture", disabled_reason: "Start frames are not available yet." }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...chip, icon: "x".repeat(41) }] })).toBe(false);
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

  test("VIDEO-LORA-09: a chip's locked, enabled_tiers, disabled_reason and quiet_value and an option's note; defaults unchanged", () => {
    const ok = { type: "prompt_bar", label: "Describe", submit: { call: { target: "/api/plugins/videos/make" } } };
    const style = { state: "style", label: "Styles", variant: "cards", presentation: "popover", group: "Style", options: [{ value: "none", label: "No style" }, { value: "a", label: "Clay", note: "Makes it look like clay. It adds two phrases." }] };
    expect(validate({ ...ok, chips: [style] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...style, locked: true, enabled_tiers: ["max"], disabled_reason: "Styles are for Max for now.", quiet_value: "none" }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...style, enabled_tiers: [] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, enabled_tiers: ["huge"] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, enabled_tiers: ["max", "max"] }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, private: true }] })).toBe(true);
    expect(validate({ ...ok, chips: [{ ...style, private: "yes" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, locked: "yes" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, disabled_reason: "" }] })).toBe(false);
    expect(validate({ ...ok, chips: [{ ...style, options: [{ value: "a", label: "A", note: "" }] }] })).toBe(false);
  });

  test("VIDEO-LORA-09: a prompt bar takes up to sixteen chips", () => {
    const chip = (n: number) => ({ state: `c${n}`, label: `Chip ${n}`, options: [{ value: "a", label: "A" }] });
    const bar = (count: number) => ({ type: "prompt_bar", label: "Describe", chips: Array.from({ length: count }, (_, n) => chip(n)), submit: { call: { target: "/api/plugins/videos/make" } } });
    expect(validate(bar(16))).toBe(true);
    expect(validate(bar(17))).toBe(false);
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

  test("IMG-STUDIO-01: the image_editor node (the picture Studio) is additive and strict", () => {
    const editor = { type: "image_editor", bind: { source: "package", path: "picture", params: { id: "$state.file" } } };
    expect(validate(editor)).toBe(true);
    const full = {
      ...editor,
      fields: { key: "id", title: "title", url: "url", width: "width", height: "height", versions: "versions", locked: "locked" },
      initial_tool: "crop",
      tools: ["markup", "comment", "remove_background", "erase", "resize", "crop", "adjust", "more"],
      tool_reasons: { crop: "Crop is not ready yet.", adjust: "Adjust is not ready yet." },
      compare: true,
      comment_brush: true,
      resize_upscale: false,
      operations: { bind: { source: "package", path: "operations" } },
      handlers: {
        run: { call: { target: "/x", args: { file: "{file}", operation: "{operation}", args: "{args}" } } },
        apply: { call: { target: "/y" } },
        markup: { call: { target: "/y" } },
        comment: { call: { target: "/y" } },
        pick_reference: { call: { target: "/y" } },
      },
      on_close: { navigate: { to: "/apps/images" } },
    };
    expect(validate(full)).toBe(true);
    const bad: Record<string, unknown>[] = [
      { initial_tool: "draw" }, { tools: ["crop", "crop"] }, { tools: ["blur"] }, { tool_reasons: { more: "no" } }, { tool_reasons: { crop: "" } },
      { fields: { nope: "x" } }, { operations: {} }, { operations: { bind: { source: "package", path: "o" }, extra: 1 } }, { handlers: { delete: { call: { target: "/x" } } } },
      { handlers: { run: { call: { target: "/x" }, navigate: { to: "/a" } } } }, { compare: "yes" }, { extra: true },
    ];
    for (const patch of bad) expect(validate({ ...full, ...patch })).toBe(false);
    expect(validate({ ...editor, bind: undefined })).toBe(false);
  });

  test("IMG-STUDIO-03: image_editor takes an empty_state, a placeholder field and hide_when_empty; empty_state takes a second action", () => {
    const editor = { type: "image_editor", bind: { source: "package", path: "picture" } };
    const empty = { type: "empty_state", icon: "image", text: "No pictures yet.", action: { navigate: { to: "/apps/image/create" } }, action_label: "Make a picture", secondary_action: { navigate: { to: "/files" } }, secondary_action_label: "Upload a picture" };
    expect(validate({ ...editor, empty_state: empty, hide_when_empty: true, fields: { empty: "empty" } })).toBe(true);
    expect(validate({ type: "page", id: "p", title: "P", body: [empty] })).toBe(true);
    for (const patch of [{ hide_when_empty: "yes" }, { empty_state: { ...empty, icon: undefined } }, { empty_state: { ...empty, secondary_action_label: "" } }, { empty_state: { ...empty, secondary_action_label: "x".repeat(41) } }, { fields: { empty: 1 } }]) {
      expect(validate({ ...editor, ...patch })).toBe(false);
    }
  });

  test("EDITOR-AGE-ADD: image_editor takes add_picture with a label and an action, and nothing else", () => {
    const editor = { type: "image_editor", bind: { source: "package", path: "picture" } };
    const add = { label: "Add a picture", action: { navigate: { to: "/apps/image/studio", state: { file: "{id}" } } } };
    expect(validate({ ...editor, add_picture: add })).toBe(true);
    expect(validate({ ...editor, add_picture: { action: add.action } })).toBe(true);
    for (const patch of [{ add_picture: { label: "Add" } }, { add_picture: { ...add, label: "" } }, { add_picture: { ...add, label: "x".repeat(41) } }, { add_picture: { ...add, extra: 1 } }]) {
      expect(validate({ ...editor, ...patch })).toBe(false);
    }
  });

  test("EDITOR-HANDOFF: image_editor takes up to three hand-offs, each with a label and an action", () => {
    const editor = { type: "image_editor", bind: { source: "package", path: "picture" } };
    const one = { label: "Make a video from this", action: { navigate: { to: "/apps/image/studio", state: { file: "{file}" } } } };
    const handOff = { label: "Make a video from this", hand_off: "video_create" };
    expect(validate({ ...editor, actions: [one] })).toBe(true);
    expect(validate({ ...editor, actions: [handOff] })).toBe(true);
    for (const bad of [{ label: "x" }, { ...handOff, action: one.action }, { ...handOff, hand_off: "photo" }]) expect(validate({ ...editor, actions: [bad] })).toBe(false);
    expect(validate({ ...editor, actions: [one, one, one] })).toBe(true);
    for (const patch of [{ actions: [one, one, one, one] }, { actions: [{ label: "x" }] }, { actions: [{ ...one, label: "" }] }, { actions: [{ ...one, extra: 1 }] }]) {
      expect(validate({ ...editor, ...patch })).toBe(false);
    }
  });

  test("VIDEO-STUDIO-04: the studio node (TrackStudio) is additive and strict", () => {
    const studio = { type: "studio", bind: { source: "package", path: "studio" } };
    expect(validate(studio)).toBe(true);
    const full = {
      ...studio,
      kind: "video",
      fields: { key: "id", title: "title", poster: "poster", lanes: "lanes", locked: "locked" },
      tools: ["split", "delete", "add_clip", "add_voice", "add_music"],
      tool_reasons: { add_voice: "Voices are not ready yet." },
      panels: ["volume", "fades", "crossfade", "level"],
      limits: { video_pieces: 6, audio_pieces: 2, film_s: 60 },
      level_steps: [{ id: "soft", label: "Soft", gain_db: -8, clip_gain_db: 0 }, { id: "loud", label: "Loud", gain_db: 4, clip_gain_db: -6 }],
      handlers: { export: { call: { target: "/x", args: { plan: "{plan}" } } }, add: { call: { target: "/y" } } },
      export_label: "Export as a new clip",
      export_disabled_reason: "Editing is not ready yet.",
      make_more: [{ label: "Another take", action: { call: { target: "/z" } } }, { label: "Extend", badge: "Max", starts: "video", action: { call: { target: "/z" } } }],
      export_result: { bind: { source: "package", path: "job" }, fields: { status: "status", progress: "progress" }, poll_while: { statuses: ["queued", "generating"], record: { path: "job" } }, actions: [{ label: "Open in My clips", action: { navigate: { to: "/apps/videos/clips" } } }] },
    };
    expect(validate(full)).toBe(true);
    expect(validate({ ...studio, kind: "audio" })).toBe(true);
    const bad: Record<string, unknown>[] = [
      { kind: "film" }, { tools: ["trim"] }, { tools: ["split", "split"] }, { panels: ["eq"] }, { limits: { audio_pieces: 5 } }, { limits: { film_s: 0 } },
      { fields: { nope: "x" } }, { handlers: { play: { call: { target: "/x" } } } }, { handlers: { export: { call: { target: "/x" }, navigate: { to: "/a" } } } },
      { make_more: [{ label: "A" }] }, { make_more: Array.from({ length: 4 }, () => ({ label: "A", action: { call: { target: "/z" } } })) },
      { level_steps: [{ id: "a", label: "A", gain_db: 0 }] }, { export_result: { bind: { source: "package", path: "j" }, fields: { status: "s" } } },
      { tool_reasons: { split: "no" } }, { extra: true },
    ];
    for (const patch of bad) expect(validate({ ...full, ...patch })).toBe(false);
    expect(validate({ type: "studio" })).toBe(false);
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
