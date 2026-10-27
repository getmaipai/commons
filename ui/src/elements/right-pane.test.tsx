import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { RightPane } from "./right-pane";

afterEach(cleanup);

const props = (overrides: Partial<React.ComponentProps<typeof RightPane>> = {}) => ({
  open: true,
  onOpenChange: () => {},
  pinned: false,
  onPinnedChange: () => {},
  companionTab: { id: "companion", label: "Chat", content: <p>Chat body</p> },
  activeTab: "companion",
  onActiveTabChange: () => {},
  avatar: <span>Avatar slot</span>,
  pinLabel: "Pin pane",
  closeLabel: "Close pane",
  label: "Companion pane",
  ...overrides,
});

test("companion tab stays first and header actions precede the avatar", () => {
  const view = render(<RightPane {...props({ tabs: [{ id: "details", label: "Details", content: <p>Details body</p> }], headerActions: <span>Header action</span> })} />);
  const triggers = view.getAllByRole("tab");
  expect(triggers.map((tab) => tab.textContent)).toEqual(["Chat", "Details"]);
  const action = view.getByText("Header action");
  const avatar = view.getByText("Avatar slot");
  expect(action.compareDocumentPosition(avatar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(view.getByRole("button", { name: "Pin pane" })).toBeTruthy();
  expect(view.getByRole("button", { name: "Close pane" })).toBeTruthy();
});

test("missing active tab falls back to companion; pin and close call handlers", async () => {
  const changes: unknown[] = [];
  const view = render(<RightPane {...props({ tabs: [], activeTab: "gone", onActiveTabChange: (id) => changes.push(id), onPinnedChange: (pinned) => changes.push(pinned), onOpenChange: (open) => changes.push(open) })} />);
  expect(view.getByRole("tab", { name: "Chat" }).getAttribute("data-state")).toBe("active");
  await waitFor(() => expect(changes).toContain("companion"));
  fireEvent.click(view.getByRole("button", { name: "Pin pane" }));
  fireEvent.click(view.getByRole("button", { name: "Close pane" }));
  expect(changes).toContain(true);
  expect(changes).toContain(false);
});

test("phone breakpoint renders the kit sheet variant", async () => {
  const oldWidth = window.innerWidth;
  const calls: boolean[] = [];
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
  window.dispatchEvent(new Event("resize"));
  const view = render(<RightPane {...props({ onOpenChange: (open) => calls.push(open) })} />);
  await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog).toBeTruthy();
  fireEvent.keyDown(dialog!, { key: "Escape" });
  await waitFor(() => expect(calls).toContain(false));
  view.unmount();
  Object.defineProperty(window, "innerWidth", { configurable: true, value: oldWidth });
  window.dispatchEvent(new Event("resize"));
});

test("desktop: a pinned pane sits in flow, an unpinned one floats with a backdrop that closes it", () => {
  const calls: boolean[] = [];
  const pinned = render(<RightPane {...props({ pinned: true })} />);
  expect(document.querySelector('[data-slot="right-pane"][data-pinned]')).toBeTruthy();
  expect(document.querySelector('[data-slot="right-pane-backdrop"]')).toBeNull();
  pinned.unmount();
  const floating = render(<RightPane {...props({ onOpenChange: (open) => calls.push(open) })} />);
  const backdrop = document.querySelector('[data-slot="right-pane-backdrop"]') as HTMLElement;
  expect(backdrop).toBeTruthy();
  fireEvent.click(backdrop);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(calls).toEqual([false, false]);
  floating.unmount();
});

test("a closed desktop pane draws nothing", () => {
  const view = render(<RightPane {...props({ open: false })} />);
  expect(view.container.querySelector('[data-slot="right-pane"]')).toBeNull();
});
