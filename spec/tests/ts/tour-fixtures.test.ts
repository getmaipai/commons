import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { validateTour } from "../../scripts/tour-validator.js";
import { TourProgress } from "../../gen/ts/tour-progress.js";

const DIR = join(import.meta.dir, "..", "..", "fixtures", "tour");
describe("tour fixtures", () => {
  for (const file of readdirSync(DIR).filter((name) => name.endsWith(".json")).sort()) {
    const accept = file.startsWith("valid-");
    test(`${file}: ${accept ? "is accepted" : "is rejected"}`, () => {
      const tour = JSON.parse(readFileSync(join(DIR, file), "utf8"));
      expect(validateTour(tour).length === 0).toBe(accept);
    });
  }
});

test("a child privacy step requires kid wording", () => {
  const tour = JSON.parse(readFileSync(join(DIR, "invalid-child-privacy-without-wording.json"), "utf8"));
  expect(validateTour(tour).some((error) => error.includes("body_by_audience.child"))).toBe(true);
});

test("hero_slide ids are checked when Home supplies its hero slide catalog", () => {
  const tour = JSON.parse(readFileSync(join(DIR, "valid-centered-without-target.json"), "utf8"));
  delete tour.steps[0].title;
  delete tour.steps[0].body;
  tour.steps[0].hero_slide = "hero.privacy";
  expect(validateTour(tour, new Set(["hero.privacy"]))).toEqual([]);
  expect(validateTour(tour, new Set(["hero.other"])).some((error) => error.includes("existing hero slide"))).toBe(true);
});

test("tour progress record carries provenance and the HLC clock stamp", () => {
  const value = JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "tour-progress", "valid-completed.json"), "utf8"));
  expect(TourProgress.parse(value).status).toBe("completed");
});
