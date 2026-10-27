import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { ChatHeader } from "@/kit/elements/chat-header";

afterEach(cleanup);

describe("ChatHeader", () => {
  test("labels the character and controls and calls their handlers", () => {
    let menus = 0;
    let calls = 0;
    const { getByRole, getByText } = render(<ChatHeader name="Marlow" media={<span>portrait</span>} onMenu={() => menus++} onCall={() => calls++} />);
    expect(getByText("Marlow")).toBeTruthy();
    expect(getByText("portrait")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Open menu" }));
    fireEvent.click(getByRole("button", { name: "Call Marlow" }));
    expect(menus).toBe(1);
    expect(calls).toBe(1);
  });

  test("fills the width of its slot", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} />);
    expect(getByRole("banner").className).toContain("w-full");
  });

  test("hides menu and call controls when handlers are absent", () => {
    const { queryByRole } = render(<ChatHeader name="Marlow" media={<span />} />);
    expect(queryByRole("button", { name: "Open menu" })).toBeNull();
    expect(queryByRole("button", { name: "Call Marlow" })).toBeNull();
  });

  test("does not make the identity interactive without a menu", () => {
    const { queryByRole } = render(<ChatHeader name="Marlow" media={<span />} />);
    expect(queryByRole("button", { name: "Change companion" })).toBeNull();
  });

  test("renders a companion picker trigger for the supplied menu item", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} identityMenu={<span>Choose another</span>} />);
    expect(getByRole("button", { name: "Change companion" })).toBeTruthy();
  });

  test("draws each choice with its face and reports a selection", async () => {
    const picked: string[] = [];
    const { getByRole, findByRole } = render(<ChatHeader name="Marlow" media={<span />} identityValue="a" onIdentityChange={(value) => picked.push(value)} identityChoices={[{ value: "a", label: "Sprout" }, { value: "b", label: "Rivet", imageUrl: "/rivet.png" }]} />);
    const trigger = getByRole("button", { name: "Change companion" });
    act(() => { fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 }); fireEvent.click(trigger); });
    expect((await findByRole("menuitemradio", { name: "Sprout" })).getAttribute("aria-checked")).toBe("true");
    const row = getByRole("menuitemradio", { name: "Sprout" });
    // A choice without a picture draws the seeded illustrated face (the kit Avatar primitive), never a bare letter.
    expect(row.querySelector("[data-slot=\"avatar\"]")?.getAttribute("class")).toContain("size-9");
    expect(getByRole("menuitemradio", { name: "Rivet" }).querySelector('[data-slot="avatar"]')).toBeTruthy();
    fireEvent.click(getByRole("menuitemradio", { name: "Rivet" }));
    expect(picked).toEqual(["b"]);
  });

  test("renders optional companion descriptions, hints, intro and notice", async () => {
    const { getByRole, findByText, getByText } = render(<ChatHeader name="Marlow" media={<span />} identityNotice="Nova will answer next." identityIntro="Earlier messages keep their original speaker." identityChoices={[{ value: "a", label: "Nova", description: "A thoughtful guide", hint: "Standard assistant" }]} />);
    expect(getByRole("status").textContent).toBe("Nova will answer next.");
    const trigger = getByRole("button", { name: "Change companion" });
    act(() => { fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 }); fireEvent.click(trigger); });
    expect(await findByText("A thoughtful guide")).toBeTruthy();
    expect(getByText("Standard assistant")).toBeTruthy();
    expect(getByText("Earlier messages keep their original speaker.")).toBeTruthy();
  });

  test("renders the old identity markup when new props are absent", () => {
    const { container } = render(<ChatHeader name="Marlow" media={<span>portrait</span>} identityChoices={[{ value: "a", label: "Sprout" }]} />);
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(container.querySelector('[data-slot="input"]')).toBeNull();
    expect(container.textContent).not.toContain("Earlier messages");
    expect(container.textContent).toBe("portraitMarlow");
  });

  test("searches large companion lists and selects filtered choices without closing while typing", async () => {
    const picked: string[] = [];
    const choices = [
      { value: "a", label: "Sprout", description: "Garden helper" },
      { value: "b", label: "Rivet" },
      { value: "c", label: "Nova", description: "Standard assistant" },
      { value: "d", label: "Moss" },
      { value: "e", label: "Pip" },
      { value: "f", label: "Sable" },
    ];
    const { getByRole, queryByRole, findByRole, findByText } = render(<ChatHeader name="Marlow" media={<span />} identityChoices={choices} identityValue="a" onIdentityChange={(value) => picked.push(value)} identitySearchLabel="Search companions" identityFooter={<a href="/manage">Manage companions</a>} />);
    const trigger = getByRole("button", { name: "Change companion" });
    act(() => { fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 }); fireEvent.click(trigger); });
    const search = getByRole("textbox", { name: "Search companions" });
    fireEvent.change(search, { target: { value: "standard" } });
    expect(await findByRole("menuitemradio", { name: /Nova/ })).toBeTruthy();
    expect(queryByRole("menuitemradio", { name: /Sprout/ })).toBeNull();
    expect(getByRole("menu")).toBeTruthy();
    expect(getByRole("link", { name: "Manage companions" })).toBeTruthy();
    fireEvent.click(getByRole("menuitemradio", { name: /Nova/ }));
    expect(picked).toEqual(["c"]);
    expect(await findByText("Search companions").catch(() => null)).toBeNull();
  });

  test("only shows search for more than five choices and reports empty matches", async () => {
    const few = Array.from({ length: 5 }, (_, index) => ({ value: `${index}`, label: `Choice ${index}` }));
    const { getByRole, queryByRole } = render(<ChatHeader name="Marlow" media={<span />} identityChoices={few} identitySearchLabel="Search" />);
    let trigger = getByRole("button", { name: "Change companion" });
    act(() => { fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 }); fireEvent.click(trigger); });
    expect(queryByRole("textbox", { name: "Search" })).toBeNull();
    cleanup();
    const six = [...few, { value: "x", label: "Extra" }];
    const result = render(<ChatHeader name="Marlow" media={<span />} identityChoices={six} identitySearchLabel="Search" />);
    trigger = result.getByRole("button", { name: "Change companion" });
    act(() => { fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 2 }); fireEvent.click(trigger); });
    fireEvent.change(result.getByRole("textbox", { name: "Search" }), { target: { value: "missing" } });
    expect(await result.findByText("No companion matches. Clear the search to see them all.")).toBeTruthy();
  });

  test("does not render a gradient smear below the header", () => {
    const { container } = render(<ChatHeader name="Marlow" media={<span />} />);
    expect(container.innerHTML).not.toContain("from-background");
  });

  test("renders actions immediately left of the call button", () => {
    const { getByRole, getByText } = render(<ChatHeader name="Marlow" media={<span />} onCall={() => {}} actions={<button type="button">More</button>} />);
    const more = getByText("More");
    const call = getByRole("button", { name: "Call Marlow" });
    expect(more.nextElementSibling).toBe(call);
  });

  test("renders actions without a call button", () => {
    const { getByText, queryByRole } = render(<ChatHeader name="Marlow" media={<span />} actions={<button type="button">More</button>} />);
    expect(getByText("More")).toBeTruthy();
    expect(queryByRole("button", { name: "Call Marlow" })).toBeNull();
  });

  test("forwards menuExpanded and menuControls to the menu button", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} onMenu={() => {}} menuExpanded menuControls="side-nav" />);
    const menu = getByRole("button", { name: "Open menu" });
    expect(menu.getAttribute("aria-expanded")).toBe("true");
    expect(menu.getAttribute("aria-controls")).toBe("side-nav");
  });

  test("leaves aria-expanded and aria-controls off when not given", () => {
    const { getByRole } = render(<ChatHeader name="Marlow" media={<span />} onMenu={() => {}} />);
    const menu = getByRole("button", { name: "Open menu" });
    expect(menu.hasAttribute("aria-expanded")).toBe(false);
    expect(menu.hasAttribute("aria-controls")).toBe(false);
  });
});

describe("ChatHeader reserveEnd", () => {
  test("leaves room at the end only when asked", () => {
    const withRoom = render(<ChatHeader name="Marlow" media={<span>portrait</span>} reserveEnd />);
    expect(withRoom.container.querySelector("header")?.className).toContain("pe-16");
    cleanup();
    const without = render(<ChatHeader name="Marlow" media={<span>portrait</span>} />);
    expect(without.container.querySelector("header")?.className).not.toContain("pe-16");
  });
});
