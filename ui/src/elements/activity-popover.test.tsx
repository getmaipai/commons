import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import { StatusCard } from "./status-card";
import { ActivityPopover, type ActivityPopoverItem } from "./activity-popover";

afterEach(cleanup);

const entries: ActivityPopoverItem[] = [
  { id: "done-old", state: "done", title: "Old result", at: "2026-11-10T10:00:00Z" },
  { id: "running-old", state: "running", title: "Running old", progress: 34, at: "2026-11-10T10:00:00Z" },
  { id: "failed-new", state: "failed", title: "Failed new", at: "2026-11-11T12:00:00Z" },
  { id: "running-new", state: "running", title: "Running new", progress: 68, at: "2026-11-11T12:00:00Z" },
  { id: "done-new", state: "done", title: "New result", at: "2026-11-11T11:00:00Z" },
];

describe("ActivityPopover", () => {
  test("orders running items first and then completed or failed items newest first", async () => {
    const view = render(<ActivityPopover items={entries} limit={10} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(view.getByText("Running new")).toBeTruthy());
    expect([...document.querySelectorAll("[data-slot=activity-popover-list] li section > div > div:nth-child(1)")].map((el) => el.textContent)).toEqual(["Running new", "Running old", "Failed new", "New result", "Old result"]);
  });

  test("shows running count, opens selected item, and exposes the progress value", async () => {
    const onOpen = mock(() => {});
    const view = render(<ActivityPopover items={entries} limit={10} onOpen={onOpen} emptyLabel="Nothing here" />);
    const bell = view.getByRole("button", { name: "Activity" });
    expect(bell.textContent).toContain("2");
    fireEvent.click(bell);
    await waitFor(() => expect(view.getByLabelText("68%")).toBeTruthy());
    const row = view.getByText("New result").closest("section") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "Open" }));
    expect(onOpen).toHaveBeenCalledWith("done-new");
  });

  test("renders empty copy and returns focus to the bell on close", async () => {
    const view = render(<ActivityPopover items={[]} onOpen={() => {}} emptyLabel="Nothing here" />);
    const bell = view.getByRole("button", { name: "Activity" });
    fireEvent.click(bell);
    await waitFor(() => expect(view.getByText("Nothing here")).toBeTruthy());
    fireEvent.keyDown(document.activeElement ?? bell, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(bell));
  });

  test("uses token colors and readable text and hit areas", () => {
    const { container, getByRole } = render(<ActivityPopover items={entries} onOpen={() => {}} emptyLabel="Nothing here" />);
    const bell = getByRole("button", { name: "Activity" });
    expect(bell.className).toContain("size-12");
    expect(container.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\brgb\(/i);
    expect(container.innerHTML).not.toMatch(/text-(?:\[\d+px\]|\[\d+\.\d+px\])/);
  });

  test("shows at most limit rows (default 5) then a See all row that calls onSeeAll", async () => {
    const many: ActivityPopoverItem[] = Array.from({ length: 8 }, (_, i) => ({ id: `n${i}`, state: "done" as const, title: `Item ${i}`, at: `2026-11-1${i}T10:00:00Z` }));
    const onSeeAll = mock(() => {});
    const view = render(<ActivityPopover items={many} onOpen={() => {}} onSeeAll={onSeeAll} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(document.querySelectorAll("[data-slot=activity-popover-list] li").length).toBe(5));
    fireEvent.click(view.getByRole("button", { name: "See all" }));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  test("honors a custom limit and seeAllLabel, and hides See all when everything fits", async () => {
    const three = entries.slice(0, 3);
    const view = render(<ActivityPopover items={three} limit={2} seeAllLabel="Show everything" onSeeAll={() => {}} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(view.getByRole("button", { name: "Show everything" })).toBeTruthy());
    expect(document.querySelectorAll("[data-slot=activity-popover-list] li").length).toBe(2);
    cleanup();
    const fits = render(<ActivityPopover items={three} limit={3} onSeeAll={() => {}} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(fits.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(fits.getByText("Running old")).toBeTruthy());
    expect(fits.queryByRole("button", { name: "See all" })).toBeNull();
  });

  test("draws each row with the same markup as a StatusCard", async () => {
    const item: ActivityPopoverItem = { id: "a", state: "done", title: "Cover art", line: "Made in Pictures.", stateWord: "Done", kind: "picture", thumbnailUrl: "/t.webp" };
    const view = render(<ActivityPopover items={[item]} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(view.getByText("Cover art")).toBeTruthy());
    const row = document.querySelector("[data-slot=activity-popover-list] li section") as HTMLElement;
    const ref = render(<StatusCard kind="done" stateWord="Done" title="Cover art" line="Made in Pictures." thumb="/t.webp" action={{ label: "Open", onSelect: () => {}, tone: "primary" }} />);
    const refSection = ref.container.querySelector("section") as HTMLElement;
    expect(row.getAttribute("data-status-kind")).toBe("done");
    expect(row.className).toBe(refSection.className);
    expect(row.getAttribute("style")).toBe(refSection.getAttribute("style"));
    expect(row.innerHTML).toBe(refSection.innerHTML);
  });

  test("uses a kind icon when a done row has no thumbnail", async () => {
    const items: ActivityPopoverItem[] = [
      { id: "m", state: "done", title: "A song", kind: "music" },
      { id: "v", state: "done", title: "A film", kind: "video" },
      { id: "p", state: "done", title: "A picture", kind: "picture" },
    ];
    const view = render(<ActivityPopover items={items} onOpen={() => {}} emptyLabel="Nothing here" />);
    fireEvent.click(view.getByRole("button", { name: "Activity" }));
    await waitFor(() => expect(view.getByText("A song")).toBeTruthy());
    const icons = items.map((item) => view.getByText(item.title).closest("section")!.querySelector("svg")?.getAttribute("class") ?? "");
    expect(icons[0]).toContain("music");
    expect(icons[1]).toContain("video");
    expect(icons[2]).toContain("image");
    expect(document.querySelectorAll("[data-slot=activity-popover-list] img").length).toBe(0);
  });
});
