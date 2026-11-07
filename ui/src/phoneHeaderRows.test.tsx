import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import articleBlock from "@maipai/spec/fixtures/answer-block/valid-article.json";
import { ArticleView, type ArticleViewData } from "@/kit/primitives/ArticleView";

afterEach(cleanup);

const data = articleBlock.props as unknown as ArticleViewData;

describe("phone header rows", () => {
  test("keeps Back and actions in the controls row with the long title in its own provider row", () => {
    const { container, getByRole } = render(
      <ArticleView data={data} onBack={() => {}} available={["save"]} onAction={() => {}} />,
    );
    const toolbar = container.querySelector('[data-slot="article-toolbar"]')!;
    const back = getByRole("button", { name: "Back" });
    const actions = container.querySelector('[data-slot="article-actions"]')!;
    const textSize = container.querySelector('[data-slot="article-actions"] [aria-label="Reading settings"]')!;
    const save = getByRole("button", { name: "Save" });
    const provider = container.querySelector('[data-slot="article-provider"]')!;

    expect(toolbar.contains(back)).toBe(true);
    expect(actions.contains(textSize)).toBe(true);
    expect(actions.contains(save)).toBe(true);
    expect(back.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(toolbar.querySelector('[data-slot="article-toolbar-title"]')).toBeNull();
    expect(provider.querySelector('[data-slot="article-provider-label"]')?.textContent).toBe(data.byline?.publisher);
    expect(container.querySelector('[data-slot="article-title"]')?.textContent).toBe(data.title);
  });
});
