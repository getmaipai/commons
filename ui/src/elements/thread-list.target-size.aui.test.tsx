import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, render } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadList } from "./thread-list.aui";

afterEach(cleanup);

const tokensCss = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");

const chat: ChatModelAdapter = { async *run() { yield { content: [] }; } };
const adapter = (threads: Array<{ remoteId: string; title: string }>) => ({
  list: async () => ({ threads: threads.map((thread) => ({ ...thread, status: "regular" as const })) }),
  rename: async () => {}, updateCustom: async () => {}, archive: async () => {}, unarchive: async () => {},
  delete: async () => {}, initialize: async (threadId: string) => ({ remoteId: threadId, externalId: undefined }),
  generateTitle: async () => new ReadableStream(),
}) as unknown as RemoteThreadListAdapter;

function Harness({ threads }: { threads: Array<{ remoteId: string; title: string }> }) {
  const useChatRuntime = () => useLocalRuntime(chat);
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useChatRuntime, adapter: adapter(threads) });
  return <AssistantRuntimeProvider runtime={runtime}><ThreadList /></AssistantRuntimeProvider>;
}

describe("ThreadList 48px target floor", () => {
  test("thread rows use a 48px default token and compact sidebars set 36px rows", () => {
    expect(tokensCss).toContain("--aui-thread-list-item-min-height: 48px;");
    expect(tokensCss).toContain('min-height: var(--aui-thread-list-item-min-height, 48px);');
    expect(tokensCss).toContain('@media (pointer: fine) {\n  [data-slot="aui_thread-list-sidebar"][data-variant="compact"] {\n    --aui-thread-list-item-min-height: 36px;');
    expect(tokensCss).toContain('[data-slot="aui_thread-list-item"],\n[data-slot="aui_thread-list-item-trigger"] {');
  });

  test("New Chat keeps its compact painted row and adds the kit's 16px vertical hit overhang", () => {
    const view = render(<Harness threads={[]} />);
    const button = view.getByRole("button", { name: "New chat" });
    expect(button.className).toContain("h-8");
    expect(button.className).toContain("before:-inset-2");
  });

  test("More options keeps its 24px icon and adds the kit's 12px hit overhang", async () => {
    const view = render(<Harness threads={[{ remoteId: "thread-1", title: "Weekend plans" }]} />);
    await view.findByText("Weekend plans");
    const button = view.container.querySelector('[data-slot="aui_thread-list-item-more"]')!;
    expect(button.className).toContain("size-6");
    expect(button.className).toContain("before:-inset-3");
  });

  test("history row title keeps its compact height and adds the kit's 16px vertical hit overhang", async () => {
    const view = render(<Harness threads={[{ remoteId: "thread-1", title: "Weekend plans" }]} />);
    const button = await view.findByRole("button", { name: "Weekend plans" });
    expect(button.className).toContain("h-full");
    expect(button.className).toContain("before:-inset-2");
  });
});
