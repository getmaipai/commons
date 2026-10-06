import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  useLocalRuntime,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
} from "@assistant-ui/react";
import { ThreadListItems, ThreadListRoot, type ThreadListProjects } from "./thread-list.aui";

// CHAT-PROJECT-01: the thread list's opt-in projects mode.

afterEach(cleanup);

const chat: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

type Seed = { remoteId: string; title: string; folder?: string; pinned?: boolean; lastMessageAt?: Date };

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
        lastMessageAt: seed.lastMessageAt ?? new Date(),
        custom: { pinned: seed.pinned ?? false, folder_id: seed.folder ?? null },
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
  projects,
  updateCustom = async () => {},
  pinnable,
  searchQuery,
}: {
  seeds: Seed[];
  projects?: ThreadListProjects;
  updateCustom?: (remoteId: string, custom: Record<string, unknown> | undefined) => Promise<void>;
  pinnable?: boolean;
  searchQuery?: string;
}) {
  const runtime = useRemoteThreadListRuntime({ runtimeHook: useChatRuntime, adapter: makeAdapter(seeds, updateCustom) });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ThreadListRoot>
        <ThreadListItems projects={projects} pinnable={pinnable} searchQuery={searchQuery} />
      </ThreadListRoot>
    </AssistantRuntimeProvider>
  );
}

const folders = [
  { id: "folder-garden", name: "Garden" },
  { id: "folder-trip", name: "Trip" },
];

const labels = (view: ReturnType<typeof render>) =>
  [...view.container.querySelectorAll("[data-slot=aui_thread-list-group-label]")].map((el) => el.textContent);

const projectRow = async (view: ReturnType<typeof render>, name: string) =>
  (await view.findByText(name)).closest("[data-slot=aui_thread-list-project]") as HTMLElement;

const openChatMenu = async (view: ReturnType<typeof render>, title: string) => {
  const item = (await view.findByText(title)).closest("[data-slot=aui_thread-list-item]") as HTMLElement;
  fireEvent.keyDown(item.querySelector("[data-slot=aui_thread-list-item-more]") as HTMLElement, { key: "Enter" });
  return item;
};

describe("ThreadList projects mode", () => {
  test("without projects nothing changes: no Projects section, no move items", async () => {
    const view = render(<Harness seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden" }]} />);
    await view.findByText("Alpha");
    expect(view.queryByText("Projects")).toBeNull();
    expect(labels(view)).toEqual(["Today"]);
    await openChatMenu(view, "Alpha");
    await view.findByText("Rename");
    expect(view.queryByText("Move to project")).toBeNull();
    expect(view.container.querySelector("[data-slot=aui_thread-list-item]")?.getAttribute("draggable")).toBeNull();
  });

  test("a chat in a listed project leaves the day groups and sits under its project, collapsed", async () => {
    const view = render(
      <Harness
        projects={{ folders }}
        seeds={[
          { remoteId: "a", title: "Alpha", folder: "folder-garden" },
          { remoteId: "b", title: "Beta" },
          { remoteId: "c", title: "Gamma", folder: "folder-gone" },
        ]}
      />,
    );
    await view.findByText("Beta");
    expect(labels(view)).toEqual(["Projects", "Today"]);
    // Collapsed: the project's chats are not rendered; a chat whose project
    // is not listed stays in the day groups.
    expect(view.queryByText("Alpha")).toBeNull();
    expect(view.getByText("Gamma")).toBeTruthy();

    const garden = await projectRow(view, "Garden");
    const trigger = garden.querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement;
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(trigger);
    expect(await view.findByText("Alpha")).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
  });

  test("the keyboard opens and closes a project", async () => {
    const view = render(<Harness projects={{ folders }} seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-trip" }]} />);
    const trigger = (await projectRow(view, "Trip")).querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement;
    fireEvent.keyDown(trigger, { key: "ArrowRight" });
    await view.findByText("Alpha");
    fireEvent.keyDown(trigger, { key: "ArrowLeft" });
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  });

  test("a pinned chat in a project shows once, under Pinned", async () => {
    const view = render(
      <Harness pinnable projects={{ folders }} seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden", pinned: true }]} />,
    );
    await view.findByText("Alpha");
    expect(labels(view)).toEqual(["Pinned", "Projects"]);
    fireEvent.click((await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement);
    await view.findByText("No chats yet");
    expect(view.getAllByText("Alpha")).toHaveLength(1);
  });

  test("searching lists matching chats flat, projects included", async () => {
    const view = render(
      <Harness projects={{ folders }} searchQuery="alp" seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden" }]} />,
    );
    expect(await view.findByText("Alpha")).toBeTruthy();
    expect(view.queryByText("Projects")).toBeNull();
  });

  test("Show more appears after six chats", async () => {
    const seeds = Array.from({ length: 8 }, (_, i) => ({ remoteId: `t${i}`, title: `Chat ${i}`, folder: "folder-garden" }));
    const view = render(<Harness projects={{ folders }} seeds={seeds} />);
    fireEvent.click((await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement);
    await view.findByText("Show more");
    const items = view.container.querySelectorAll("[data-slot=aui_thread-list-project-items] [data-slot=aui_thread-list-item]");
    expect(items).toHaveLength(6);
    fireEvent.click(view.getByText("Show more"));
    await view.findByText("Show less");
    expect(view.container.querySelectorAll("[data-slot=aui_thread-list-project-items] [data-slot=aui_thread-list-item]")).toHaveLength(8);
  });

  test("Move to project lists the projects and moves through updateCustom", async () => {
    const updateCustom = mock(async () => {});
    const view = render(<Harness projects={{ folders }} updateCustom={updateCustom} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    await openChatMenu(view, "Alpha");
    fireEvent.click(await view.findByText("Move to project"));
    const menu = view.baseElement.querySelector("[data-slot=aui_thread-list-item-more-content]") as HTMLElement;
    fireEvent.click(await within(menu).findByText("Trip"));
    await waitFor(() => expect(updateCustom).toHaveBeenCalledWith("a", { pinned: false, folder_id: "folder-trip" }));
  });

  test("Remove from project takes a chat out", async () => {
    const updateCustom = mock(async () => {});
    const view = render(
      <Harness projects={{ folders }} updateCustom={updateCustom} seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden" }]} />,
    );
    fireEvent.click((await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement);
    await openChatMenu(view, "Alpha");
    fireEvent.click(await view.findByText("Remove from project"));
    await waitFor(() => expect(updateCustom).toHaveBeenCalledWith("a", { pinned: false, folder_id: null }));
  });

  test("dragging a chat onto a project moves it", async () => {
    const updateCustom = mock(async () => {});
    const view = render(<Harness projects={{ folders }} updateCustom={updateCustom} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    const item = (await view.findByText("Alpha")).closest("[data-slot=aui_thread-list-item]") as HTMLElement;
    expect(item.getAttribute("draggable")).toBe("true");
    const store = new Map<string, string>();
    const dataTransfer = {
      get types() {
        return [...store.keys()];
      },
      setData: (type: string, value: string) => store.set(type, value),
      getData: (type: string) => store.get(type) ?? "",
      effectAllowed: "",
      dropEffect: "",
    };
    fireEvent.dragStart(item, { dataTransfer });
    const garden = await projectRow(view, "Garden");
    fireEvent.dragOver(garden, { dataTransfer });
    fireEvent.drop(garden, { dataTransfer });
    await waitFor(() => expect(updateCustom).toHaveBeenCalledWith("a", { pinned: false, folder_id: "folder-garden" }));
  });

  test("a host that cannot manage gets no +, rename or delete, and canMove false stops moving", async () => {
    const view = render(
      <Harness projects={{ folders, canMove: false, onNewChat: () => {} }} seeds={[{ remoteId: "a", title: "Alpha" }]} />,
    );
    await view.findByText("Garden");
    expect(view.queryByLabelText("New project")).toBeNull();
    const more = (await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement;
    fireEvent.pointerDown(more, { button: 0, pointerType: "mouse" });
    await view.findByText("New chat in project");
    expect(view.queryByText("Delete")).toBeNull();
    expect(view.queryByText("Rename")).toBeNull();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await openChatMenu(view, "Alpha");
    await view.findByText("Archive");
    expect(view.queryByText("Move to project")).toBeNull();
    const item = view.getByText("Alpha").closest("[data-slot=aui_thread-list-item]") as HTMLElement;
    expect(item.getAttribute("draggable")).toBeNull();
  });

  test("the + and the project menu button carry the 48px touch overhang", async () => {
    const view = render(<Harness projects={{ folders, canManage: true, onCreate: async () => {}, onRename: async () => {} }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    const plus = await view.findByLabelText("New project");
    expect(plus.className).toContain("before:-inset-3");
    const more = (await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement;
    expect(more.className).toContain("before:-inset-3");
  });

  test("+ makes a project from an inline field", async () => {
    const onCreate = mock(async () => {});
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    const field = await view.findByPlaceholderText("Project name");
    fireEvent.change(field, { target: { value: "  Recipes " } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Recipes"));
    await waitFor(() => expect(view.queryByPlaceholderText("Project name")).toBeNull());
  });

  test("a failed save still closes the new project field", async () => {
    const onCreate = mock(async () => {
      throw new Error("hub said no");
    });
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    const field = await view.findByPlaceholderText("Project name");
    fireEvent.change(field, { target: { value: "Recipes" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    await waitFor(() => expect(view.queryByPlaceholderText("Project name")).toBeNull());
    fireEvent.click(view.getByLabelText("New project"));
    expect(await view.findByPlaceholderText("Project name")).toBeTruthy();
  });

  test("rename and delete happen inline, and delete asks first", async () => {
    const onRename = mock(async () => {});
    const onDelete = mock(async () => {});
    const view = render(<Harness projects={{ folders, canManage: true, onRename, onDelete }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    const openProjectMenu = async () => {
      const more = (await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement;
      fireEvent.pointerDown(more, { button: 0, pointerType: "mouse" });
    };
    await openProjectMenu();
    fireEvent.click(await view.findByText("Rename"));
    const field = await view.findByDisplayValue("Garden");
    fireEvent.change(field, { target: { value: "Backyard" } });
    fireEvent.keyDown(field, { key: "Enter" });
    await waitFor(() => expect(onRename).toHaveBeenCalledWith("folder-garden", "Backyard"));

    await openProjectMenu();
    fireEvent.click(await view.findByText("Delete"));
    const confirm = await view.findByRole("group", { name: "Delete this project? Its chats stay." });
    expect(onDelete).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(within(confirm).getByText("Delete"));
    });
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith("folder-garden"));
  });
});
