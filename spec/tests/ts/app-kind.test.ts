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
  test("a data entry refuses an unknown surface and an unknown field", () => {
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "forecast", surface: "moon" }] } })).toThrow();
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "forecast", url: "https://example.com" }] } })).toThrow();
    expect(() => PackageManifest.parse({ ...BASE, contributes: { data: [{ id: "Forecast" }] } })).toThrow();
  });
});

describe("checkAppPackage (the cross-file lint)", () => {
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
    const list = { type: "page", id: "x", title: "X", body: [{ type: "list", bind: { source: "route", path: "/api/people" }, item_key_field: "id", item_label_field: "n" }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? list : load(m))).join("\n")).toContain('node type "list" is not allowed');
  });
  test("an action must stay under the package's own prefixes", () => {
    const action = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t", action: { call: { target: "/api/people/1", method: "DELETE" } } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? action : load(m))).join("\n")).toContain("must stay under /api/plugins/weather/");
    const nav = { type: "page", id: "x", title: "X", body: [{ type: "empty_state", icon: "x", text: "t", action: { navigate: { to: "/settings" } } }] };
    expect(checkAppPackage("weather", contributes, (m) => (m === "weather" ? nav : load(m))).join("\n")).toContain("must stay under /apps/weather");
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
