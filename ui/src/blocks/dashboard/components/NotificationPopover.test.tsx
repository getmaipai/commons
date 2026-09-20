import { describe, expect, test, afterEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotificationPopover, type NotificationPopoverItem } from "./NotificationPopover";

afterEach(cleanup);

function openPopover(trigger: HTMLElement): void {
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 });
    fireEvent.click(trigger);
  });
}

const ITEMS: NotificationPopoverItem[] = [
  { id: "1", title: "First notification", at: "2026-09-20T00:00:00.000Z", read: false },
  { id: "2", title: "Second notification", at: "2026-09-19T00:00:00.000Z", read: true },
];

describe("NotificationPopover", () => {
  test("shows an unread-count badge only when something is unread", () => {
    const { getByRole, rerender } = render(
      <MemoryRouter>
        <NotificationPopover items={ITEMS} open={false} onOpenChange={() => {}} onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(getByRole("button", { name: /1 unread/ })).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <NotificationPopover items={[]} open={false} onOpenChange={() => {}} onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(getByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  // Owner finding, 2026-09-20 17:40 ("The rail geometry, exactly"):
  // "counts above 9 show '9+'" - a real unread count can pile up past
  // what a 16px circle can show as digits.
  test("shows 9+ once the unread count passes nine, not the literal number", () => {
    const many: NotificationPopoverItem[] = Array.from({ length: 24 }, (_, i) => ({
      id: `n${i}`,
      title: `Notification ${i}`,
      at: "2026-09-20T00:00:00.000Z",
      read: false,
    }));
    const { getByText, getByRole } = render(
      <MemoryRouter>
        <NotificationPopover items={many} open={false} onOpenChange={() => {}} onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(getByText("9+")).toBeInTheDocument();
    expect(getByRole("button", { name: /24 unread/ })).toBeInTheDocument();
  });

  test("opening shows every item and an empty message when there are none", () => {
    const { getByRole, getByText } = render(
      <MemoryRouter>
        <NotificationPopover items={[]} open onOpenChange={() => {}} onDismiss={() => {}} emptyMessage="All caught up." />
      </MemoryRouter>,
    );
    openPopover(getByRole("button", { name: "Notifications" }));
    expect(getByText("All caught up.")).toBeInTheDocument();
  });

  test("dismissing one item calls onDismiss with only its id", () => {
    const onDismiss = mock((_id: string) => {});
    const { getByRole, getAllByRole } = render(
      <MemoryRouter>
        <NotificationPopover items={ITEMS} open onOpenChange={() => {}} onDismiss={onDismiss} />
      </MemoryRouter>,
    );
    openPopover(getByRole("button", { name: /unread/ }));
    fireEvent.click(getAllByRole("button", { name: /Dismiss/ })[0]!);
    expect(onDismiss).toHaveBeenCalledWith("1");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test("mark all read and clear all are disabled when there's nothing to act on", () => {
    const { getByRole } = render(
      <MemoryRouter>
        <NotificationPopover items={[]} open onOpenChange={() => {}} onDismiss={() => {}} onMarkAllRead={() => {}} onClearAll={() => {}} />
      </MemoryRouter>,
    );
    expect(getByRole("button", { name: "Mark all read" })).toBeDisabled();
    expect(getByRole("button", { name: "Clear all" })).toBeDisabled();
  });

  test("calls onVisible with the unread ids that became visible on open", () => {
    const onVisible = mock((_ids: string[]) => {});
    render(
      <MemoryRouter>
        <NotificationPopover items={ITEMS} open onOpenChange={() => {}} onDismiss={() => {}} onVisible={onVisible} />
      </MemoryRouter>,
    );
    expect(onVisible).toHaveBeenCalledWith(["1"]);
  });

  test("renders a history link only when historyHref is given", () => {
    const { getByRole, queryByRole, rerender } = render(
      <MemoryRouter>
        <NotificationPopover items={[]} open onOpenChange={() => {}} onDismiss={() => {}} />
      </MemoryRouter>,
    );
    expect(queryByRole("link", { name: "See all" })).not.toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <NotificationPopover items={[]} open onOpenChange={() => {}} onDismiss={() => {}} historyHref="/notifications" />
      </MemoryRouter>,
    );
    expect(getByRole("link", { name: "See all" })).toBeInTheDocument();
  });
});
