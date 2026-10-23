import { afterEach, describe, expect, test } from "bun:test";
import { fireEvent, render, within, cleanup } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CreationHeader } from "./creation-header";
import { VisibilityChip } from "./visibility-chip";
import { SharePanel } from "./share-panel";

afterEach(cleanup);

const PEOPLE = [
  { id: "a", name: "Aster" }, { id: "b", name: "Basil" }, { id: "c", name: "Clover" }, { id: "d", name: "Dove" },
];

describe("CreationHeader", () => {
  test("shows creator/date, truncates the description, expands by keyboard, and replaces raw tokens", () => {
    const view = render(<CreationHeader title="{title}" creator={{ name: "{name}", label: "Made at home" }} madeAt="2026-10-19T12:00:00Z" description="A long description."
      visibility={{ mode: "private", people: [], canManage: false, onOpen: () => {} }} />);
    const heading = view.getByRole("heading", { name: "Untitled" });
    expect(heading).toBeTruthy();
    expect(heading.className).toContain("font-bold");
    expect(view.getByText("Made at home")).toBeTruthy();
    expect(view.container.querySelector("time")?.textContent).toMatch(/^Made /);
    expect(view.queryByText(/\{[^{}]+\}/)).toBeNull();
    const showMore = view.getByRole("button", { name: "Show more" });
    showMore.focus();
    fireEvent.keyDown(showMore, { key: "Enter" });
    fireEvent.click(showMore);
    expect(view.getByRole("button", { name: "Show less" })).toBeTruthy();
  });

  test("links the avatar and name together through the host router when creator href is present", () => {
    const view = render(<MemoryRouter initialEntries={["/"]}><Routes>
      <Route path="/" element={<CreationHeader title="Song" creator={{ name: "Aster", href: "/people/aster" }} visibility={{ mode: "private", people: [], canManage: false, onOpen: () => {} }} />} />
      <Route path="/people/aster" element={<p>Profile page</p>} />
    </Routes></MemoryRouter>);
    const link = view.getByRole("link", { name: "Aster, open profile" });
    expect(link.getAttribute("href")).toBe("/people/aster");
    expect(link.querySelector('[data-slot="avatar"]')).toBeTruthy();
    fireEvent.click(link);
    expect(view.getByText("Profile page")).toBeTruthy();
  });

  test("keeps creator avatar and name plain when href is absent", () => {
    const view = render(<CreationHeader title="Song" creator={{ name: "Aster" }} visibility={{ mode: "private", people: [], canManage: false, onOpen: () => {} }} />);
    expect(view.queryByRole("link")).toBeNull();
    expect(view.getByText("Aster")).toBeTruthy();
  });
});

describe("VisibilityChip", () => {
  test("shows a lock and Private when the item is private", () => {
    const view = render(<VisibilityChip mode="private" people={[]} canManage={false} onOpen={() => {}} />);
    const button = view.getByRole("button", { name: "Private, view sharing" });
    expect(within(button).getByText("Private")).toBeTruthy();
    expect(button.querySelector("svg.lucide-lock-keyhole")).toBeTruthy();
  });

  test("shows at most three faces and an accurate +N, and opens from a keyboard-focused button", () => {
    let opened = false;
    const view = render(<VisibilityChip mode="shared" people={PEOPLE} canManage onOpen={() => { opened = true; }} />);
    const button = view.getByRole("button", { name: "Shared, manage sharing" });
    expect(view.container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);
    expect(within(button).getByText("+1")).toBeTruthy();
    button.focus();
    expect(document.activeElement).toBe(button);
    fireEvent.click(button);
    expect(opened).toBe(true);
  });
});

describe("SharePanel", () => {
  test("is read-only for viewers and adds, removes, and makes private for managers", () => {
    const add: string[] = [];
    const remove: string[] = [];
    let madePrivate = false;
    const viewer = render(<SharePanel open onOpenChange={() => {}} people={PEOPLE.slice(0, 1)} candidates={PEOPLE} canManage={false} onAdd={() => {}} onRemove={() => {}} onMakePrivate={() => {}} />);
    const viewDialog = within(document.body).getByRole("dialog");
    expect(within(viewDialog).getByRole("switch", { name: "Aster" })).toBeDisabled();
    expect(within(viewDialog).queryByText("Make private")).toBeNull();
    viewer.unmount();
    render(<SharePanel open onOpenChange={() => {}} people={PEOPLE.slice(0, 1)} candidates={PEOPLE} canManage onAdd={(id) => { add.push(id); }} onRemove={(id) => { remove.push(id); }} onMakePrivate={() => { madePrivate = true; }} />);
    const manageDialog = within(document.body).getByRole("dialog");
    fireEvent.click(within(manageDialog).getByRole("switch", { name: "Basil" }));
    fireEvent.click(within(manageDialog).getByRole("switch", { name: "Aster" }));
    fireEvent.click(within(manageDialog).getByRole("button", { name: "Make private" }));
    expect(add).toEqual(["b"]);
    expect(remove).toEqual(["a"]);
    expect(madePrivate).toBe(true);
  });
});
