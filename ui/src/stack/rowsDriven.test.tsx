// STACK-MODELS-PAGE-01. The models page reads icon and description from the category row (StackChoiceCategory), not from kit-side maps:
// the sheet shows the row's description, and StackParts.tsx and stackWords.ts no longer carry CATEGORY_ICON or categoryBlurb.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach } from "bun:test";
import { StackModelsPage } from "./StackModelsPage";
import { createFakeStackClient } from "./fakeStackClient";

afterEach(cleanup);

const screen = within(document.body);
const click = (element: HTMLElement) => act(async () => { fireEvent.click(element); });

describe("rows-driven category icon and description", () => {
  test("the details sheet shows the description carried by the category row", async () => {
    render(<StackModelsPage client={createFakeStackClient()} pollMs={0} />);
    await screen.findByText("Qwen3 8B");
    const card = screen.getByTestId("feature-chat");
    await click(within(card).getByRole("button", { name: /Chat/ }));
    const sheet = await screen.findByRole("dialog");
    expect(sheet.textContent).toContain("Talks, writes and answers questions.");
  });

  test("StackParts.tsx and stackWords.ts carry neither CATEGORY_ICON nor categoryBlurb", () => {
    for (const file of ["StackParts.tsx", "stackWords.ts"]) {
      const source = readFileSync(join(import.meta.dir, file), "utf8");
      expect(source.includes("CATEGORY_ICON"), `${file} mentions CATEGORY_ICON`).toBe(false);
      expect(source.includes("categoryBlurb"), `${file} mentions categoryBlurb`).toBe(false);
    }
  });
});
