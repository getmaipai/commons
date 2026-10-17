// APP-KIND-01: the manifest side of a package app (pages, keywords, data) and the
// cross-file lint (ui/app-check.ts). The page shapes themselves are in ui-schema.test.ts.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PackageManifest } from "../../gen/ts/manifest.js";
import { checkAppPackage, type AppContributes } from "../../ui/app-check.js";

const BASE = {
  id: "weather", version: "0.1.0", kind: "plugin", category: "Info", display: "Weather", description: "A minimal manifest for app tests.",
  author: "MaiPai", license: "AGPL-3.0", platforms: ["home"], min_role: "child", consequential: false, offline: "full", min_app: "0.1.0", tier: 0, incognito: "unaffected",
} as const;

const weatherPage = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "ui", "pages", "weather.json"), "utf-8"));

const contributes: AppContributes = {
  pages: [
    { id: "index", label: "Weather", icon: "cloud-sun", nav: true, kind: "schema", module: "weather", keywords: ["forecast", "rain", "temperature"] },
    { id: "forecast", label: "Forecast", icon: "calendar", nav: true, kind: "schema", module: "forecast" },
  ],
  data: [
    { id: "places", surface: "weather", rows: "places" },
    { id: "forecast", surface: "weather", refresh_s: 1800 },
  ],
};
const forecastPage = { type: "page", id: "forecast", title: "Forecast", body: [{ type: "answer_blocks", bind: { source: "package", path: "forecast" } }] };
const load = (module: string): unknown => ({ weather: weatherPage, forecast: forecastPage })[module];

describe("manifest contributes.pages and contributes.data", () => {
  test("a full app manifest parses", () => {
    expect(() => PackageManifest.parse({ ...BASE, contributes })).not.toThrow();
  });
  test("a kind: web page is rejected", () => {
    const bad = { ...contributes, pages: [{ ...contributes.pages![0], kind: "web" }] };
    expect(() => PackageManifest.parse({ ...BASE, contributes: bad })).toThrow();
  });
  test("a page id and module must be plain names", () => {
    for (const patch of [{ id: "Index" }, { id: "a/b" }, { module: "../x" }, { module: "pages/x" }]) {
      const bad = { ...contributes, pages: [{ ...contributes.pages![0], ...patch }] };
      expect(() => PackageManifest.parse({ ...BASE, contributes: bad })).toThrow();
    }
  });
  test("keywords: at most 8, each at most 24 characters", () => {
    const withKeywords = (keywords: string[]) => ({ ...contributes, pages: [{ ...contributes.pages![0], keywords }] });
    expect(() => PackageManifest.parse({ ...BASE, contributes: withKeywords(Array.from({ length: 9 }, (_, i) => `k${i}`)) })).toThrow();
    expect(() => PackageManifest.parse({ ...BASE, contributes: withKeywords(["x".repeat(25)]) })).toThrow();
  });
  test("pinned_by_default and pin_order: a boolean and an integer 0 to 99", () => {
    const withPin = (patch: Record<string, unknown>) => ({ ...contributes, pages: [{ ...contributes.pages![0], ...patch }, ...contributes.pages!.slice(1)] });
    expect(() => PackageManifest.parse({ ...BASE, contributes: withPin({ pinned_by_default: true, pin_order: 10 }) })).not.toThrow();
    for (const patch of [{ pinned_by_default: "yes" }, { pin_order: 100 }, { pin_order: -1 }, { pin_order: 1.5 }]) {
      expect(() => PackageManifest.parse({ ...BASE, contributes: withPin(patch) })).toThrow();
    }
  });
  test("a page min_role is one of the six roles; `member` is refused (NEWS-00)", () => {
    const withRole = (min_role: unknown) => ({ ...contributes, pages: [{ ...contributes.pages![0], min_role }, ...contributes.pages!.slice(1)] });
    for (const role of ["owner", "admin", "adult", "teen", "child", "guest"]) {
      expect(() => PackageManifest.parse({ ...BASE, contributes: withRole(role) })).not.toThrow();
    }
    for (const bad of ["member", "Teen", "", 3]) {
      expect(() => PackageManifest.parse({ ...BASE, contributes: withRole(bad) })).toThrow();
    }
  });
  test("a data entry refuses an unknown surface and an unknown field", () => {
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "forecast", surface: "moon" }] } })).toThrow();
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "forecast", url: "https://example.com" }] } })).toThrow();
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "Forecast" }] } })).toThrow();
  });
});

describe("checkAppPackage (the cross-file lint)", () => {
  test("a page may raise the package floor but not lower it (NEWS-00)", () => {
    const withRole = (min_role: string) => ({ ...contributes, pages: [{ ...contributes.pages![0], min_role }, ...contributes.pages!.slice(1)] });
    expect(checkAppPackage("weather", withRole("teen"), load, "child")).toEqual([]);
    expect(checkAppPackage("weather", withRole("child"), load, "child")).toEqual([]);
    const lowered = checkAppPackage("weather", withRole("guest"), load, "child");
    expect(lowered.length).toBe(1);
    expect(lowered[0]).toContain("a page may only raise the floor");
    expect(checkAppPackage("weather", withRole("guest"), load)).toEqual([]);
  });
  test("the weather fixture conforms", () => {
    expect(checkAppPackage("weather", contributes, load)).toEqual([]);
  });
  test("a package with no pages is not an app and conforms", () => {
    expect(checkAppPackage("weather", undefined, load)).toEqual([]);
  });
  test("a missing index page is reported", () => {
    const bad = { ...contributes, pages: [contributes.pages![1]!] };
    expect(checkAppPackage("weather", bad, load).join("\n")).toContain('one page with id "index"');
  });
  test("a missing page file and a non-schema kind are reported", () => {
    const missing = checkAppPackage("weather", contributes, (m) => (m === "forecast" ? undefined : load(m)));
    expect(missing.join("\n")).toContain("pages/forecast.json is missing");
    const web = { ...contributes, pages: [{ ...contributes.pages![0]!, kind: "web" }] };
    expect(checkAppPackage("weather", web, load).join("\n")).toContain('kind "web" is refused');
  });
  test("a binding to a data id the package does not declare, or a route binding, is reported", () => {
    const stray = { type: "page", id: "x", title: "X", body: [{ type: "answer_blocks", bind: { source: "package", path: "elsewhere" } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? stray : load(m))).join("\n")).toContain('"elsewhere" is not a contributes.data id');
    const route = { type: "page", id: "x", title: "X", body: [{ type: "answer_blocks", bind: { source: "route", path: "/api/people" } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? route : load(m))).join("\n")).toContain('bind.source must be "package"');
  });
  test("a node that reads another route is not allowed on a package page", () => {
    const list = { type: "page", id: "x", title: "X", body: [{ type: "card_grid", bind: { source: "route", path: "/api/people" }, item_key_field: "id", item_label_field: "n" }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? list : load(m))).join("\n")).toContain('node type "card_grid" is not allowed');
  });
  test("an action must stay under the package's own prefixes", () => {
    const action = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t", action: { call: { target: "/api/people/1", method: "DELETE" } } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? action : load(m))).join("\n")).toContain("must stay under /api/plugins/weather/");
    const nav = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t", action: { navigate: { to: "/settings" } } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? nav : load(m))).join("\n")).toContain("must stay under /apps/weather");
  });
  test("a stated-reason button may open the app's own settings, and nothing else outside the app", () => {
    const page = (to: string) => ({ type: "page", id: "x", title: "X", body: [{ type: "answer_blocks", bind: { source: "package", path: "forecast" }, states: { needs_place: { text: "t", actions: [{ label: "Go", navigate: { to } }] } } }] });
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? page("/settings/weather") : load(m)))).toEqual([]);
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? page("/settings/account") : load(m))).join("\n")).toContain("must stay under /apps/weather");
  });
  test("a picker needs a rows entry and an answer_blocks node needs a recipe entry", () => {
    const wrong = { type: "page", id: "x", title: "X", body: [
      { type: "picker", state: "p", label: "P", bind: { source: "package", path: "forecast" }, item_key_field: "id", item_label_field: "l" },
      { type: "answer_blocks", bind: { source: "package", path: "places" } },
    ] };
    const text = checkAppPackage("weather", contributes, (m) => (m === "weather" ? wrong : load(m))).join("\n");
    expect(text).toContain("a picker needs a data entry with");
    expect(text).toContain("needs a recipe data entry");
  });
  test("duplicate ids and rows without a surface are reported", () => {
    const dup = { pages: [contributes.pages![0]!, contributes.pages![0]!], data: [{ id: "a", rows: "places" }, { id: "a", surface: "weather" }] };
    const text = checkAppPackage("weather", dup, load).join("\n");
    expect(text).toContain('page id "index" is declared twice');
    expect(text).toContain('data id "a" is declared twice');
    expect(text).toContain("rows needs a surface");
  });
});

describe("the News pages (NEWS-00)", () => {
  const pageDir = join(import.meta.dir, "..", "..", "ui", "pages");
  const news = (name: string) => JSON.parse(readFileSync(join(pageDir, `news-${name}.json`), "utf-8"));
  const newsContributes: AppContributes = {
    pages: [
      { id: "index", label: "Today", nav: true, kind: "schema", module: "today" },
      { id: "following", label: "Following", nav: true, kind: "schema", module: "following", min_role: "child" },
      { id: "story", label: "Story", nav: false, kind: "schema", module: "story" },
      { id: "mix", label: "My Mix", nav: true, kind: "schema", module: "today", min_role: "teen" },
    ],
    data: [
      { id: "today" }, { id: "story" },
      { id: "topics", rows: "list" }, { id: "sources", rows: "list" },
    ],
  };
  const loadNews = (module: string): unknown => news(module);
  test("the three fixtures conform: tabs, list with a toggle and media, answer_blocks with actions", () => {
    expect(checkAppPackage("news", newsContributes, loadNews, "child")).toEqual([]);
    expect(() => PackageManifest.parse({ ...BASE, id: "news", contributes: newsContributes })).not.toThrow();
  });
  test("a list needs a rows entry and a package source; Listen's play is allowed only in the actions map", () => {
    const badList = { type: "page", id: "x", title: "X", body: [{ type: "list", bind: { source: "package", path: "today" }, item_key_field: "k", item_label_field: "l" }] };
    expect(checkAppPackage("news", newsContributes, (m) => (m === "today" ? badList : news(m)), "child").join("\n")).toContain("returns blocks, not rows");
    const routeList = { type: "page", id: "x", title: "X", body: [{ type: "list", bind: { source: "route", path: "/api/x" }, item_key_field: "k", item_label_field: "l" }] };
    expect(checkAppPackage("news", newsContributes, (m) => (m === "today" ? routeList : news(m)), "child").join("\n")).toContain('bind.source must be "package"');
    const playElsewhere = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t", action: { play: { media_id: "m" } } }] };
    expect(checkAppPackage("news", newsContributes, (m) => (m === "today" ? playElsewhere : news(m)), "child").join("\n")).toContain("play action is not available");
  });
  test("tab ids are unique and an outbound address is not a media field", () => {
    const dup = { type: "page", id: "x", title: "X", body: [{ type: "tabs", tabs: [{ id: "a", label: "A", body: [{ type: "empty_state", icon: "x", text: "t" }] }, { id: "a", label: "B", body: [{ type: "empty_state", icon: "x", text: "t" }] }] }] };
    expect(checkAppPackage("news", newsContributes, (m) => (m === "today" ? dup : news(m)), "child").join("\n")).toContain("declared twice");
    const media = { type: "page", id: "x", title: "X", body: [{ type: "list", bind: { source: "package", path: "topics" }, item_key_field: "k", item_label_field: "l", item_media_field: "https://example.com/p.png" }] };
    expect(checkAppPackage("news", newsContributes, (m) => (m === "today" ? media : news(m)), "child").join("\n")).toContain("not an address");
  });
});

describe("the media nodes (MEDIA-PLAYER-01)", () => {
  const pageDir = join(import.meta.dir, "..", "..", "ui", "pages");
  const video = (name: string) => JSON.parse(readFileSync(join(pageDir, `videos-${name}.json`), "utf-8"));
  const videoContributes: AppContributes = {
    pages: [
      { id: "index", label: "Videos", nav: true, kind: "schema", module: "home", keywords: ["watch", "video"] },
      { id: "watch", label: "Watch", nav: false, kind: "schema", module: "watch" },
    ],
    data: [{ id: "featured", rows: "list" }, { id: "continue", rows: "list" }, { id: "item", rows: "list" }],
  };
  const loadVideo = (module: string): unknown => video(module);
  const swap = (body: unknown[]) => (m: string) => (m === "home" ? { type: "page", id: "index", title: "Videos", body } : video(m));

  test("the Videos fixtures conform: a billboard and a shelf whose tiles play, and a player", () => {
    expect(checkAppPackage("videos", videoContributes, loadVideo, "child")).toEqual([]);
    expect(() => PackageManifest.parse({ ...BASE, id: "videos", contributes: videoContributes })).not.toThrow();
  });
  test("play is allowed on a shelf tile, a billboard button and the player's next item, not on a list row", () => {
    const rowPlay = [{ type: "list", bind: { source: "package", path: "continue" }, item_key_field: "id", item_label_field: "t", row_action: { icon: "play", label: "Play", action: { play: { media_id: "{id}" } } } }];
    expect(checkAppPackage("videos", videoContributes, swap(rowPlay), "child").join("\n")).toContain("play action is not available");
    const progressPlay = [{ type: "player", bind: { source: "package", path: "item" }, on_progress: { play: { media_id: "{id}" } } }];
    expect(checkAppPackage("videos", videoContributes, swap(progressPlay), "child").join("\n")).toContain("player.on_progress: the play action is not available");
  });
  test("a media node binds a rows: list entry of its own package", () => {
    const blocks = { ...videoContributes, data: [{ id: "featured" }, { id: "continue", rows: "list" }, { id: "item", rows: "list" }] };
    expect(checkAppPackage("videos", blocks, loadVideo, "child").join("\n")).toContain('must be a "rows": "list" entry');
    const route = [{ type: "media_shelf", bind: { source: "route", path: "/api/media" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" }];
    expect(checkAppPackage("videos", videoContributes, swap(route), "child").join("\n")).toContain('bind.source must be "package"');
  });
  test("art fields are field paths, and a shelf's call stays inside the package", () => {
    const art = [{ type: "billboard", bind: { source: "package", path: "featured" }, item_key_field: "id", item_title_field: "t", item_art_field: "//example.com/a.jpg", primary: { label: "Play", action: { play: { media_id: "{id}" } } } }];
    expect(checkAppPackage("videos", videoContributes, swap(art), "child").join("\n")).toContain("item_art_field must be a field path");
    const outside = [{ type: "media_shelf", bind: { source: "package", path: "continue" }, item_key_field: "id", item_label_field: "t", item_media_field: "m", on_select: { call: { target: "/api/media/delete" } } }];
    expect(checkAppPackage("videos", videoContributes, swap(outside), "child").join("\n")).toContain("must stay under /api/plugins/videos/");
  });
});
