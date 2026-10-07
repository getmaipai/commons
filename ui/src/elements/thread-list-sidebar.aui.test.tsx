import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadListSidebar } from "./thread-list-sidebar.aui";

afterEach(cleanup);

const model: ChatModelAdapter = { async *run() { yield { content: [] }; } };
const adapter = {
  list: async () => ({
    threads: [
      { status: "regular" as const, remoteId: "alpha", title: "Alpha thread", lastMessageAt: new Date(), custom: {} },
    ],
  }),
  rename: async () => {},
  updateCustom: async () => {},
  archive: async () => {},
  unarchive: async () => {},
  delete: async () => {},
  initialize: async (threadId: string) => ({ remoteId: threadId, externalId: undefined }),
  generateTitle: async () => new ReadableStream(),
} as unknown as RemoteThreadListAdapter;
const useChatRuntime = () => useLocalRuntime(model);

function Harness(props: ComponentProps<typeof ThreadListSidebar>) {
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useChatRuntime, adapter });
  return <AssistantRuntimeProvider runtime={runtime}><ThreadListSidebar {...props} /></AssistantRuntimeProvider>;
}

describe("ThreadListSidebar", () => {
  test("renders the compact thread list with slots empty by default and no external links", async () => {
    const view = render(<Harness variant="compact" />);
    await view.findByText("Alpha thread");
    expect(view.container.querySelector('[data-slot="aui_thread-list-sidebar"]')?.getAttribute("data-state")).toBe("expanded");
    expect(view.container.querySelector('[data-slot="aui_thread-list-new"]')?.getAttribute("data-density")).toBe("compact");
    expect(view.container.querySelector('[data-slot="aui_thread-list-item"]')?.className).toContain("h-9");
    expect(view.container.querySelector('[data-slot="sidebar-header"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="sidebar-footer"]')).toBeNull();
    expect(view.container.querySelectorAll('a[href*="assistant-ui"], a[href*="github.com"]')).toHaveLength(0);
  });

  test("hosts optional header and footer slots", () => {
    const view = render(<Harness header={<button>Column controls</button>} footer={<span>Column status</span>} />);
    expect(view.getByText("Column controls")).toBeTruthy();
    expect(view.getByText("Column status")).toBeTruthy();
  });

  test("temporary chat mode omits projects and disables pinning", async () => {
    const view = render(<Harness temporary projects={{ folders: [{ id: "p", name: "Private project" }] }} pinnable />);
    await view.findByText("Alpha thread");
    expect(view.queryByText("Projects")).toBeNull();
    fireEvent.keyDown(view.container.querySelector('[data-slot="aui_thread-list-item-more"]') as HTMLElement, { key: "Enter" });
    await view.findByText("Rename");
    expect(view.queryByText("Pin")).toBeNull();
  });

  test("regular chat mode keeps the projects section and pin action", async () => {
    const view = render(<Harness variant="compact" projects={{ folders: [{ id: "home", name: "Home" }] }} pinnable />);
    await view.findByText("Alpha thread");
    expect(view.getByText("Projects")).toBeTruthy();
    fireEvent.keyDown(view.container.querySelector('[data-slot="aui_thread-list-item-more"]') as HTMLElement, { key: "Enter" });
    expect(await view.findByText("Pin")).toBeTruthy();
  });

  test("compact collapsed mode exposes the hover zone and delegates peek navigation", async () => {
    const onZoneEnter = mock(() => {});
    const collapsed = render(<Harness variant="compact" collapsed onPeekZonePointerEnter={onZoneEnter} />);
    const zone = collapsed.container.querySelector('[data-slot="aui_thread-list-sidebar-peek-zone"]') as HTMLElement;
    expect(zone).toBeTruthy();
    expect(collapsed.container.querySelector('[data-slot="aui_thread-list-sidebar-panel"]')?.className).toContain("invisible");
    fireEvent.pointerEnter(zone, { pointerType: "mouse" });
    expect(onZoneEnter).toHaveBeenCalledTimes(1);
    collapsed.unmount();

    const onPeekEnter = mock(() => {});
    const onNavigate = mock(() => {});
    const view = render(
      <Harness variant="compact" collapsed peek onPeekZonePointerEnter={onZoneEnter} onPeekPointerEnter={onPeekEnter} onPeekNavigate={onNavigate} />,
    );
    await view.findByText("Alpha thread");
    expect(view.container.querySelector('[data-slot="aui_thread-list-sidebar"]')?.getAttribute("data-state")).toBe("peek");
    expect(view.container.querySelector('[data-slot="aui_thread-list-sidebar-panel"]')?.className).toContain("shadow-xl");
    fireEvent.pointerEnter(view.container.querySelector('[data-slot="sidebar"]') as HTMLElement);
    fireEvent.click(view.getByText("Alpha thread").closest('[data-slot="aui_thread-list-item-trigger"]') as HTMLElement);
    expect(onPeekEnter).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });
});
