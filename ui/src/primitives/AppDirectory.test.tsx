import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppDirectory, groupApps, matchesApp, type DirectoryApp } from "@/kit/primitives/AppDirectory";

afterEach(cleanup);

const categories = ["Everyday", "Media", "Utilities", "Games"];
function fake(n: number, favorites: number[] = []): DirectoryApp[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `app${i}`,
    name: `App ${String(i).padStart(2, "0")}`,
    to: `/apps/app${i}`,
    icon: "layout-grid",
    description: `Does thing number ${i}`,
    category: categories[i % categories.length]!,
    keywords: i === 7 ? ["forecast"] : [],
    favorite: favorites.includes(i),
  }));
}
const core: DirectoryApp[] = [{ id: "chat", name: "Chat", to: "/chat", icon: "message-circle", category: "Everyday", favorite: false, builtIn: true }];

function show(apps: DirectoryApp[], over: Partial<React.ComponentProps<typeof AppDirectory>> = {}) {
  const onToggleFavorite = mock((_app: DirectoryApp) => {});
  const view = render(<MemoryRouter><AppDirectory apps={apps} onToggleFavorite={onToggleFavorite} {...over} /></MemoryRouter>);
  return { ...view, onToggleFavorite };
}

describe("AppDirectory", () => {
  test("the search box is focused on open and the page says how many apps there are", () => {
    const view = show(fake(60));
    expect(document.activeElement).toBe(view.getByRole("searchbox", { name: "Search apps" }));
    expect(view.getByRole("status").textContent).toBe("60 apps");
    expect(view.container.querySelectorAll("[data-app-tile]").length).toBe(60);
  });

  test("with no query: Favorites first, then one section per category alphabetically, built in last", () => {
    const sections = groupApps([...fake(12, [3, 5]), ...core]);
    expect(sections.map((s) => s.heading)).toEqual(["Favorites", "Everyday", "Games", "Media", "Utilities", "Built in"]);
    expect(sections[0]!.apps.map((a) => a.id)).toEqual(["app3", "app5"]);
    expect(sections[1]!.apps.some((a) => a.id === "app3")).toBe(false);
  });

  test("typing filters as you type, across name, description, category and keywords", () => {
    const view = show(fake(60));
    const box = view.getByRole("searchbox", { name: "Search apps" });
    fireEvent.change(box, { target: { value: "app 07" } });
    expect(view.container.querySelectorAll("[data-app-tile]").length).toBe(1);
    expect(view.getByRole("status").textContent).toBe('1 app matches "app 07"');
    fireEvent.change(box, { target: { value: "forecast" } });
    expect(view.container.querySelectorAll("[data-app-tile]").length).toBe(1);
    fireEvent.change(box, { target: { value: "games" } });
    expect(view.container.querySelectorAll("[data-app-tile]").length).toBe(15);
    expect(matchesApp(fake(1)[0]!, "thing number 0")).toBe(true);
  });

  test("no match is an empty state with Clear search, and Escape clears too", () => {
    const view = show(fake(10));
    const box = view.getByRole("searchbox", { name: "Search apps" }) as HTMLInputElement;
    fireEvent.change(box, { target: { value: "zzzz" } });
    expect(view.getByText(/No apps match "zzzz"/)).toBeTruthy();
    fireEvent.click(view.getByRole("button", { name: "Clear search" }));
    expect(box.value).toBe("");
    expect(view.container.querySelectorAll("[data-app-tile]").length).toBe(10);
    fireEvent.change(box, { target: { value: "qq" } });
    fireEvent.keyDown(box, { key: "Escape" });
    expect(box.value).toBe("");
  });

  test("a star adds or removes a favorite and is named for its app", () => {
    const view = show(fake(5, [1]));
    fireEvent.click(view.getByRole("button", { name: "Remove App 01 from favorites" }));
    fireEvent.click(view.getByRole("button", { name: "Add App 02 to favorites" }));
    expect(view.onToggleFavorite.mock.calls.map(([app]) => app.id)).toEqual(["app1", "app2"]);
    expect(view.getByRole("button", { name: "Remove App 01 from favorites" }).getAttribute("aria-pressed")).toBe("true");
  });

  test("at the rail's limit a new star is held with the reason, and removing one stays possible", () => {
    const view = show(fake(10, [0, 1, 2]), { favoritesLimit: 3 });
    const held = view.getByRole("button", { name: /Add App 05 to favorites \(the rail is full, remove one first\)/ }) as HTMLButtonElement;
    expect(held.disabled).toBe(true);
    expect((view.getByRole("button", { name: "Remove App 01 from favorites" }) as HTMLButtonElement).disabled).toBe(false);
    expect(view.getByText("3 of 3 in the left rail")).toBeTruthy();
    expect(view.getByRole("heading", { name: "Favorites 3 of 3 in the left rail" })).toBeTruthy();
  });

  test("built-in apps open but have no star", () => {
    const view = show([...fake(2), ...core]);
    expect(view.getByRole("link", { name: /Chat/ }).getAttribute("href")).toBe("/chat");
    expect(view.queryByRole("button", { name: /Chat.*favorites/ })).toBeNull();
  });

  test("keyboard: Down from the search box lands on the first tile, arrows walk the grid, Left from the first returns", () => {
    const view = show(fake(6));
    const box = view.getByRole("searchbox", { name: "Search apps" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    const tiles = [...view.container.querySelectorAll<HTMLElement>("[data-app-tile]")];
    expect(document.activeElement).toBe(tiles[0]!);
    fireEvent.keyDown(tiles[0]!, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tiles[1]!);
    fireEvent.keyDown(tiles[1]!, { key: "End" });
    expect(document.activeElement).toBe(tiles[tiles.length - 1]!);
    fireEvent.keyDown(tiles[tiles.length - 1]!, { key: "Home" });
    expect(document.activeElement).toBe(tiles[0]!);
    fireEvent.keyDown(tiles[0]!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(box);
  });

  test("Enter on a single match opens it", async () => {
    const view = show(fake(10));
    const box = view.getByRole("searchbox", { name: "Search apps" });
    fireEvent.change(box, { target: { value: "app 04" } });
    const clicked = mock(() => {});
    view.container.querySelector("[data-app-tile]")!.addEventListener("click", (event) => { event.preventDefault(); clicked(); });
    fireEvent.keyDown(box, { key: "Enter" });
    await waitFor(() => expect(clicked).toHaveBeenCalled());
  });

  test("the open app's tile is marked current", () => {
    const view = show(fake(3), { currentTo: "/apps/app1" });
    expect(view.getByRole("link", { name: /App 01/ }).getAttribute("aria-current")).toBe("page");
  });
});
