import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { FolderPicker, pathCrumbs, type FolderPickerCopy, type FolderPickerListing } from "@/kit/primitives/FolderPicker";

afterEach(cleanup);

const copy: FolderPickerCopy = {
  title: "Choose a folder",
  upLabel: "Up",
  chooseLabel: "Choose this folder",
  newFolderLabel: "New folder",
  newFolderNameLabel: "Folder name",
  createLabel: "Create folder",
  cancelLabel: "Cancel",
  emptyText: "No folders here.",
  errorText: "Could not read that folder. Pick another.",
  retryLabel: "Try again",
  loadingLabel: "Loading folders",
  freeSpaceLabel: (f) => `${f} free`,
};

const listing: FolderPickerListing = {
  path: "/data/maipai",
  parent: "/data",
  freeBytes: 5_000_000_000,
  rows: [
    { name: "models", path: "/data/maipai/models", writable: true },
    { name: "locked", path: "/data/maipai/locked", writable: false, disabledReason: "Read only. Pick another folder." },
  ],
};

function setup(over: Partial<React.ComponentProps<typeof FolderPicker>> = {}) {
  const h = { onOpen: mock((_p: string) => {}), onUp: mock(() => {}), onChoose: mock((_p: string) => {}), onCreate: mock((_n: string) => {}) };
  const utils = render(<FolderPicker listing={listing} copy={copy} {...h} {...over} />);
  return { h, ...utils };
}

describe("FolderPicker", () => {
  test("splits POSIX and Windows paths into crumbs", () => {
    expect(pathCrumbs("/a/b").map((c) => c.path)).toEqual(["/", "/a", "/a/b"]);
    expect(pathCrumbs("C:\\a\\b").map((c) => c.path)).toEqual(["C:\\", "C:\\a", "C:\\a\\b"]);
  });

  test("opening a row, a crumb and Up report their paths", () => {
    const { h, getByRole } = setup();
    fireEvent.click(getByRole("button", { name: "models" }));
    expect(h.onOpen).toHaveBeenCalledWith("/data/maipai/models");
    fireEvent.click(getByRole("button", { name: "data" }));
    expect(h.onOpen).toHaveBeenCalledWith("/data");
    fireEvent.click(getByRole("button", { name: "Up" }));
    expect(h.onUp).toHaveBeenCalledTimes(1);
  });

  test("the current folder is the last crumb and not a button", () => {
    const { getByText } = setup();
    expect(getByText("maipai").getAttribute("aria-current")).toBe("page");
  });

  test("Up is disabled at the top of the tree", () => {
    const { getByRole } = setup({ listing: { ...listing, path: "/", parent: null, rows: [] } });
    expect((getByRole("button", { name: "Up" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("a disabled row shows its reason and cannot be opened", () => {
    const { h, getByText, queryByRole } = setup();
    expect(getByText("Read only. Pick another folder.")).toBeTruthy();
    expect(queryByRole("button", { name: /locked/ })).toBeNull();
    expect(h.onOpen).not.toHaveBeenCalled();
  });

  test("Choose this folder reports the current path", () => {
    const { h, getByRole } = setup();
    fireEvent.click(getByRole("button", { name: "Choose this folder" }));
    expect(h.onChoose).toHaveBeenCalledWith("/data/maipai");
  });

  test("New folder opens a name field; Create sends the trimmed name and closes it", () => {
    const { h, getByRole, getByLabelText, queryByLabelText } = setup();
    fireEvent.click(getByRole("button", { name: "New folder" }));
    const create = getByRole("button", { name: "Create folder" }) as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    fireEvent.change(getByLabelText("Folder name"), { target: { value: "  Home data " } });
    fireEvent.click(create);
    expect(h.onCreate).toHaveBeenCalledWith("Home data");
    expect(queryByLabelText("Folder name")).toBeNull();
  });

  test("Cancel closes the name field without creating", () => {
    const { h, getByRole, queryByLabelText } = setup();
    fireEvent.click(getByRole("button", { name: "New folder" }));
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(queryByLabelText("Folder name")).toBeNull();
    expect(h.onCreate).not.toHaveBeenCalled();
  });

  test("shows free space, and the empty text when there are no subfolders", () => {
    const { getByText } = setup({ listing: { ...listing, rows: [] } });
    expect(getByText(/free$/)).toBeTruthy();
    expect(getByText("No folders here.")).toBeTruthy();
  });

  test("loading shows skeletons with a status label and no actions", () => {
    const { getByRole, queryByRole } = setup({ listing: undefined });
    expect(getByRole("status").getAttribute("aria-label")).toBe("Loading folders");
    expect(queryByRole("button", { name: "Choose this folder" })).toBeNull();
  });

  test("a refetch dims the list and blocks Choose", () => {
    const { getByRole } = setup({ loading: true });
    expect((getByRole("button", { name: "Choose this folder" }) as HTMLButtonElement).disabled).toBe(true);
  });

  test("error shows the sentence and Try again calls onRetry", () => {
    const onRetry = mock(() => {});
    const { getByRole, getByText } = setup({ error: true, onRetry });
    expect(getByRole("alert")).toBeTruthy();
    expect(getByText("Could not read that folder. Pick another.")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
