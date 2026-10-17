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
