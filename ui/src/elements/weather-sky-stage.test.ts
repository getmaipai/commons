// WEATHER-PANE-01: the sun, moon and clouds of a tall sky sit in a "stage" at the top, sized by the pane's width (not the viewport),
// so they stay behind the hero and are not hidden behind the tiles.
import { expect, test } from "bun:test";
import scene from "./weather-scene.json";
import { skyStageHeight } from "./weather-scene";

test("the stage constants are 300 to 420 px, 40 percent of the pane width", () => {
  expect(scene.stage).toEqual({ min: 300, cqw: 40, max: 420 });
});

test("the stage height scales with the pane width and never exceeds the pane height", () => {
  expect(skyStageHeight(1022, 900)).toBeCloseTo(408.8, 1);
  expect(skyStageHeight(2000, 1200)).toBe(420);
  expect(skyStageHeight(360, 900)).toBe(300);
  expect(skyStageHeight(1000, 260)).toBe(260);
  expect(skyStageHeight(0, 0)).toBe(0);
});

test("on a 1022 by 900 pane the lowest sun, the day sun and every cloud band sit in the top 460 px", () => {
  const stage = skyStageHeight(1022, 900);
  const sunDay = stage * 40 / 100;
  const sunTwilight = stage * scene.sun.twilightY / 100;
  expect(sunDay).toBeLessThanOrEqual(180);
  expect(sunTwilight).toBeLessThanOrEqual(300);
  for (const depth of Object.values(scene.clouds.depths)) expect(stage * (depth.y[1] ?? 0) / 100).toBeLessThanOrEqual(460);
});
