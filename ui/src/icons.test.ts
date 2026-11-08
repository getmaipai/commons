import { expect, test } from "bun:test";
import { getIcon, iconNames, icons, type IconName } from "@/kit/icons";

test("the Network and access area icon resolves from the kit registry", () => {
  expect(iconNames).toContain("network");
  expect(getIcon("network")).toBe(icons.network);
});

test("equalizer icon is registered for the visualizer menu", () => {
  expect(getIcon("equalizer")).toBe(icons.equalizer);
  expect(iconNames).toContain("equalizer");
});

test("the weather advice icons are registered", () => {
  for (const name of ["umbrella", "shirt", "glasses", "snowflake", "wind", "footprints", "tree-pine", "cloud-rain", "sun"]) expect((iconNames as readonly string[]).includes(name)).toBe(true);
});

test("the music header icons are registered: shuffle and radio (MUSIC-POLISH-01)", () => {
  for (const name of ["shuffle", "radio"]) expect((iconNames as readonly string[]).includes(name)).toBe(true);
  expect(getIcon("shuffle")).toBe(icons.shuffle);
});

test("the key icon name Home asks for resolves to its own icon, not the unknown-name fallback", () => {
  expect(iconNames).toContain("key");
  expect(getIcon("key")).toBe(icons.key);
  expect(icons.key).not.toBe(icons["key-round"]);
});

test("PRO-LOOK icon names resolve through the registry", () => {
  const names = ["menu", "house", "message-circle", "play", "library", "users", "search", "music", "music-2", "heart", "shuffle", "ellipsis", "ellipsis-vertical", "share", "chevron-left", "chevron-right", "cloud-rain", "settings", "mic", "arrow-up", "arrow-up-right", "plus", "newspaper", "clapperboard", "folder", "sparkles", "wand-sparkles", "bell", "film", "image", "pause", "skip-forward", "skip-back", "panel-left", "paperclip", "layers", "tv", "lock", "list-music", "grid-2x2", "sliders-horizontal", "book-open", "clock", "sun", "download", "list-plus", "star", "square-pen", "headphones", "compass", "bookmark", "circle-alert"];
  for (const name of names) {
    expect(getIcon(name), name).toBe(icons[name as IconName]);
    expect((iconNames as readonly string[])).toContain(name);
  }
});
