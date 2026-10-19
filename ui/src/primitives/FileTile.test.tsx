import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { FileTile, formatClock } from "@/kit/primitives/FileTile";

afterEach(cleanup);

const people = [
  { id: "marlow", name: "Marlow" },
  { id: "nova", name: "Nova" },
  { id: "iris", name: "Iris" },
  { id: "quill", name: "Quill" },
  { id: "rover", name: "Rover" },
];

describe("formatClock", () => {
  test("minutes and seconds, then hours", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(75)).toBe("1:15");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-4)).toBe("0:00");
  });
});

describe("FileTile", () => {
  test("the tile button is named from name, kind, detail, length and who it is shared with", () => {
    const { getByRole } = render(
      <FileTile id="a" name="Otters in a kitchen" kind="video" secondary="9.4 MB" description="9.4 megabytes" durationSeconds={8} sharedWith={[people[0]!, people[1]!]} />,
    );
    expect(getByRole("button", { name: "Otters in a kitchen, video, 9.4 megabytes, 0:08, shared with Marlow and Nova" })).toBeTruthy();
  });

  test("an explicit label wins", () => {
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" label="The fox picture" />);
    expect(getByRole("button", { name: "The fox picture" })).toBeTruthy();
  });

  test("the picture is lazy, async, and sits in a fixed 4:3 frame so layout never shifts", () => {
    const { container } = render(<FileTile id="a" name="Fox" kind="image" thumbnailUrl="https://example.com/fox.webp" />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("loading")).toBe("lazy");
    expect(img.getAttribute("decoding")).toBe("async");
    expect(img.getAttribute("width")).toBe("320");
    expect(img.getAttribute("height")).toBe("240");
    expect(img.getAttribute("alt")).toBe("");
    expect(img.parentElement!.className).toContain("aspect-[4/3]");
  });

  test("no picture shows the kind icon, and the extension when there is one", () => {
    const { container, getByText } = render(<FileTile id="a" name="Plan" kind="document" extension="pdf" />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-slot="safe-image-fallback"][data-kind="file"] svg')).not.toBeNull();
    expect(getByText("pdf")).toBeTruthy();
  });

  test("a picture that fails to load falls back to the icon, and a new address tries again", () => {
    const { container, rerender } = render(<FileTile id="a" name="Fox" kind="image" thumbnailUrl="https://example.com/a.webp" />);
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector('[data-slot="safe-image-fallback"]')).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('[data-slot="safe-image-fallback"][data-kind="picture"]')).not.toBeNull();
    rerender(<FileTile id="a" name="Fox" kind="image" thumbnailUrl="https://example.com/b.webp" />);
    expect(container.querySelector("img")!.getAttribute("src")).toBe("https://example.com/b.webp");
  });

  test("a duration badge shows for video and audio only", () => {
    const video = render(<FileTile id="a" name="Clip" kind="video" durationSeconds={134} />);
    expect(video.container.querySelector('[data-slot="file-tile-duration"]')!.textContent).toBe("2:14");
    cleanup();
    const audio = render(<FileTile id="a" name="Song" kind="audio" durationSeconds={61} />);
    expect(audio.container.querySelector('[data-slot="file-tile-duration"]')!.textContent).toBe("1:01");
    cleanup();
    const image = render(<FileTile id="a" name="Fox" kind="image" durationSeconds={61} />);
    expect(image.container.querySelector('[data-slot="file-tile-duration"]')).toBeNull();
  });

  test("shared avatars are capped with a +N count", () => {
    const { container } = render(<FileTile id="a" name="Fox" kind="image" sharedWith={people} />);
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(3);
    expect(container.querySelector('[data-slot="file-tile-avatar-count"]')!.textContent).toBe("+2");
  });

  test("maxAvatars changes the cap and no count shows when everyone fits", () => {
    const { container } = render(<FileTile id="a" name="Fox" kind="image" sharedWith={people} maxAvatars={5} />);
    expect(container.querySelectorAll('[data-slot="avatar"]')).toHaveLength(5);
    expect(container.querySelector('[data-slot="file-tile-avatar-count"]')).toBeNull();
  });

  test("pressing the tile opens it", () => {
    const onOpen = mock(() => {});
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" onOpen={onOpen} onToggleSelect={() => {}} />);
    fireEvent.click(getByRole("button", { name: /Fox/ }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  test("in selection mode pressing the tile toggles it instead, and it reads as a toggle button", () => {
    const onOpen = mock(() => {});
    const onToggle = mock((_range: boolean) => {});
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" selectionMode selected onOpen={onOpen} onToggleSelect={onToggle} />);
    const main = getByRole("button", { name: /Fox/ });
    expect(main.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(main);
    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("Shift, Ctrl and Command click select instead of opening", () => {
    const onOpen = mock(() => {});
    const onToggle = mock((_range: boolean) => {});
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" onOpen={onOpen} onToggleSelect={onToggle} />);
    const main = getByRole("button", { name: /Fox/ });
    fireEvent.click(main, { shiftKey: true });
    fireEvent.click(main, { ctrlKey: true });
    fireEvent.click(main, { metaKey: true });
    expect(onToggle.mock.calls.map((c) => c[0])).toEqual([true, false, false]);
    expect(onOpen).not.toHaveBeenCalled();
  });

  test("the select box is a real checkbox that reports Shift", () => {
    const onToggle = mock((_range: boolean) => {});
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" selected onToggleSelect={onToggle} />);
    const box = getByRole("checkbox", { name: "Select Fox" });
    expect(box.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(box);
    fireEvent.click(box, { shiftKey: true });
    expect(onToggle.mock.calls.map((c) => c[0])).toEqual([false, true]);
  });

  test("no select box without a select handler", () => {
    const { queryByRole } = render(<FileTile id="a" name="Fox" kind="image" />);
    expect(queryByRole("checkbox")).toBeNull();
  });

  test("the select box keeps a 48 px hit area and is revealed on hover, focus and in selection mode", () => {
    const idle = render(<FileTile id="a" name="Fox" kind="image" onToggleSelect={() => {}} />);
    const box = idle.getByRole("checkbox");
    expect(box.className).toContain("after:-inset-4");
    const holder = box.parentElement!;
    expect(holder.className).toContain("opacity-0");
    expect(holder.className).toContain("pointer-events-none");
    expect(holder.className).toContain("group-hover/tile:opacity-100");
    expect(holder.className).toContain("group-focus-within/tile:opacity-100");
    cleanup();
    const selecting = render(<FileTile id="a" name="Fox" kind="image" selectionMode onToggleSelect={() => {}} />);
    expect(selecting.getByRole("checkbox").parentElement!.className).not.toContain("opacity-0");
  });

  test("the actions button is a real 48 px button that reports the click, and the kit draws no menu", () => {
    const onActions = mock(() => {});
    const { getByRole, queryByRole } = render(<FileTile id="a" name="Fox" kind="image" onActionsClick={onActions} />);
    const button = getByRole("button", { name: "Actions for Fox" });
    expect(button.className).toContain("before:-inset-2");
    expect(button.className).toContain("size-8");
    fireEvent.click(button);
    expect(onActions).toHaveBeenCalledTimes(1);
    expect(queryByRole("menu")).toBeNull();
  });

  test("the actions button is always shown on touch screens", () => {
    const { getByRole } = render(<FileTile id="a" name="Fox" kind="image" onActionsClick={() => {}} />);
    expect(getByRole("button", { name: "Actions for Fox" }).className).toContain("[@media(hover:none)]:opacity-100");
  });

  test("wrapActions lets the caller make the button a menu trigger", () => {
    const { getByRole } = render(
      <FileTile id="a" name="Fox" kind="image" wrapActions={(button) => <div data-testid="wrap">{button}</div>} />,
    );
    expect(getByRole("button", { name: "Actions for Fox" }).parentElement!.getAttribute("data-testid")).toBe("wrap");
  });

  test("no actions button unless one is asked for", () => {
    const { queryByRole } = render(<FileTile id="a" name="Fox" kind="image" />);
    expect(queryByRole("button", { name: /Actions/ })).toBeNull();
  });

  test("selected shows a ring and the primary border; focus-visible has an inset ring", () => {
    const { getByRole, container } = render(<FileTile id="a" name="Fox" kind="image" selected />);
    expect(container.firstElementChild!.className).toContain("ring-primary");
    expect(container.firstElementChild!.className).toContain("border-primary");
    expect(container.firstElementChild!.className).toContain("forced-colors:outline-2");
    expect(getByRole("button", { name: /Fox/ }).className).toContain("focus-visible:ring-2");
  });

  test("tabbable and controlsTabbable take the tile and its controls out of the tab order", () => {
    const { getByRole } = render(
      <FileTile id="a" name="Fox" kind="image" onToggleSelect={() => {}} onActionsClick={() => {}} tabbable={false} controlsTabbable={false} />,
    );
    expect(getByRole("button", { name: /^Fox/ }).getAttribute("tabindex")).toBe("-1");
    expect(getByRole("checkbox").getAttribute("tabindex")).toBe("-1");
    expect(getByRole("button", { name: "Actions for Fox" }).getAttribute("tabindex")).toBe("-1");
  });

  test("copy comes from props", () => {
    const { getByRole } = render(
      <FileTile
        id="a"
        name="Fox"
        kind="image"
        onToggleSelect={() => {}}
        onActionsClick={() => {}}
        labels={{ select: (n) => `Pick ${n}`, actions: (n) => `More for ${n}`, kind: { image: "photo" } as never }}
      />,
    );
    expect(getByRole("checkbox", { name: "Pick Fox" })).toBeTruthy();
    expect(getByRole("button", { name: "More for Fox" })).toBeTruthy();
    expect(getByRole("button", { name: "Fox, photo" })).toBeTruthy();
  });

  test("text stays at the 16 px floor and motion respects reduced-motion", () => {
    const { container } = render(
      <FileTile id="a" name="Fox" kind="video" durationSeconds={4} secondary="1 MB" sharedWith={people} onToggleSelect={() => {}} onActionsClick={() => {}} />,
    );
    // The actions button holds only an icon, so only the tile's own text is held to the floor.
    expect(container.querySelector('[data-slot="file-tile-main"]')!.innerHTML).not.toMatch(/text-(xs|sm)\b/);
    expect(container.innerHTML).toContain("motion-reduce:transition-none");
  });
});
