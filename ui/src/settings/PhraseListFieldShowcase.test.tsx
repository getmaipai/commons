import { expect, test, afterEach } from "bun:test";
import { render, cleanup } from "@testing-library/react";
import { PhraseListFieldShowcase } from "@/kit/settings/PhraseListFieldShowcase";

afterEach(cleanup);

test("the story draws the three lists", () => {
  const r = render(<PhraseListFieldShowcase />);
  expect(r.getByRole("group", { name: "Trigger words" })).toBeTruthy();
  expect(r.getByRole("group", { name: "Also add" })).toBeTruthy();
  expect(r.getByRole("group", { name: "Avoid and say instead" })).toBeTruthy();
});
