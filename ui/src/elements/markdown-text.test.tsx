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

    const highlighted = container.querySelector(".aui-shiki-base");
    expect(highlighted).toBeTruthy();
    expect(highlighted?.querySelector("code")).toBeTruthy();
  });

  test("a fenced mermaid block renders as a diagram, not a code block", async () => {
    const reply = "```mermaid\ngraph TD\nA-->B\n```";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    expect(container.querySelector('[data-slot="mermaid-diagram"]')).toBeTruthy();
    expect(container.querySelector(".aui-shiki-base")).toBeNull();
  });

  test("inline math delimiters render through KaTeX", async () => {
    const reply = "the answer is $x^2$ for any x";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    expect(container.querySelector(".katex")).toBeTruthy();
  });

  test("a currency amount is never eaten as math", async () => {
    const reply = "it costs $5 and $7 for the pair";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    expect(container.querySelector(".katex")).toBeNull();
    expect(container.textContent).toContain("$5");
    expect(container.textContent).toContain("$7");
  });
});
