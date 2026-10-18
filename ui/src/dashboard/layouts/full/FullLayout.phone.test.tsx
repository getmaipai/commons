import { afterEach, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FullLayout from "./FullLayout";
import { TooltipProvider } from "../../components/ui/tooltip";

const original = window.matchMedia;
afterEach(() => { cleanup(); window.matchMedia = original; });
function media(width: number, height = 900, coarse = false) {
  const listeners = new Set<() => void>();
  const queries = new Map<string, MediaQueryList>();
  window.matchMedia = ((query: string) => {
    if (!queries.has(query)) queries.set(query, {
      get matches() { return query.includes("max-width: 639.98px") ? width < 640 : query.includes("pointer: coarse") ? coarse && height < 500 : false; },
      media: query, addEventListener: (_: string, fn: () => void) => { listeners.add(fn); }, removeEventListener: (_: string, fn: () => void) => { listeners.delete(fn); },
    } as unknown as MediaQueryList);
    return queries.get(query)!;
  }) as typeof window.matchMedia;
  return (next: number) => { width = next; act(() => listeners.forEach((fn) => fn())); };
}
function shell(hideMobileMenu = false) {
  return render(<MemoryRouter><TooltipProvider><Routes><Route element={<FullLayout rail hideMobileMenu={hideMobileMenu} mobileSections={<a href="/sections">App sections</a>} railProfile={<button>My profile</button>} settingsHref="/settings" railApps={[{ name: "Weather", url: "/weather", icon: "cloud-sun", pinned: true }, { name: "Notes", url: "/notes", icon: "layout-grid", pinned: false }]} sidebarItemStatus={(item) => ({ title: "Degraded", ariaLabel: `${item.name}: degraded` })} />}><Route path="*" element={<div>Page</div>} /></Route></Routes></TooltipProvider></MemoryRouter>);
}
for (const [width, height, coarse] of [[360, 900, false], [402, 900, false], [874, 402, true]] as const) {
  test(`phone drawer at ${width}x${height}`, async () => {
    media(width, height, coarse);
    const view = shell();
    expect(view.queryByRole("navigation", { name: "Primary navigation" })).toBeNull();
    const button = view.getByRole("button", { name: "Open menu" });
    fireEvent.click(button);
    const dialog = await view.findByRole("dialog", { name: "App menu" });
    expect(dialog.getAttribute("data-slot")).toBe("mobile-nav-drawer");
    for (const name of ["Home", "Chat", "Library", "Family", "Weather", "Notes"]) {
      const link = view.getByRole("link", { name: `${name}: degraded` });
      expect(link.querySelector('[data-slot="rail-status-mark"]')).toBeTruthy();
    }
    expect(view.getByRole("button", { name: "Search" })).toBeTruthy();
    expect(view.getByText("App sections")).toBeTruthy();
    expect(view.getByRole("button", { name: "My profile" })).toBeTruthy();
    expect(view.getByRole("link", { name: "Settings" })).toBeTruthy();
    fireEvent.click(view.getByRole("link", { name: "Chat: degraded" }));
    await waitFor(() => expect(view.queryByRole("dialog") === null).toBe(true));
    await waitFor(() => expect(document.activeElement === button).toBe(true));
  });
}
for (const width of [744, 1440]) test(`desktop rail at ${width}`, () => {
  media(width);
  const view = shell();
  expect(view.getByRole("navigation", { name: "Primary navigation" }).className).toContain("w-[var(--rail-width,56px)]");
  expect(view.queryByRole("button", { name: "Open menu" })).toBeNull();
  expect(view.queryByRole("dialog") === null).toBe(true);
});
test("reacts to media changes and contains overflow", () => {
  const resize = media(744);
  const view = shell();
  resize(360);
  expect(view.getByRole("button", { name: "Open menu" })).toBeTruthy();
  for (const slot of ["rail-shell", "rail-workspace", "rail-body"]) {
    const classes = view.container.querySelector(`[data-slot="${slot}"]`)!.className;
    expect(classes).toContain("min-w-0"); expect(classes).toContain("max-w-full");
  }
  expect(view.container.querySelector('[data-slot="rail-shell"]')!.className).toContain("overflow-x-clip");
});
test("immersive mode hides the button and disables swipe", () => {
  media(360); const view = shell(true);
  expect(view.queryByRole("button", { name: "Open menu" })).toBeNull();
  fireEvent.touchStart(document, { touches: [{ clientX: 5, clientY: 50 }] });
  fireEvent.touchMove(document, { touches: [{ clientX: 80, clientY: 50 }] });
  expect(view.queryByRole("dialog") === null).toBe(true);
});
test("edge swipe opens and Escape closes", async () => {
  media(360); const view = shell();
  fireEvent.touchStart(document, { touches: [{ clientX: 5, clientY: 50 }] });
  fireEvent.touchMove(document, { touches: [{ clientX: 80, clientY: 50 }] });
  const dialog = await view.findByRole("dialog");
  fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
  await waitFor(() => expect(view.queryByRole("dialog") === null).toBe(true));
});
test("missing matchMedia keeps the desktop fallback", () => {
  window.matchMedia = undefined as unknown as typeof window.matchMedia;
  expect(shell().getByRole("navigation", { name: "Primary navigation" })).toBeTruthy();
});

test("phone touch controls are at least 48px (the touch-target floor)", async () => {
  media(360);
  const view = shell();
  const button = view.getByRole("button", { name: "Open menu" });
  expect(button.className).toContain("size-12");
  fireEvent.click(button);
  const dialog = await view.findByRole("dialog", { name: "App menu" });
  expect(view.getByRole("link", { name: "Settings" }).className).toContain("size-12");
  for (const name of ["Home", "Chat", "Library"]) {
    const link = dialog.querySelector(`a[aria-label^="${name}"]`) as HTMLElement | null;
    expect(link?.className ?? "").toContain("min-h-12");
    expect(link?.className ?? "").not.toContain("min-h-11");
  }
});
