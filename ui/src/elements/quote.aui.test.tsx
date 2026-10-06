import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useAui,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import {
  ComposerQuotePreview,
  QuoteBlock,
  SelectionToolbar,
} from "./quote.aui";

afterEach(cleanup);

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ children }: { children: React.ReactNode }) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
  );
}

function SetQuote({ text }: { text: string }) {
  const aui = useAui();
  return (
    <button type="button" onClick={() => aui.thread().composer().setQuote({ text, messageId: "m1" })}>
      set
    </button>
  );
}

describe("quote", () => {
  test("a quote set on the composer shows in the preview and the dismiss button clears it", async () => {
    const view = render(
      <Harness>
        <SetQuote text="the part worth keeping" />
        <ComposerPrimitive.Root>
          <ComposerQuotePreview dismissLabel="Drop the quote" />
        </ComposerPrimitive.Root>
      </Harness>,
    );
    expect(view.container.querySelector("[data-slot='composer-quote']")).toBeNull();
    fireEvent.click(view.getByText("set"));
    await waitFor(() => expect(view.getByText("the part worth keeping")).toBeTruthy());
    fireEvent.click(view.getByRole("button", { name: "Drop the quote" }));
    await waitFor(() => expect(view.container.querySelector("[data-slot='composer-quote']")).toBeNull());
  });

  test("selecting text inside a message and pressing the toolbar button lands it in the preview", async () => {
    const view = render(
      <Harness>
        <div data-message-id="m1">
          <p id="body">Quote this sentence.</p>
        </div>
        <SelectionToolbar />
        <ComposerPrimitive.Root>
          <ComposerQuotePreview />
        </ComposerPrimitive.Root>
      </Harness>,
    );
    const text = view.container.querySelector("#body")!.firstChild!;
    const range = document.createRange();
    range.selectNodeContents(text);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    act(() => {
      fireEvent.mouseUp(document);
    });
    const button = await waitFor(() => view.getByRole("button", { name: /Quote/ }));
    fireEvent.click(button);
    await waitFor(() =>
      expect(view.container.querySelector("[data-slot='composer-quote-text']")?.textContent).toBe("Quote this sentence."),
    );
  });

  test("QuoteBlock draws the quoted words", () => {
    const view = render(
      <Harness>
        <QuoteBlock text="said earlier" messageId="m0" />
      </Harness>,
    );
    expect(view.getByText("said earlier")).toBeTruthy();
    expect(view.container.querySelector("[data-slot='quote-block-text']")).toBeTruthy();
  });
});
