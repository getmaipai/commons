// CHAT-RICH-01: markdown-text.tsx wires shiki, mermaid and math into
// MarkdownTextPrimitive's own componentsByLanguage/SyntaxHighlighter
// slots (assistant-ui's documented shape) - these confirm the wiring
// reaches real rendered output, the same scripted-adapter harness
// thread.aui.test.tsx already uses for a real run through the real
// composer/thread, not a mocked recall() of markdown-text's own props.
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "./thread.aui";

afterEach(cleanup);

function scriptedAdapter(reply: string): ChatModelAdapter {
  return {
    async *run() {
      yield { content: [{ type: "text", text: reply }] };
    },
  };
}

function Harness({ reply }: { reply: string }) {
  const runtime = useLocalRuntime(scriptedAdapter(reply));
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

async function sendAndSettle(container: HTMLElement, getByRole: (role: string, opts: { name: string }) => HTMLElement) {
  fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "hi" } });
  fireEvent.click(getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(container.querySelector(".aui-md")).toBeTruthy());
}

describe("markdown-text.tsx: rich content wiring (CHAT-RICH-01)", () => {
  test("a fenced typescript block renders through the shiki SyntaxHighlighter, not a plain <pre>", async () => {
    const reply = "```typescript\nconst x: number = 1;\n```";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    // CHAT-RICH-02: shiki is lazy now - the Suspense fallback (a plain
    // PendingCodeBlock) renders first, so this waits for its own chunk.
    const highlighted = await waitFor(() => {
      const el = container.querySelector(".aui-shiki-base");
      expect(el).toBeTruthy();
      return el;
    });
    expect(highlighted?.querySelector("code")).toBeTruthy();
  });

  test("a fenced mermaid block renders as a diagram, not a code block", async () => {
    const reply = "```mermaid\ngraph TD\nA-->B\n```";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    // CHAT-RICH-02: mermaid is lazy now - same Suspense wait as shiki above.
    await waitFor(() => expect(container.querySelector('[data-slot="mermaid-diagram"]')).toBeTruthy());
    expect(container.querySelector(".aui-shiki-base")).toBeNull();
  });

  test("inline math delimiters render through KaTeX", async () => {
    const reply = "the answer is $x^2$ for any x";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    // CHAT-RICH-02: remark-math/rehype-katex load only once MATH_HINT
    // matches this message's own text, so the first render has no
    // katex output at all - wait for the dynamic import to resolve.
    await waitFor(() => expect(container.querySelector(".katex")).toBeTruthy());
  });

  test("a currency amount is never eaten as math", async () => {
    const reply = "it costs $5 and $7 for the pair";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$5");
    expect(container.textContent).toContain("$7");
  });

  test("an inline link never opens in the current tab", async () => {
    const reply = "see [this site](https://example.com/page) for more";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    const link = container.querySelector('a[href="https://example.com/page"]');
    expect(link).not.toBeNull();
    expect(link!.getAttribute("target")).toBe("_blank");
    expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link!.getAttribute("referrerpolicy")).toBe("no-referrer");
  });
});
