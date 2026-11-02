// VIDEO-CREATE-02: the picture-card choice of a prompt bar chip.
import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { OptionCards } from "./option-cards";
import { PromptBar } from "./prompt-bar";

const options = [
  { value: "none", label: "Natural" },
  { value: "anime", label: "Anime", media: "/loops/anime.mp4" },
  { value: "film", label: "Film", media: "/loops/film.webp" },
];

const realMatchMedia = window.matchMedia;
let plays = 0;
let pauses = 0;
beforeEach(() => {
  plays = 0; pauses = 0;
  spyOn(HTMLMediaElement.prototype, "play").mockImplementation(() => { plays += 1; return Promise.resolve(); });
  spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => { pauses += 1; });
  stubMatchMedia({ "(hover: hover) and (min-width: 640px)": true });
});
afterEach(() => { cleanup(); mock.restore(); window.matchMedia = realMatchMedia; });

describe("OptionCards", () => {
  test("renders a radio group of cards, the value checked", () => {
    const view = render(<OptionCards label="Look" options={options} value="anime" onValueChange={() => {}} />);
    expect(view.getByRole("radiogroup", { name: "Look" })).toBeTruthy();
    expect(view.getAllByRole("radio").length).toBe(3);
    expect(view.getByRole("radio", { name: "Anime" }).getAttribute("aria-checked")).toBe("true");
    expect(view.getByRole("radio", { name: "Natural" }).getAttribute("aria-checked")).toBe("false");
  });

  test("a click chooses and reports the option with its own type", () => {
    const picked: (string | number)[] = [];
    const numbers = [{ value: 5, label: "Five" }, { value: 10, label: "Ten" }];
    const view = render(<OptionCards label="Length" options={numbers} value={5} onValueChange={(v) => picked.push(v)} />);
    fireEvent.click(view.getByRole("radio", { name: "Ten" }));
    expect(picked).toEqual([10]);
  });

  test("arrow keys move the choice and Enter selects", async () => {
    const picked: (string | number)[] = [];
    const view = render(<OptionCards label="Look" options={options} value="none" onValueChange={(v) => picked.push(v)} />);
    const first = view.getByRole("radio", { name: "Natural" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const second = view.getByRole("radio", { name: "Anime" });
    await waitFor(() => expect(document.activeElement === second).toBe(true));
    await waitFor(() => expect(picked).toContain("anime"));
    picked.length = 0;
    fireEvent.keyDown(second, { key: "Enter" });
    expect(picked).toEqual(["anime"]);
  });

  test("a media option holds a muted looping inline video; a no-media option is a plain tile; an image is an img", () => {
    const view = render(<OptionCards label="Look" options={options} value="none" onValueChange={() => {}} />);
    const video = view.container.querySelector("video")!;
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.hasAttribute("playsinline")).toBe(true);
    expect(video.getAttribute("src")).toContain("/loops/anime.mp4");
    expect(view.getByRole("radio", { name: "Natural" }).querySelector("video,img")).toBeNull();
    expect(view.getByRole("radio", { name: "Natural" }).textContent).toContain("Natural");
    expect(view.container.querySelectorAll("img").length).toBe(1);
  });

  test("on a wide screen the loop plays on hover and stops after", () => {
    const view = render(<OptionCards label="Look" options={options} value="none" onValueChange={() => {}} />);
    const card = view.getByRole("radio", { name: "Anime" });
    fireEvent.mouseEnter(card);
    expect(plays).toBe(1);
    fireEvent.mouseLeave(card);
    expect(pauses).toBeGreaterThan(0);
  });

  test("reduced motion never plays and shows the first frame", () => {
    stubMatchMedia({ "(hover: hover) and (min-width: 640px)": true, "(prefers-reduced-motion: reduce)": true });
    const view = render(<OptionCards label="Look" options={options} value="none" onValueChange={() => {}} />);
    fireEvent.mouseEnter(view.getByRole("radio", { name: "Anime" }));
    expect(plays).toBe(0);
    expect(view.container.querySelector("video")!.getAttribute("src")).toContain("#t=0.001");
  });

  test("the chosen card is drawn through theme tokens only", () => {
    const view = render(<OptionCards label="Look" options={options} value="none" onValueChange={() => {}} />);
    const cls = view.getByRole("radio", { name: "Anime" }).className;
    expect(cls).toContain("data-[state=checked]:border-primary");
    expect(cls).toContain("focus-visible:ring");
  });
});

describe("PromptBar cards and references", () => {
  const look = { id: "look", label: "Look", variant: "cards" as const, value: "none", onValueChange: () => {}, options };
  const shape = { id: "shape", label: "Shape", value: "landscape", onValueChange: () => {}, options: [{ value: "landscape", label: "Landscape" }] };

  test("a cards chip draws cards and no dropdown; other chips stay dropdowns", () => {
    const view = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} chips={[look, shape]} />);
    expect(view.getByRole("radiogroup", { name: "Look" })).toBeTruthy();
    expect(view.queryByRole("combobox", { name: "Look" })).toBeNull();
    expect(view.getByRole("combobox", { name: "Shape" })).toBeTruthy();
  });

  test("an empty slot picks, a filled slot shows its thumbnail and removes", () => {
    let picked = 0; let removed = 0;
    const slot = (value: string | null) => ({ id: "start_frame", label: "Picture", kind: "picture" as const, value, thumb: "/t.png", onPick: () => { picked += 1; }, onRemove: () => { removed += 1; } });
    const view = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} references={[slot(null)]} />);
    fireEvent.click(view.getByRole("button", { name: "Add Picture" }));
    expect(picked).toBe(1);
    view.rerender(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} references={[slot("file-1")]} />);
    expect(view.getByRole("img", { name: "Picture" }).getAttribute("src")).toBe("/t.png");
    fireEvent.click(view.getByRole("button", { name: "Remove Picture" }));
    expect(removed).toBe(1);
  });

  test("a bar with no cards and no references draws what it drew before", () => {
    const view = render(<PromptBar label="Describe" value="x" onValueChange={() => {}} onSubmit={() => {}} chips={[shape]} />);
    expect(view.container.querySelector('[data-slot="prompt-bar-cards"]')).toBeNull();
    expect(view.container.querySelector('[data-slot="prompt-bar-references"]')).toBeNull();
  });
});
