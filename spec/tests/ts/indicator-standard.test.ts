import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const text = readFileSync(new URL("../../indicator/indicator-standard.md", import.meta.url), "utf8");

function table(heading: string): string[][] {
  const section = text.split(`## ${heading}`)[1]?.split("\n## ")[0] ?? "";
  return section
    .split("\n")
    .filter((l) => l.startsWith("|") && !l.startsWith("|---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim().replace(/`/g, "")))
    .filter((cells) => cells[0] !== "Key" && cells[0] !== "Token");
}

const ring = table("The ring table");
const palette = table("The palette");
const priority = (text.split("## Priority")[1]?.split("\n## ")[0] ?? "").trim().replace(/\.$/, "").split(",").map((s) => s.trim().toLowerCase());

test("the ring rows are listed in priority order", () => {
  expect(ring.map((r) => r[0])).toEqual(priority);
});

test("each status row has the colour the palette gives it", () => {
  const colourOf: Record<string, string> = Object.fromEntries(ring.map((r) => [r[0], r[2]]));
  const named: Record<string, string> = { "00FF1A": "green", "00E6FF": "cyan", FFFFE6: "white", "7300FF": "violet", FFD600: "yellow", FF408C: "pink", FF7300: "amber" };
  for (const [token, hex, row] of palette) {
    if (row === "none") continue;
    expect(colourOf[row], `${token} -> ${row}`).toBe(named[hex]);
  }
});

test("listening is green, speaking cyan, thinking white, getting data violet", () => {
  const c = Object.fromEntries(ring.map((r) => [r[0], r[2]]));
  expect(c).toMatchObject({ listening: "green", speaking: "cyan", thinking: "white", getting_data: "violet", attention: "amber", camera: "pink" });
  expect(c.face_seen).not.toBe("blue");
  expect(c.face_seen).not.toBe("red");
});

test("no ring row is red or blue, and red is only the dot down", () => {
  for (const r of ring) expect(["red", "blue"]).not.toContain(r[2]);
  const reds = palette.filter(([, hex]) => {
    const [rr, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return rr > 150 && g < 100 && b < 100;
  });
  expect(reds.map((p) => p[0])).toEqual(["down"]);
  expect(palette.find((p) => p[0] === "down")?.[2]).toBe("none");
});

test("every palette ring row exists in the ring table and each hex is unique per meaning except the healthy dot", () => {
  const keys = new Set(ring.map((r) => r[0]));
  for (const p of palette) if (p[2] !== "none") expect(keys.has(p[2])).toBe(true);
  const hexes = palette.filter((p) => p[0] !== "healthy").map((p) => p[1]);
  expect(new Set(hexes).size).toBe(hexes.length);
});
