import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  type AssistantRuntime,
  type ChatModelAdapter,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import {
  messagesForSearch,
  Thread,
  useScrollToMessage,
  useVisibleMessageIds,
  type ThreadComponents,
} from "./thread.aui";

const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const messages: ThreadMessageLike[] = [
  { id: "m1", role: "user", content: [{ type: "text", text: "first question" }] },
  { id: "m2", role: "assistant", content: [{ type: "text", text: "first answer" }] },
  { id: "m3", role: "user", content: [{ type: "text", text: "second question" }] },
];

// happy-dom has no IntersectionObserver: a stub the tests drive by hand.
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  observed = new Set<Element>();
  constructor(readonly callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.add(el);
  }
  unobserve(el: Element) {
    this.observed.delete(el);
  }
  disconnect() {
    this.observed.clear();
  }
  takeRecords() {
    return [];
  }
  report(visible: Record<string, boolean>) {
    const entries = [...this.observed]
      .filter((el) => visible[el.getAttribute("data-message-id") ?? ""] !== undefined)
      .map((target) => ({
        target,
        isIntersecting: visible[target.getAttribute("data-message-id") ?? ""],
      }));
    this.callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver);
  }
}

const realObserver = globalThis.IntersectionObserver;
beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});
afterEach(() => {
  cleanup();
  globalThis.IntersectionObserver = realObserver;
});

let runtime: AssistantRuntime;
let visibleIds: readonly string[] = [];
let scrollTo: (id: string) => void = () => {};

function Probe() {
  visibleIds = useVisibleMessageIds();
  scrollTo = useScrollToMessage();
  return <div data-testid="probe">{visibleIds.join(",")}</div>;
}

function Harness({ components }: { components?: ThreadComponents }) {
  runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={components} />
    </AssistantRuntimeProvider>
  );
}

const Rail = () => <nav data-testid="rail">rail</nav>;
const RailWithProbe = () => (
  <nav data-testid="rail">
    <Probe />
  </nav>
);

async function seed() {
  act(() => runtime.thread.reset(messages));
  await waitFor(() => expect(document.querySelectorAll("[data-message-id]").length).toBe(3));
}

describe("Thread's ThreadViewportExtra slot", () => {
  test("renders nothing by default and leaves the root layout alone", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-slot="aui_thread-viewport-extra"]')).toBeNull();
    expect(container.querySelector(".aui-thread-root")?.className).not.toContain("relative");
  });

  test("renders its content beside the viewport, inside the thread root", () => {
    const { container, getByTestId } = render(<Harness components={{ ThreadViewportExtra: Rail }} />);
    const viewport = container.querySelector('[data-slot="aui_thread-viewport"]');
    const extra = getByTestId("rail").closest('[data-slot="aui_thread-viewport-extra"]');
    expect(extra).toBeTruthy();
    expect(extra?.parentElement as Element | null).toBe(container.querySelector(".aui-thread-root"));
    expect(extra?.parentElement).toBe(viewport?.parentElement ?? null);
    expect(viewport?.contains(extra)).toBe(false);
  });
});

describe("useVisibleMessageIds", () => {
  test("is empty before any message reports", async () => {
    const { getByTestId } = render(<Harness components={{ ThreadViewportExtra: RailWithProbe }} />);
    await seed();
    expect(getByTestId("probe").textContent).toBe("");
  });

  test("follows messages scrolling in and out, in document order", async () => {
    const { getByTestId } = render(<Harness components={{ ThreadViewportExtra: RailWithProbe }} />);
    await seed();
    const io = () => FakeIntersectionObserver.instances.filter((i) => i.observed.size > 0).at(-1)!;
    await waitFor(() => expect(io().observed.size).toBe(3));

    act(() => io().report({ m3: true, m2: true }));
    await waitFor(() => expect(getByTestId("probe").textContent).toBe("m2,m3"));

    act(() => io().report({ m2: false, m1: true }));
    await waitFor(() => expect(getByTestId("probe").textContent).toBe("m1,m3"));
  });

  test("promotes last visible at max scroll and reading-line message in mid-thread", async () => {
    const { container, getByTestId } = render(<Harness components={{ ThreadViewportExtra: RailWithProbe }} />);
    await seed();
    const viewport = container.querySelector<HTMLElement>('[data-slot="aui_thread-viewport"]')!;
    Object.defineProperties(viewport, {
      scrollHeight: { configurable: true, value: 1200 },
      clientHeight: { configurable: true, value: 400 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });
    viewport.getBoundingClientRect = () => ({ top: 100, bottom: 500 } as DOMRect);
    const els = [...container.querySelectorAll<HTMLElement>("[data-message-id]")];
    els.forEach((el, i) => {
      el.getBoundingClientRect = () => ({ top: 100 + i * 30, bottom: 125 + i * 30 } as DOMRect);
    });
    const io = FakeIntersectionObserver.instances.filter((i) => i.observed.size > 0).at(-1)!;
    act(() => io.report({ m1: true, m2: true, m3: true }));
    await waitFor(() => expect(getByTestId("probe").textContent).toBe("m1,m2,m3"));

    viewport.scrollTop = 200;
    els[0]!.getBoundingClientRect = () => ({ top: 10, bottom: 50 } as DOMRect);
    els[1]!.getBoundingClientRect = () => ({ top: 90, bottom: 120 } as DOMRect);
    els[2]!.getBoundingClientRect = () => ({ top: 130, bottom: 160 } as DOMRect);
    act(() => io.report({ m3: false }));
    await waitFor(() => expect(getByTestId("probe").textContent).toBe("m2,m1"));

    viewport.scrollTop = 799;
    act(() => io.report({ m3: true }));
    await waitFor(() => expect(getByTestId("probe").textContent).toBe("m3,m1,m2"));
  });

  test("returns an empty list outside a thread", () => {
    const { getByTestId } = render(<Probe />);
    expect(getByTestId("probe").textContent).toBe("");
  });
});

describe("useScrollToMessage", () => {
  test("scrolls the matching message element into view", async () => {
    render(<Harness components={{ ThreadViewportExtra: RailWithProbe }} />);
    await seed();
    const calls: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-message-id]")) {
      el.scrollIntoView = () => {
        calls.push(el.getAttribute("data-message-id") ?? "");
      };
    }
    await waitFor(() => expect(typeof scrollTo).toBe("function"));
    act(() => scrollTo("m2"));
    expect(calls).toEqual(["m2"]);
  });

  test("no-ops for an unknown id", async () => {
    render(<Harness components={{ ThreadViewportExtra: RailWithProbe }} />);
    await seed();
    const calls: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("[data-message-id]")) {
      el.scrollIntoView = () => {
        calls.push("called");
      };
    }
    expect(() => act(() => scrollTo("nope"))).not.toThrow();
    expect(calls).toEqual([]);
  });
});

describe("messagesForSearch", () => {
  test("flattens text parts to { id, role, text } and skips system messages", () => {
    const list = messagesForSearch([
      { id: "a", role: "user", content: [{ type: "text", text: "hi" }] },
      {
        id: "b",
        role: "assistant",
        content: [
          { type: "text", text: "one" },
          { type: "reasoning", text: "hidden" },
          { type: "text", text: "two" },
        ],
      },
      { id: "c", role: "system", content: [{ type: "text", text: "sys" }] },
    ] as never);
    expect(list).toEqual([
      { id: "a", role: "user", text: "hi" },
      { id: "b", role: "assistant", text: "one\ntwo" },
    ]);
  });
});
