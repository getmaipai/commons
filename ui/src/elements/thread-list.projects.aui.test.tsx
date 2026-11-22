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
import { ThreadListPageRowsShowcase } from "./ThreadListPageRowsShowcase";
import { formatRelative } from "../relativeTime";

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
  test("the page-row showcase story renders its preview, relative date, and optional icon", async () => {
    const view = render(<ThreadListPageRowsShowcase />);
    expect(await view.findByText("Design Review Prompt")).toBeTruthy();
    expect(view.getByText(/Make sure you are detailed on the prompt bar/)).toBeTruthy();
    expect(view.container.querySelector('[data-slot="project-mark"]')).toBeTruthy();
  });

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

  test("page rows show the title, optional preview and relative date, with an optional project icon", async () => {
    const date = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const view = render(
      <Harness
        projects={{
          folders: [],
          rowVariant: "page",
          pageRows: {
            alpha: { preview: "A one-line answer preview", date, projectIcon: { icon: "leaf", color: "green" } },
            beta: { preview: null, date: null },
          },
        }}
        seeds={[{ remoteId: "alpha", title: "Alpha project chat" }, { remoteId: "beta", title: "Untitled preview chat" }]}
      />,
    );

    const alpha = await view.findByText("Alpha project chat");
    const alphaRow = alpha.closest("[data-slot=aui_thread-list-item]") as HTMLElement;
    expect(within(alphaRow).getByText("A one-line answer preview").className).toContain("truncate");
    expect(within(alphaRow).getByText(formatRelative(date)).getAttribute("datetime")).toBe(date);
    expect(alphaRow.querySelector('[data-slot="project-mark"]')).toBeTruthy();

    const beta = await view.findByText("Untitled preview chat");
    const betaRow = beta.closest("[data-slot=aui_thread-list-item]") as HTMLElement;
    expect(betaRow.querySelector('[data-slot="aui_thread-list-item-preview"]')).toBeNull();
    expect(betaRow.querySelector('[data-slot="aui_thread-list-item-date"]')).toBeNull();
    expect(betaRow.querySelector('[data-slot="project-mark"]')).toBeNull();
  });

  test("day group headers render only their labels, without the group's array index", async () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const earlier = new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000);
    const view = render(<Harness seeds={[
      { remoteId: "today", title: "Today chat", lastMessageAt: today },
      { remoteId: "yesterday", title: "Yesterday chat", lastMessageAt: yesterday },
      { remoteId: "earlier", title: "Earlier chat", lastMessageAt: earlier },
    ]} />);
    await view.findByText("Earlier chat");
    const headings = [...view.container.querySelectorAll<HTMLElement>("[data-slot=aui_thread-list-group-label]")];
    expect(headings.map((heading) => heading.textContent)).toEqual(["Today", "Yesterday", "Earlier"]);
    expect(headings.map((heading) => heading.nextSibling?.textContent?.trim() ?? "").filter((text) => /^\d+$/.test(text))).toEqual([]);
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
    await view.findByText("No chats");
    expect(view.getAllByText("Alpha")).toHaveLength(1);
  });

  test("searching lists matching chats flat, projects included", async () => {
    const view = render(
      <Harness projects={{ folders }} searchQuery="alp" seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden" }]} />,
    );
    expect(await view.findByText("Alpha")).toBeTruthy();
    expect(view.queryByText("Projects")).toBeNull();
  });

  test("Show more appears after five chats", async () => {
    const seeds = Array.from({ length: 8 }, (_, i) => ({ remoteId: `t${i}`, title: `Chat ${i}`, folder: "folder-garden" }));
    const view = render(<Harness projects={{ folders }} seeds={seeds} />);
    fireEvent.click((await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement);
    await view.findByText("Show more");
    const items = view.container.querySelectorAll("[data-slot=aui_thread-list-project-items] [data-slot=aui_thread-list-item]");
    expect(items).toHaveLength(5);
    fireEvent.click(view.getByText("Show more"));
    await view.findByText("Show less");
    expect(view.container.querySelectorAll("[data-slot=aui_thread-list-project-items] [data-slot=aui_thread-list-item]")).toHaveLength(8);
  });

  test("the Projects heading collapses and reopens the section, the plus stays", async () => {
    const view = render(<Harness projects={{ folders, canManage: true, onCreate: async () => {} }} seeds={[]} />);
    await projectRow(view, "Garden");
    const toggle = view.container.querySelector("[data-slot=aui_thread-list-projects-toggle]") as HTMLElement;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(toggle);
    expect(view.container.querySelector("[data-slot=aui_thread-list-project]")).toBeNull();
    expect(view.container.querySelector("[data-slot=aui_thread-list-section-action]")).not.toBeNull();
    fireEvent.click(toggle);
    expect(view.container.querySelector("[data-slot=aui_thread-list-project]")).not.toBeNull();
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

  test("the project menu button carries the 48px touch overhang and the + the packed layer", async () => {
    const view = render(<Harness projects={{ folders, canManage: true, onCreate: async () => {}, onRename: async () => {} }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    const plus = await view.findByLabelText("New project");
    expect(plus.className).toContain("before:inset-x-[-1px]");
    const more = (await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement;
    expect(more.className).toContain("before:inset-[min(0px,calc((100%-49px)/2))]");
  });

  test("+ opens a dialog with a name field and a Create button, and no inline row", async () => {
    const onCreate = mock(async () => {});
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate }} seeds={[{ remoteId: "a", title: "Alpha" }]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    const dialog = await view.findByRole("dialog");
    expect(view.container.querySelector("[data-slot=aui_thread-list-project-name]")).toBeNull();
    const create = within(dialog).getByRole("button", { name: "Create" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    const field = within(dialog).getByPlaceholderText("Project name");
    fireEvent.change(field, { target: { value: "  Recipes " } });
    fireEvent.click(create);
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Recipes"));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
  });

  test("onNew makes + call the host at once, with no name-only dialog", async () => {
    const onNew = mock(() => {});
    const onCreate = mock(async () => {});
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate, onNew }} seeds={[]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    expect(onNew).toHaveBeenCalledTimes(1);
    expect(view.queryByRole("dialog")).toBeNull();
    expect(onCreate).not.toHaveBeenCalled();
  });

  test("onNew alone is enough to show the +", async () => {
    const view = render(<Harness projects={{ folders: [], canManage: true, onNew: () => {} }} seeds={[]} />);
    expect(await view.findByLabelText("New project")).toBeTruthy();
  });

  test("Enter in the dialog creates, Cancel closes without creating", async () => {
    const onCreate = mock(async () => {});
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate }} seeds={[]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    fireEvent.click(within(await view.findByRole("dialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
    expect(onCreate).not.toHaveBeenCalled();
    fireEvent.click(view.getByLabelText("New project"));
    const field = await view.findByPlaceholderText("Project name");
    fireEvent.change(field, { target: { value: "Trip" } });
    fireEvent.submit(field.closest("form") as HTMLFormElement);
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Trip"));
  });

  test("a failed save still closes the dialog", async () => {
    const onCreate = mock(async () => {
      throw new Error("hub said no");
    });
    const view = render(<Harness projects={{ folders: [], canManage: true, onCreate }} seeds={[]} />);
    fireEvent.click(await view.findByLabelText("New project"));
    const field = await view.findByPlaceholderText("Project name");
    fireEvent.change(field, { target: { value: "Recipes" } });
    fireEvent.submit(field.closest("form") as HTMLFormElement);
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    await waitFor(() => expect(view.queryByRole("dialog")).toBeNull());
  });

  test("onSeeAll puts a Browse all projects button in the header, not a row at the end", async () => {
    const onSeeAll = mock(() => {});
    const view = render(<Harness projects={{ folders, onSeeAll }} seeds={[]} />);
    const header = (await view.findByText("Projects")).closest("[data-slot=aui_thread-list-group-label]") as HTMLElement;
    fireEvent.click(within(header).getByLabelText("Browse all projects"));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
    expect(view.queryByText("See all projects")).toBeNull();
    view.unmount();
    const plain = render(<Harness projects={{ folders }} seeds={[]} />);
    await plain.findByText("Garden");
    expect(plain.queryByLabelText("Browse all projects")).toBeNull();
  });

  test("the Projects header icons use the packed hit layer so neighbours never overlap", async () => {
    const view = render(<Harness projects={{ folders, canManage: true, onCreate: async () => {}, onSeeAll: () => {} }} seeds={[]} />);
    const header = (await view.findByText("Projects")).closest("[data-slot=aui_thread-list-group-label]") as HTMLElement;
    for (const name of ["Browse all projects", "New project"]) {
      const button = within(header).getByLabelText(name);
      expect(button.className).toContain("before:inset-x-[-1px]");
      expect(button.className).toContain("before:inset-y-[-3px]");
      expect(button.className).not.toContain("49px");
    }
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

  test("a project row draws its icon in its colour; without them it is the plain folder", async () => {
    const view = render(
      <Harness
        projects={{ folders: [{ id: "folder-garden", name: "Garden", icon: "leaf", color: "green" }, { id: "folder-trip", name: "Trip" }] }}
        seeds={[]}
      />,
    );
    const garden = (await projectRow(view, "Garden")).querySelector("[data-slot=project-mark]") as HTMLElement;
    expect(garden.dataset.hue).toBe("green");
    expect(garden.style.color).toBe("var(--hue-green)");
    const trip = (await projectRow(view, "Trip")).querySelector("[data-slot=project-mark]") as HTMLElement;
    expect(trip.dataset.hue).toBe("neutral");
  });

  test("onOpen makes the name open the page while the chevron still folds the row", async () => {
    const onOpen = mock(() => {});
    const view = render(<Harness projects={{ folders, onOpen }} seeds={[{ remoteId: "a", title: "Alpha", folder: "folder-garden" }]} />);
    const row = await projectRow(view, "Garden");
    fireEvent.click(row.querySelector("[data-slot=aui_thread-list-project-open]") as HTMLElement);
    expect(onOpen).toHaveBeenCalledWith("folder-garden");
    expect(view.queryByText("Alpha")).toBeNull();
    fireEvent.click(row.querySelector("[data-slot=aui_thread-list-project-trigger]") as HTMLElement);
    await view.findByText("Alpha");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test("Edit project, Pin project and Browse all projects appear only when the host passes them", async () => {
    const onEdit = mock(() => {});
    const onPin = mock(() => {});
    const onSeeAll = mock(() => {});
    const plain = render(<Harness projects={{ folders, canManage: true }} seeds={[]} />);
    expect(plain.queryByLabelText("Browse all projects")).toBeNull();
    plain.unmount();
    const view = render(<Harness projects={{ folders, canManage: true, onEdit, onPin, onSeeAll }} seeds={[]} />);
    const more = (await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement;
    fireEvent.pointerDown(more, { button: 0, pointerType: "mouse" });
    fireEvent.click(await view.findByText("Edit project"));
    expect(onEdit).toHaveBeenCalledWith("folder-garden");
    fireEvent.pointerDown(more, { button: 0, pointerType: "mouse" });
    fireEvent.click(await view.findByText("Pin project"));
    expect(onPin).toHaveBeenCalledWith("folder-garden", true);
    fireEvent.click(view.getByLabelText("Browse all projects"));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  test("a child's host (canManage false) gets no Edit project", async () => {
    const view = render(<Harness projects={{ folders, canManage: false, onEdit: () => {}, onPin: () => {} }} seeds={[]} />);
    fireEvent.pointerDown((await projectRow(view, "Garden")).querySelector("[data-slot=aui_thread-list-project-more]") as HTMLElement, { button: 0, pointerType: "mouse" });
    await view.findByText("Pin project");
    expect(view.queryByText("Edit project")).toBeNull();
  });

  test("pinned projects list under Pinned, before the Projects section, once", async () => {
    const view = render(
      <Harness pinnable projects={{ folders: [{ id: "folder-garden", name: "Garden", pinned: true }, { id: "folder-trip", name: "Trip" }] }} seeds={[{ remoteId: "a", title: "Alpha" }]} />,
    );
    await view.findByText("Alpha");
    expect(labels(view)).toEqual(["Pinned", "Projects", "Today"]);
    expect(view.getAllByText("Garden")).toHaveLength(1);
    const order = [...view.container.querySelectorAll("[data-slot=aui_thread-list-group-label], [data-slot=aui_thread-list-project]")].map((el) => el.textContent);
    expect(order.indexOf("Pinned")).toBeLessThan(order.findIndex((text) => text?.startsWith("Garden")));
    expect(order.findIndex((text) => text?.startsWith("Garden"))).toBeLessThan(order.indexOf("Projects"));
  });
});
