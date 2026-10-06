import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, MessagePrimitive, useAuiState, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread, type ThreadViewportOptions } from "./thread.aui";

afterEach(cleanup);

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  targets: Element[] = [];
  constructor(readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this);
  }
  observe(target: Element) { this.targets.push(target); }
  unobserve() {}
  disconnect() {}
}

// A no-op adapter - these tests exercise the composer's own slot wiring,
// never a real turn.
const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ composerDensity, ComposerQueue, ComposerInputOverride, ComposerNotice, MessageError, sendHeld, temporary, viewport, error = false, scrollToBottomOffset, runAdapter }: { composerDensity?: "compact"; ComposerQueue?: React.ComponentType; ComposerInputOverride?: React.ComponentType; ComposerNotice?: React.ComponentType; MessageError?: React.ComponentType; sendHeld?: boolean; temporary?: boolean; viewport?: ThreadViewportOptions; error?: boolean; scrollToBottomOffset?: number; runAdapter?: ChatModelAdapter }) {
  const runtime = useLocalRuntime(runAdapter ?? (error ? failingAdapter : adapter));
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={composerDensity || ComposerQueue || ComposerInputOverride || ComposerNotice || MessageError || viewport || sendHeld !== undefined ? { composerDensity, ComposerQueue, ComposerInputOverride, ComposerNotice, MessageError, viewport, sendHeld } : undefined} temporary={temporary} scrollToBottomOffset={scrollToBottomOffset} />
    </AssistantRuntimeProvider>
  );
}

const failingAdapter: ChatModelAdapter = {
  async *run() {
    throw new Error("test failure");
  },
};

async function sendFailingTurn(getByRole: (role: string, opts: { name: string }) => HTMLElement) {
  fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "hi" } });
  fireEvent.click(getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(document.querySelector(".aui-message-error-root") || document.querySelector("[data-testid='message-error-slot']")).toBeTruthy());
}

describe("Thread's MessageError slot", () => {
  test("a MessageError slot replaces the default error block", async () => {
    function CustomMessageError() {
      return <MessagePrimitive.Error><div data-testid="message-error-slot">Custom failure</div></MessagePrimitive.Error>;
    }
    const { getByRole, getByTestId, queryByText } = render(<Harness MessageError={CustomMessageError} error />);
    await sendFailingTurn(getByRole);
    expect(getByTestId("message-error-slot").textContent).toBe("Custom failure");
    expect(queryByText("test failure")).toBeNull();
    expect(document.querySelector(".aui-message-error-root")).toBeNull();
  });

  test("the default error block still renders with no slot set", async () => {
    const { getByRole, findByText } = render(<Harness error />);
    await sendFailingTurn(getByRole);
    expect(await findByText("test failure")).toBeTruthy();
    expect(document.querySelector(".aui-message-error-root")).toBeTruthy();
  });
});

describe("Thread's ComposerInputOverride slot", () => {
  test("with no override, the built-in composer input renders", () => {
    const { getByRole } = render(<Harness />);
    expect(getByRole("textbox", { name: "Message input" })).toBeTruthy();
  });

  test("with an override, it fully replaces the built-in input - never rendered alongside it", () => {
    function Waveform() {
      return <div data-testid="fake-waveform">bars</div>;
    }
    const { getByTestId, queryByRole } = render(<Harness ComposerInputOverride={Waveform} />);
    expect(getByTestId("fake-waveform")).toBeTruthy();
    expect(queryByRole("textbox", { name: "Message input" })).toBeNull();
  });
});

describe("Thread's ComposerNotice slot", () => {
  test("renders a one-line muted notice directly beneath the composer shell", () => {
    function Notice() {
      return <span>Lookup unavailable; you can still send your message.</span>;
    }
    const { getByText } = render(<Harness ComposerNotice={Notice} />);
    const slot = getByText("Lookup unavailable; you can still send your message.");
    const wrapper = slot.closest("[data-slot='aui_composer-notice']");
    const shell = document.querySelector("[data-slot='aui_composer-shell']");
    expect(wrapper).toBeTruthy();
    expect(wrapper?.className).toContain("text-muted-foreground");
    expect(wrapper?.className).toContain("truncate");
    expect(shell?.nextElementSibling).toBe(wrapper);
  });

  test("renders nothing when unset", () => {
    render(<Harness />);
    expect(document.querySelector("[data-slot='aui_composer-notice']")).toBeNull();
  });
});

describe("Thread's sendHeld option", () => {
  function countingAdapter() {
    const calls: number[] = [];
    const runAdapter: ChatModelAdapter = {
      async *run() {
        calls.push(1);
        yield { content: [] };
      },
    };
    return { calls, runAdapter };
  }

  test("while held, a person can still type but Send is disabled and Enter sends nothing", async () => {
    const { calls, runAdapter } = countingAdapter();
    const { getByRole } = render(<Harness sendHeld runAdapter={runAdapter} />);
    const input = getByRole("textbox", { name: "Message input" }) as HTMLTextAreaElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: "hello" } });
    expect(input.value).toBe("hello");
    const send = getByRole("button", { name: "Send message" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(send);
    fireEvent.keyDown(input, { key: "Enter" });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls.length).toBe(0);
    expect(input.value).toBe("hello");
  });

  test("not held, the same text sends", async () => {
    const { calls, runAdapter } = countingAdapter();
    const { getByRole } = render(<Harness sendHeld={false} runAdapter={runAdapter} />);
    fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "hello" } });
    const send = getByRole("button", { name: "Send message" }) as HTMLButtonElement;
    expect(send.disabled).toBe(false);
    fireEvent.click(send);
    await waitFor(() => expect(calls.length).toBe(1));
  });
});

// Screen finding: typing the first character into a new chat shifted
// the whole welcome block (heading and composer both) down by 8px.
// Root cause: the suggestions row used to unmount the instant the
// composer stopped being empty, removing its own `gap-4` unit from the
// vertically-centered welcome block, so the whole block re-centered
// and dropped. happy-dom computes no real layout (this file's own
// established reason a pixel claim always lives in a real headless
// Playwright capture instead), so this proves only the DOM-structure
// half of the fix - the row staying mounted, only its visibility
// toggling - which is what the real headless pixel check depends on.
describe("Thread's new-chat suggestions row", () => {
  test("stays mounted once the composer has text - visibility toggles, not presence", () => {
    const { getByRole, container } = render(<Harness />);
    const row = () => container.querySelector(".aui-thread-welcome-suggestions");

    expect(row()).toBeTruthy();
    expect(row()?.className).not.toContain("invisible");

    fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "h" } });

    expect(row()).toBeTruthy();
    expect(row()?.className).toContain("invisible");
  });

  test("becomes visible again once the composer is cleared back to empty", () => {
    const { getByRole, container } = render(<Harness />);
    const textbox = getByRole("textbox", { name: "Message input" });
    const row = () => container.querySelector(".aui-thread-welcome-suggestions");

    fireEvent.change(textbox, { target: { value: "h" } });
    expect(row()?.className).toContain("invisible");

    fireEvent.change(textbox, { target: { value: "" } });
    expect(row()?.className).not.toContain("invisible");
  });
});

// CHAT-WELCOME-01: the caller's own temporary/incognito mode tints the
// composer so the one place someone types is visibly different from an
// ordinary, saved conversation - `--composer-bg` is the one lever
// `Composer`'s own shell already reads, so this proves the root sets a
// genuinely different value, not that any real color renders (happy-dom
// computes no real layout or paint).
describe("Thread's temporary prop", () => {
  test("tints --composer-bg when armed, distinct from the ordinary value", () => {
    const { container: ordinary } = render(<Harness />);
    const { container: armed } = render(<Harness temporary />);
    const ordinaryBg = ordinary.querySelector(".aui-thread-root")?.getAttribute("style");
    const armedBg = armed.querySelector(".aui-thread-root")?.getAttribute("style");
    expect(armedBg).toContain("--color-primary");
    expect(armedBg).not.toBe(ordinaryBg);
  });
});

describe("Thread's viewport options", () => {
  test("accepts assistant-ui bottom-follow settings through the components field", () => {
    const { container } = render(<Harness viewport={{
      turnAnchor: "bottom",
      autoScroll: true,
      scrollToBottomOnRunStart: true,
      scrollToBottomOnInitialize: true,
      scrollToBottomOnThreadSwitch: true,
    }} />);
    expect(container.querySelector('[data-slot="aui_thread-viewport"]')).toBeTruthy();
  });
});

describe("Thread scroll geometry", () => {
  test("accepts an offset for the scroll-to-bottom button while extras are open", () => {
    const { container } = render(<Harness scrollToBottomOffset={56} />);
    expect(container.querySelector(".aui-thread-root")?.getAttribute("style"))
      .toContain("--thread-scroll-to-bottom-offset: 56px");
  });

  test("reserves measured footer height plus the reading gap below messages", () => {
    const savedResizeObserver = globalThis.ResizeObserver;
    FakeResizeObserver.instances = [];
    globalThis.ResizeObserver = FakeResizeObserver as unknown as typeof ResizeObserver;
    const savedRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function () {
      return this.classList.contains("aui-thread-viewport-footer")
        ? ({ height: 112 } as DOMRect)
        : savedRect.call(this);
    };
    try {
      const { container } = render(<Harness />);
      const viewport = container.querySelector<HTMLElement>('[data-slot="aui_thread-viewport"]')!;
      const footer = container.querySelector('.aui-thread-viewport-footer')!;
      expect(viewport.style.getPropertyValue("--thread-footer-scroll-space")).toBe("128px");
      expect(container.querySelector('[data-slot="aui_message-group"]')?.getAttribute("style"))
        .toContain("--thread-footer-scroll-space");
      expect(FakeResizeObserver.instances.some((observer) => observer.targets.includes(footer))).toBe(true);
    } finally {
      HTMLElement.prototype.getBoundingClientRect = savedRect;
      globalThis.ResizeObserver = savedResizeObserver;
    }
  });
});

describe("Thread's ComposerQueue slot", () => {
  test("renders inside the viewport footer, directly above the composer shell", () => {
    function Queue() {
      return <div data-testid="queue-slot">queued</div>;
    }
    const { getByTestId } = render(<Harness ComposerQueue={Queue} />);
    const slot = getByTestId("queue-slot");
    const footer = slot.closest(".aui-thread-viewport-footer");
    const root = document.querySelector(".aui-composer-root");
    expect(footer).toBeTruthy();
    expect(footer!.contains(root)).toBe(true);
    // Outside the composer's own rounded container, and immediately before it.
    expect(root!.contains(slot)).toBe(false);
    expect(slot.closest("[data-slot='aui_composer-queue']")!.nextElementSibling).toBe(root);
  });

  test("with no slot, nothing is rendered and the footer layout is unchanged", () => {
    render(<Harness />);
    expect(document.querySelector("[data-slot='aui_composer-queue']")).toBeNull();
    const root = document.querySelector(".aui-composer-root")!;
    expect(root.previousElementSibling?.getAttribute("data-slot")).not.toBe("aui_composer-queue");
  });
});

// Two finished exchanges, so there is an assistant reply that is not the last.
const TWO_EXCHANGES = [
  { id: "u1", role: "user" as const, content: [{ type: "text" as const, text: "first question" }], createdAt: new Date("2026-10-05T09:00:00Z") },
  { id: "a1", role: "assistant" as const, content: [{ type: "text" as const, text: "first answer" }], createdAt: new Date("2026-10-05T09:00:05Z") },
  { id: "u2", role: "user" as const, content: [{ type: "text" as const, text: "second question" }], createdAt: new Date("2026-10-06T10:00:00Z") },
  { id: "a2", role: "assistant" as const, content: [{ type: "text" as const, text: "second answer" }], createdAt: new Date("2026-10-06T10:00:05Z") },
];

function SeededHarness({ components }: { components?: React.ComponentProps<typeof Thread>["components"] }) {
  const runtime = useLocalRuntime(adapter, { initialMessages: TWO_EXCHANGES });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={components} />
    </AssistantRuntimeProvider>
  );
}

const assistantRowsWithCopy = () =>
  [...document.querySelectorAll('[data-slot="aui_assistant-message-root"]')].map((root) =>
    [...root.querySelectorAll("button")].some((button) => button.textContent?.includes("Copy")));

describe("Thread's MessageBefore slot", () => {
  test("renders once before every message, inside that message's context", async () => {
    function Before() {
      const id = useAuiState((s) => s.message.id);
      return <div data-testid="before">{id}</div>;
    }
    const { findAllByTestId } = render(<SeededHarness components={{ MessageBefore: Before }} />);
    const markers = await findAllByTestId("before");
    expect(markers.map((marker) => marker.textContent)).toEqual(["u1", "a1", "u2", "a2"]);
  });

  test("unset, nothing extra renders", async () => {
    const { findByText } = render(<SeededHarness />);
    await findByText("second answer");
    expect(document.querySelector('[data-testid="before"]')).toBeNull();
  });
});

describe("Thread's assistantActionBarAutohide option", () => {
  test("the default shows the action row on the last reply only", async () => {
    const { findByText } = render(<SeededHarness />);
    await findByText("second answer");
    expect(assistantRowsWithCopy()).toEqual([false, true]);
  });

  test('"never" shows the action row under every reply, whichever is last', async () => {
    const { findByText } = render(<SeededHarness components={{ assistantActionBarAutohide: "never" }} />);
    await findByText("second answer");
    expect(assistantRowsWithCopy()).toEqual([true, true]);
  });
});

describe("Thread's composerDensity option (ELT-COMPOSER-KIT-01)", () => {
  const shell = () => document.querySelector('[data-slot="aui_composer-shell"]') as HTMLElement;

  test("unset, the composer carries no density and the stylesheet never applies", () => {
    render(<Harness />);
    expect(shell().hasAttribute("data-density")).toBe(false);
    expect(document.querySelector(".aui-thread-root")?.hasAttribute("data-density")).toBe(false);
  });

  test('"compact" marks the thread root and the composer shell', () => {
    render(<Harness composerDensity="compact" />);
    expect(shell().getAttribute("data-density")).toBe("compact");
    expect(document.querySelector(".aui-thread-root")?.getAttribute("data-density")).toBe("compact");
  });

  test("compact sets data-multiline once the text has a line break and clears it when emptied", async () => {
    const { getByRole } = render(<Harness composerDensity="compact" />);
    const input = getByRole("textbox", { name: "Message input" });
    expect(shell().hasAttribute("data-multiline")).toBe(false);
    fireEvent.change(input, { target: { value: "one line" } });
    expect(shell().hasAttribute("data-multiline")).toBe(false);
    fireEvent.change(input, { target: { value: "one\ntwo" } });
    await waitFor(() => expect(shell().hasAttribute("data-multiline")).toBe(true));
    fireEvent.change(input, { target: { value: "one" } });
    expect(shell().hasAttribute("data-multiline")).toBe(true);
    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => expect(shell().hasAttribute("data-multiline")).toBe(false));
  });

  test("the default density never sets data-multiline", async () => {
    const { getByRole } = render(<Harness />);
    fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "one\ntwo" } });
    expect(shell().hasAttribute("data-multiline")).toBe(false);
  });

  test("the stylesheet is scoped to the compact density and exposes its tokens", async () => {
    const css = await Bun.file(new URL("./thread-composer.css", import.meta.url)).text();
    const selectors = css.replace(/\/\*[\s\S]*?\*\//g, "").split("{").map((chunk) => chunk.split("}").pop()!.trim()).filter((s) => s && !s.startsWith("@media"));
    for (const selector of selectors) {
      for (const part of selector.split(",")) expect(part).toContain('[data-density="compact"]');
    }
    for (const token of ["row-height", "control-size", "send-size", "inset-start", "inset-end", "inset-y", "radius", "max-height"]) {
      expect(css).toContain(`--composer-compact-${token}`);
    }
  });
});
