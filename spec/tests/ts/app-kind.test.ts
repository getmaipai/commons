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
  test("CREATION-HEADER-01 allows package-owned rows and scoped share calls", () => {
    const page = { type: "page", id: "x", title: "X", body: [{
      type: "creation_header", bind: { source: "package", path: "created" },
      candidates_bind: { source: "package", path: "created" },
      share_change: {
        add: { call: { target: "/api/plugins/weather/created/share", args: { person_id: "{person_id}" } } },
        remove: { call: { target: "/api/plugins/weather/created/share", method: "DELETE", args: { person_id: "{person_id}" } } },
        make_private: { call: { target: "/api/plugins/weather/created/private" } },
      },
    }] };
    const createdContributes = { ...contributes, data: [...contributes.data!, { id: "created", surface: "weather", rows: "list" }] };
    expect(checkAppPackage("weather", createdContributes, (module) => module === "weather" ? page : load(module))).toEqual([]);
    const outside = { ...page, body: [{ ...page.body[0]!, share_change: { ...page.body[0]!.share_change, make_private: { call: { target: "/api/created/private" } } } }] };
    expect(checkAppPackage("weather", createdContributes, (module) => module === "weather" ? outside : load(module)).join("\n")).toContain("must stay under /api/plugins/weather/");
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
  test("NEWS-LOOK-02: a search node's recents binding, submit and clear_recents are checked", () => {
    const page = (node: unknown) => ({ type: "page", id: "x", title: "X", body: [node] });
    const run = (node: unknown) => checkAppPackage("news", newsContributes, (m) => (m === "today" ? page(node) : news(m)), "child").join("\n");
    const ok = { type: "search", recents: { source: "package", path: "topics" }, submit: { navigate: { to: "/apps/news/search", state: { q: "{q}" } } }, clear_recents: { call: { target: "/api/plugins/news/actions/clear-recents" } } };
    expect(run(ok)).toBe("");
    expect(run({ type: "search" })).toBe("");
    expect(run({ ...ok, recents: { source: "package", path: "today" } })).toContain("returns blocks, not rows");
    expect(run({ ...ok, recents: { source: "package", path: "nope" } })).toContain("is not a contributes.data id");
    expect(run({ ...ok, recents: { source: "route", path: "/api/x" } })).toContain('bind.source must be "package"');
    expect(run({ ...ok, submit: { navigate: { to: "/apps/other/search" } } })).toContain("search.submit: navigate.to");
    expect(run({ ...ok, submit: { call: { target: "/api/plugins/other/x" } } })).toContain("search.submit: call.target");
    expect(run({ ...ok, clear_recents: { navigate: { to: "https://example.com" } } })).toContain("search.clear_recents: navigate.to");
    expect(run({ ...ok, clear_recents: { call: { target: "/api/elsewhere" } } })).toContain("search.clear_recents: call.target");
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
  test("MEDIA-BOOKS-01: Reader binds its own rows and checks both actions and field paths", () => {
    const page = JSON.parse(readFileSync(join(import.meta.dir, "../../ui/pages/books-reader.json"), "utf-8"));
    const contributes = { pages: [{ id: "index", module: "reader" }], data: [{ id: "item", rows: "list" }] };
    expect(checkAppPackage("books", contributes, () => page)).toEqual([]);
    const changed = (props: Record<string, unknown>) => () => ({ ...page, body: [{ ...page.body[0], ...props }] });
    expect(checkAppPackage("books", contributes, changed({ bind: { source: "route", path: "/api/books" } })).join("\n")).toContain('bind.source must be "package"');
    expect(checkAppPackage("books", { ...contributes, data: [{ id: "item" }] }, () => page).join("\n")).toContain('must be a "rows": "list" entry');
    expect(checkAppPackage("books", contributes, changed({ on_locator: { call: { target: "/api/media/progress" } } })).join("\n")).toContain("reader.on_locator: call.target");
    expect(checkAppPackage("books", contributes, changed({ on_close: { navigate: { to: "/apps/videos/" } } })).join("\n")).toContain("reader.on_close: navigate.to");
    expect(checkAppPackage("books", contributes, changed({ on_locator: { play: { media_id: "{id}" } } })).join("\n")).toContain("reader.on_locator: the play action is not available");
    expect(checkAppPackage("books", contributes, changed({ fields: { locator: "//example.com/book" } })).join("\n")).toContain("locator must be a field path");
  });
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

describe("the media page polish (MEDIA-POLISH-01)", () => {
  const pageDir = join(import.meta.dir, "..", "..", "ui", "pages");
  const video = (name: string) => JSON.parse(readFileSync(join(pageDir, `videos-${name}.json`), "utf-8"));
  const videoContributes: AppContributes = {
    pages: [
      { id: "index", label: "Videos", nav: true, kind: "schema", module: "home" },
      { id: "watch", label: "Watch", nav: false, kind: "schema", module: "watch" },
    ],
    data: [{ id: "featured", rows: "list" }, { id: "continue", rows: "list" }, { id: "item", rows: "list" }],
  };
  const swap = (body: unknown[]) => (m: string) => (m === "watch" ? { type: "page", id: "watch", title: "Watch", body } : video(m));
  const shelf = { type: "media_shelf", bind: { source: "package", path: "continue" }, item_key_field: "id", item_label_field: "t", item_media_field: "m" };

  test("a split_view with main and aside is allowed on a package page (the watch fixture)", () => {
    expect(checkAppPackage("videos", videoContributes, video, "child")).toEqual([]);
  });
  test("a split_view's children are checked like any other node", () => {
    const foreign = [{ type: "split_view", main: [{ ...shelf, bind: { source: "route", path: "/api/media" } }], aside: [shelf] }];
    expect(checkAppPackage("videos", videoContributes, swap(foreign), "child").join("\n")).toContain("split_view.main[0] media_shelf: bind.source must be \"package\"");
    const widget = [{ type: "split_view", main: [shelf], aside: [{ type: "widget_card", bind: { source: "route", path: "/api/widgets" } }] }];
    expect(checkAppPackage("videos", videoContributes, swap(widget), "child").join("\n")).toContain('node type "widget_card" is not allowed');
  });
  test("a shelf's See all and a player's actions stay inside the app", () => {
    const seeAll = [{ ...shelf, see_all: { label: "See all", action: { navigate: { to: "/apps/news" } } } }];
    expect(checkAppPackage("videos", videoContributes, swap(seeAll), "child").join("\n")).toContain("media_shelf.see_all: navigate.to");
    const actions = [{ type: "player", bind: { source: "package", path: "item" }, actions: [{ label: "Like", action: { call: { target: "/api/media/like" } } }] }];
    expect(checkAppPackage("videos", videoContributes, swap(actions), "child").join("\n")).toContain("player.actions[0]: call.target");
    const play = [{ type: "player", bind: { source: "package", path: "item" }, actions: [{ label: "Play", action: { play: { media_id: "{id}" } } }] }];
    expect(checkAppPackage("videos", videoContributes, swap(play), "child").join("\n")).toContain("player.actions[0]: the play action is not available");
  });
});

describe("contributes.sidebar (NEWS-SIDEBAR-01)", () => {
  const withData = (): AppContributes => ({
    pages: [
      { id: "index", label: "Today", nav: true, kind: "schema", module: "forecast" },
      { id: "saved", label: "Saved", nav: true, kind: "schema", module: "forecast" },
      { id: "channel", label: "Channel", nav: false, kind: "schema", module: "forecast" },
      { id: "search", label: "Search", nav: false, kind: "schema", module: "forecast" },
    ],
    data: [{ id: "topics", rows: "list" }, { id: "recents", rows: "list" }, { id: "forecast" }],
  });
  const open = { navigate: { to: "/apps/weather/channel", state: { kind: "topic", key: "{key}" } } };
  const sidebar = {
    search: { type: "search", state: "q", placeholder: "Search", recents: { source: "package", path: "recents" }, submit: { navigate: { to: "/apps/weather/search", state: { q: "{q}" } } } },
    groups: [
      { id: "library", pages: ["index", "saved"] },
      { id: "topics", title: "Topics", rows: { bind: { source: "package", path: "topics" }, item_media_field: "icon", open, manage: { label: "Manage", open: { navigate: { to: "/apps/weather/saved" } } } } },
    ],
  };
  const problems = (side: unknown): string => checkAppPackage("weather", { ...withData(), sidebar: side as never }, load).join("\n");

  test("a sidebar that lands on this package parses and passes the lint", () => {
    expect(() => PackageManifest.parse({ ...BASE, contributes: { ...withData(), sidebar } })).not.toThrow();
    expect(problems(sidebar)).toBe("");
  });
  test("its search, rows and actions go through the page checks, so a bad binding or recents is named", () => {
    expect(problems({ ...sidebar, search: { ...sidebar.search, recents: { source: "package", path: "forecast" } } })).toContain("returns blocks, not rows");
    expect(problems({ ...sidebar, search: { type: "list" } })).toContain("search must be a search node");
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "missing" }, open } }] })).toContain('bind.path "missing" is not a contributes.data id');
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "forecast" }, open } }] })).toContain('must be a "rows": "list" entry');
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "route", path: "/x" }, open } }] })).toContain('bind.source must be "package"');
  });
  test("every navigate target is a page of this package and stays inside the app", () => {
    expect(problems({ ...sidebar, search: { ...sidebar.search, submit: { navigate: { to: "/apps/weather/nowhere" } } } })).toContain('names page "nowhere"');
    expect(problems({ groups: [{ id: "g", pages: ["ghost"] }] })).toContain('names page "ghost"');
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "topics" }, open: { navigate: { to: "/apps/other/channel" } } } }] })).toContain("must stay under /apps/weather");
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "topics" }, open: { navigate: { to: "/apps/weather/channel" } }, manage: { label: "M", open: { navigate: { to: "/apps/weather/gone" } } } } }] })).toContain('names page "gone"');
  });
  test("a {field} placeholder must name a field the group declares", () => {
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "topics" }, open: { navigate: { to: "/apps/weather/channel", state: { key: "{slug}" } } } } }] })).toContain("placeholder {slug} names a field the group does not declare");
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "topics" }, item_key_field: "slug", open: { navigate: { to: "/apps/weather/channel", state: { key: "{slug}" } } } } }] })).toBe("");
  });
  test("a group has exactly one of pages and rows, and an id once; a picture field is a path, never an address", () => {
    expect(problems({ groups: [{ id: "g" }] })).toContain("exactly one of pages and rows");
    expect(problems({ groups: [{ id: "g", pages: ["index"] }, { id: "g", pages: ["saved"] }] })).toContain("declared twice");
    expect(problems({ groups: [{ id: "g", rows: { bind: { source: "package", path: "topics" }, item_media_field: "https://example.com/a.png", open } }] })).toContain("must be a field path");
  });
  test("the schema refuses an unknown key, no groups, a bad id and a row group with no target (both-or-neither of pages and rows is the lint's)", () => {
    for (const bad of [{ ...sidebar, extra: 1 }, { groups: [] }, { groups: [{ id: "Bad Id", pages: ["index"] }] }, { groups: [{ id: "g", rows: { bind: {} } }] }, { groups: [{ id: "g", rows: { bind: {}, open: {}, unknown: 1 } }] }]) {
      expect(() => PackageManifest.parse({ ...BASE, contributes: { ...withData(), sidebar: bad } })).toThrow();
    }
  });
});
