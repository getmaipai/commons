// WEATHER-PANE-01: with stage="top" the sun, moon and clouds are placed against a stage height that scales with the pane width
// (--wx-stage), not against the whole sky height, so they stay in the top area behind the hero.
import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { WeatherSky } from "./weather-sky";

afterEach(cleanup);
const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const rule = (selector: string) => { const start = css.indexOf(`${selector} {`); expect(start).toBeGreaterThan(-1); return css.slice(start, css.indexOf("}", start)); };
const stage = '[data-slot="weather-sky"][data-stage="top"]';

test("the stage variable is the pane-width clamp capped by the sky height and uses no viewport units", () => {
  const body = rule(stage);
  expect(body).toContain("--wx-stage:");
  expect(body).toContain("clamp(300px, 40cqw, 420px)");
  expect(body).toContain("100cqh");
  expect(body).not.toMatch(/\d(vh|svh|dvh)/);
});

test("the sun and the moon are placed in the stage", () => {
  const sun = rule(`${stage} [data-fx="sun-group"]`);
  expect(sun).toContain("var(--wx-light-yn)"); expect(sun).toContain("var(--wx-stage)");
  const moon = rule(`${stage} [data-fx="moon-group"]`);
  expect(moon).toContain("var(--wx-moon-yn)"); expect(moon).toContain("var(--wx-stage)");
  const glow = rule(`${stage} .weather-sky-glow`);
  expect(glow).toContain("var(--wx-light-yn"); expect(glow).toContain("var(--wx-stage)");
});

test("the clouds are placed in the stage", () => {
  const cloud = rule(`${stage} [data-fx="cloud"]`);
  expect(cloud).toContain("var(--y)"); expect(cloud).toContain("var(--wx-stage)");
  expect(cloud).toContain("max(0px,"); // a tall near cloud is never pushed above the top of the pane
});

test("the sky marks the stage and carries the unitless light and moon heights", () => {
  const on = render(<WeatherSky cls="clear" isDay={true} stage="top" />);
  const sky = on.container.querySelector<HTMLElement>('[data-slot="weather-sky"]')!;
  expect(sky.getAttribute("data-stage")).toBe("top");
  expect(Number(sky.style.getPropertyValue("--wx-light-yn"))).toBeGreaterThanOrEqual(40);
  expect(Number(sky.style.getPropertyValue("--wx-moon-yn"))).toBeGreaterThanOrEqual(12);
  expect(sky.style.getPropertyValue("--wx-light-y")).toMatch(/%$/);
  on.unmount();
  const off = render(<WeatherSky cls="clear" isDay={true} />);
  expect(off.container.querySelector('[data-slot="weather-sky"]')!.hasAttribute("data-stage")).toBe(false);
});
