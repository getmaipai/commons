import { afterEach, describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadList } from "./thread-list.aui";

afterEach(cleanup);

const chat: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

type Seed = { remoteId: string; title: string; pinned?: boolean; lastMessageAt?: Date };

const useChatRuntime = () => useLocalRuntime(chat);

const makeAdapter = (
  seeds: Seed[],
  updateCustom: (remoteId: string, custom: Record<string, unknown> | undefined) => Promise<void>,
): RemoteThreadListAdapter =>
  ({
    list: async () => ({
      threads: seeds.map((seed) => ({
        status: "regular" as const,
        remoteId: seed.remoteId,
        title: seed.title,
        lastMessageAt: seed.lastMessageAt,
        custom: seed.pinned === undefined ? undefined : { pinned: seed.pinned },
      })),
    }),
    rename: async () => {},
    updateCustom,
    archive: async () => {},
    unarchive: async () => {},
    delete: async () => {},
    initialize: async (threadId: string) => ({ remoteId: threadId, externalId: undefined }),
    generateTitle: async () => new ReadableStream(),
  }) as unknown as RemoteThreadListAdapter;

function Harness({
  seeds,
  updateCustom,
  pinnable,
  labels,
}: {
  seeds: Seed[];
  updateCustom: (remoteId: string, custom: Record<string, unknown> | undefined) => Promise<void>;
  pinnable?: boolean;
  labels?: { pin?: string; unpin?: string; pinned?: string };
}) {
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: useChatRuntime,
    adapter: makeAdapter(seeds, updateCustom),
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadList pinnable={pinnable} labels={labels} />
    </AssistantRuntimeProvider>
  );
}

const openMenu = async (view: ReturnType<typeof render>, title: string) => {
  const row = await view.findByText(title);
  const item = row.closest("[data-slot=aui_thread-list-item]") as HTMLElement;
  const more = item.querySelector("[data-slot=aui_thread-list-item-more]") as HTMLElement;
  fireEvent.keyDown(more, { key: "Enter" });
  return item;
};

describe("ThreadList pin", () => {
  test("shows no Pin item and no indicator without pinnable", async () => {
    const view = render(
      <Harness seeds={[{ remoteId: "a", title: "Alpha", pinned: true }]} updateCustom={async () => {}} />,
    );
    await openMenu(view, "Alpha");
    await view.findByText("Rename");
    expect(view.queryByText("Pin")).toBeNull();
    expect(view.queryByText("Unpin")).toBeNull();
    expect(view.container.querySelector("[data-slot=aui_thread-list-item-pinned]")).toBeNull();
    expect(view.queryByText("Pinned")).toBeNull();
  });

  test("Pin on an unpinned row calls updateCustom with pinned true", async () => {
    const updateCustom = mock(async () => {});
    const view = render(
      <Harness seeds={[{ remoteId: "a", title: "Alpha" }]} updateCustom={updateCustom} pinnable />,
    );
    await openMenu(view, "Alpha");
    expect(view.queryByText("Unpin")).toBeNull();
    fireEvent.click(await view.findByText("Pin"));
    await waitFor(() => expect(updateCustom).toHaveBeenCalledWith("a", { pinned: true }));
  });

  test("Unpin on a pinned row calls updateCustom with pinned false", async () => {
    const updateCustom = mock(async () => {});
    const view = render(
      <Harness seeds={[{ remoteId: "a", title: "Alpha", pinned: true }]} updateCustom={updateCustom} pinnable />,
    );
    await openMenu(view, "Alpha");
    expect(view.queryByText("Pin")).toBeNull();
    fireEvent.click(await view.findByText("Unpin"));
    await waitFor(() => expect(updateCustom).toHaveBeenCalledWith("a", { pinned: false }));
  });

  test("uses custom labels for the menu item", async () => {
    const view = render(
      <Harness
        seeds={[{ remoteId: "a", title: "Alpha" }]}
        updateCustom={async () => {}}
        pinnable
        labels={{ pin: "Fix it" }}
      />,
    );
    await openMenu(view, "Alpha");
    expect(await view.findByText("Fix it")).toBeTruthy();
  });

  test("shows a muted indicator on a pinned row only", async () => {
    const view = render(
      <Harness
        seeds={[
          { remoteId: "a", title: "Alpha", pinned: true },
          { remoteId: "b", title: "Beta" },
        ]}
        updateCustom={async () => {}}
        pinnable
      />,
    );
    const alpha = (await view.findByText("Alpha")).closest("[data-slot=aui_thread-list-item]")!;
    const beta = (await view.findByText("Beta")).closest("[data-slot=aui_thread-list-item]")!;
    expect(alpha.querySelector("[data-slot=aui_thread-list-item-pinned]")).not.toBeNull();
    expect(beta.querySelector("[data-slot=aui_thread-list-item-pinned]")).toBeNull();
  });

  test("groups pinned rows under Pinned above the day groups", async () => {
    const now = new Date();
    const view = render(
      <Harness
        seeds={[
          { remoteId: "a", title: "Alpha", lastMessageAt: now },
          { remoteId: "b", title: "Beta", pinned: true, lastMessageAt: new Date(now.getTime() - 5 * 86_400_000) },
        ]}
        updateCustom={async () => {}}
        pinnable
      />,
    );
    await view.findByText("Alpha");
    const labels = [...view.container.querySelectorAll("[data-slot=aui_thread-list-group-label]")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Pinned", "Today"]);
  });

  test("does not add a Pinned group without pinnable", async () => {
    const now = new Date();
    const view = render(
      <Harness
        seeds={[{ remoteId: "b", title: "Beta", pinned: true, lastMessageAt: now }]}
        updateCustom={async () => {}}
      />,
    );
    await view.findByText("Beta");
    const labels = [...view.container.querySelectorAll("[data-slot=aui_thread-list-group-label]")].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Today"]);
  });
});

describe("ThreadList data-slot styling", () => {
  test("the shipped row slots are targeted by the 48px and active-state token rules", async () => {
    const view = render(
      <Harness seeds={[{ remoteId: "a", title: "Alpha" }]} updateCustom={async () => {}} />,
    );
    const title = await view.findByText("Alpha");
    const row = title.closest('[data-slot="aui_thread-list-item"]');
    const trigger = title.closest('[data-slot="aui_thread-list-item-trigger"]');
    const tokens = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");

    expect(row).toBeTruthy();
    expect(trigger).toBeTruthy();
    expect(tokens).toMatch(/\[data-slot="aui_thread-list-item"\][^{]*\{[^}]*min-height:\s*48px/s);
    expect(tokens).toMatch(/\[data-slot="aui_thread-list-item-trigger"\][^{]*\{[^}]*min-height:\s*48px/s);
    expect(tokens).toContain('[data-slot="aui_thread-list-item"][data-active="true"]');
    expect(tokens).toContain("background-color: var(--sidebar-accent)");
  });
});
