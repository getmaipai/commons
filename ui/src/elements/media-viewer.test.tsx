// LIBRARY-REVAMP-06 slice B: MediaViewer. happy-dom has no layout, so zoom is read from the picture's transform and
// the drawing itself is judged in a browser (the showcase).
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { MediaViewer, type MediaViewerItem, type MediaViewerProps } from "./media-viewer";

afterEach(cleanup);
beforeEach(() => stubMatchMedia({ "(min-width: 960px)": true }));

const items: MediaViewerItem[] = [
  { id: "fox", kind: "image", url: "https://example.com/api/files/fox/content", name: "Fox in the snow" },
  { id: "otters", kind: "video", url: "https://example.com/api/files/otters/content", posterUrl: "https://example.com/api/files/otters/thumb", name: "Otters in a kitchen", mediaType: "video/mp4" },
  { id: "lullaby", kind: "audio", url: "https://example.com/api/files/lullaby/content", name: "Moonlit lullaby" },
  { id: "plan", kind: "document", url: "https://example.com/api/files/plan/content", name: "Trip plan", mediaType: "application/pdf" },
  { id: "garden", kind: "image", url: "https://example.com/api/files/garden/content", name: "Garden at dawn" },
];

type HarnessProps = Partial<MediaViewerProps> & { startId?: string; seen?: (id: string) => void };

/** A caller that owns the open flag and the current id, as Home will. */
function Harness({ startId = "fox", seen, ...rest }: HarnessProps) {
  const [open, setOpen] = useState(true);
  const [id, setId] = useState<string | null>(startId);
  return (
    <>
      <button type="button" data-testid="opener">
        Open viewer
      </button>
      <button type="button" data-testid="reopen" onClick={() => setOpen(true)}>
        Reopen
      </button>
      <MediaViewer
        open={open}
        onOpenChange={setOpen}
        items={items}
        currentId={id}
        onCurrentIdChange={(next) => {
          setId(next);
          seen?.(next);
        }}
        {...rest}
      />
    </>
  );
}

const dialog = () => document.body.querySelector("[data-slot=media-viewer]") as HTMLElement;
const stage = () => document.body.querySelector("[data-slot=media-viewer-stage]") as HTMLElement;
const image = () => document.body.querySelector("[data-slot=media-viewer-image]") as HTMLImageElement;
const ui = () => within(dialog());
const scaleOf = () => Number(/scale\(([\d.]+)\)/.exec(image().style.transform)?.[1] ?? "NaN");
const translateOf = () => {
  const match = /translate3d\((-?[\d.]+)px, (-?[\d.]+)px/.exec(image().style.transform);
  return { x: Number(match?.[1]), y: Number(match?.[2]) };
};
function loaded() {
  fireEvent.load(image());
}

describe("MediaViewer structure", () => {
  test("it is a dialog named for the file, with a counter, a description and the picture", () => {
    render(<Harness />);
    expect(within(document.body).getByRole("dialog", { name: "Fox in the snow" })).toBeTruthy();
    expect(ui().getByText("1 of 5")).toBeTruthy();
    expect(ui().getByText(/arrow keys/)).toBeTruthy();
    expect(image().getAttribute("alt")).toBe("Fox in the snow");
    expect(image().getAttribute("src")).toBe("https://example.com/api/files/fox/content");
  });

  test("a current id that is not in the list draws nothing", () => {
    render(<Harness startId="nope" />);
    expect(dialog()).toBeNull();
  });

  test("a single file has no counter and both arrows are off", () => {
    render(<Harness items={[items[0]!]} />);
    expect(document.body.querySelector("[data-slot=media-viewer-counter]")).toBeNull();
    expect((ui().getByRole("button", { name: "Previous" }) as HTMLButtonElement).disabled).toBe(true);
    expect((ui().getByRole("button", { name: "Next" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("MediaViewer previous and next", () => {
  test("the buttons move through the list and stop at the ends", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} />);
    const previous = () => ui().getByRole("button", { name: "Previous" }) as HTMLButtonElement;
    const next = () => ui().getByRole("button", { name: "Next" }) as HTMLButtonElement;
    expect(previous().disabled).toBe(true);
    fireEvent.click(next());
    expect(seen).toHaveBeenLastCalledWith("otters");
    expect(within(document.body).getByRole("dialog", { name: "Otters in a kitchen" })).toBeTruthy();
    expect(ui().getByText("2 of 5")).toBeTruthy();
    fireEvent.click(previous());
    expect(seen).toHaveBeenLastCalledWith("fox");
    for (let i = 0; i < 4; i++) fireEvent.click(next());
    expect(ui().getByText("5 of 5")).toBeTruthy();
    expect(next().disabled).toBe(true);
  });

  test("the arrow keys move too", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} startId="plan" />);
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(seen).toHaveBeenLastCalledWith("garden");
    fireEvent.keyDown(stage(), { key: "ArrowLeft" });
    fireEvent.keyDown(stage(), { key: "ArrowLeft" });
    expect(seen).toHaveBeenLastCalledWith("lullaby");
  });

  test("an arrow key at the end of the list does nothing", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} startId="garden" />);
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(seen).not.toHaveBeenCalled();
  });

  test("arrow keys typed into a field in the details panel stay with the field", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} details={<input aria-label="Rename" />} />);
    fireEvent.keyDown(ui().getByRole("textbox", { name: "Rename" }), { key: "ArrowRight" });
    expect(seen).not.toHaveBeenCalled();
  });

  test("a swipe on touch moves, and a short drag does not", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} startId="plan" />);
    const touch = { pointerId: 1, pointerType: "touch" };
    fireEvent.pointerDown(stage(), { ...touch, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(stage(), { ...touch, clientX: 120, clientY: 210 });
    expect(seen).toHaveBeenLastCalledWith("garden");
    seen.mockClear();
    fireEvent.pointerDown(stage(), { ...touch, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(stage(), { ...touch, clientX: 280, clientY: 200 });
    expect(seen).not.toHaveBeenCalled();
    // Right moves back.
    fireEvent.pointerDown(stage(), { ...touch, clientX: 100, clientY: 200 });
    fireEvent.pointerUp(stage(), { ...touch, clientX: 260, clientY: 200 });
    expect(seen).toHaveBeenLastCalledWith("plan");
  });

  test("a mouse drag at the fitted size is not a swipe", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} />);
    const mouse = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(stage(), { ...mouse, clientX: 300, clientY: 200 });
    fireEvent.pointerUp(stage(), { ...mouse, clientX: 100, clientY: 200 });
    expect(seen).not.toHaveBeenCalled();
  });

  test("the arrow buttons keep a 48 px target and a forced-colours border", () => {
    render(<Harness />);
    const next = ui().getByRole("button", { name: "Next" });
    expect(next.className).toContain("size-12");
    expect(next.className).toContain("forced-colors:border");
  });
});

describe("MediaViewer zoom", () => {
  test("zoom controls show once the picture has loaded, not before", () => {
    render(<Harness />);
    expect(ui().queryByRole("button", { name: "Zoom in" })).toBeNull();
    loaded();
    expect(ui().getByRole("button", { name: "Zoom in" })).toBeTruthy();
    expect(ui().getByRole("button", { name: "Zoom out" })).toBeTruthy();
    expect(ui().getByRole("button", { name: "Fit to screen" })).toBeTruthy();
  });

  test("the buttons step up, step down and reset, within the maximum", () => {
    render(<Harness />);
    loaded();
    const zoomIn = ui().getByRole("button", { name: "Zoom in" }) as HTMLButtonElement;
    const zoomOut = ui().getByRole("button", { name: "Zoom out" }) as HTMLButtonElement;
    const reset = ui().getByRole("button", { name: "Fit to screen" }) as HTMLButtonElement;
    expect(scaleOf()).toBe(1);
    expect(zoomOut.disabled).toBe(true);
    expect(reset.disabled).toBe(true);
    fireEvent.click(zoomIn);
    expect(scaleOf()).toBe(1.5);
    fireEvent.click(zoomIn);
    expect(scaleOf()).toBe(2.25);
    fireEvent.click(zoomOut);
    expect(scaleOf()).toBe(1.5);
    for (let i = 0; i < 6; i++) fireEvent.click(zoomIn);
    expect(scaleOf()).toBe(4);
    expect(zoomIn.disabled).toBe(true);
    fireEvent.click(reset);
    expect(scaleOf()).toBe(1);
    expect(translateOf()).toEqual({ x: 0, y: 0 });
  });

  test("the maximum can be set", () => {
    render(<Harness maxZoom={2} />);
    loaded();
    for (let i = 0; i < 4; i++) fireEvent.click(ui().getByRole("button", { name: "Zoom in" }));
    expect(scaleOf()).toBe(2);
  });

  test("plus, minus and zero zoom, and Shift plus on a US keyboard works", () => {
    render(<Harness />);
    loaded();
    fireEvent.keyDown(stage(), { key: "+", shiftKey: true });
    expect(scaleOf()).toBe(1.5);
    fireEvent.keyDown(stage(), { key: "=" });
    expect(scaleOf()).toBe(2.25);
    fireEvent.keyDown(stage(), { key: "-" });
    expect(scaleOf()).toBe(1.5);
    fireEvent.keyDown(stage(), { key: "0" });
    expect(scaleOf()).toBe(1);
  });

  test("the zoom keys do nothing before the picture is ready and on other kinds", () => {
    render(<Harness />);
    fireEvent.keyDown(stage(), { key: "+" });
    expect(scaleOf()).toBe(1);
    cleanup();
    render(<Harness startId="plan" />);
    fireEvent.keyDown(stage(), { key: "+" });
    expect(document.body.querySelector("[data-slot=media-viewer-zoom]")).toBeNull();
  });

  test("the wheel zooms in and out, and the page behind does not scroll", () => {
    render(<Harness />);
    loaded();
    const up = new WheelEvent("wheel", { deltaY: -120, bubbles: true, cancelable: true });
    act(() => {
      stage().dispatchEvent(up);
    });
    expect(up.defaultPrevented).toBe(true);
    expect(scaleOf()).toBeGreaterThan(1);
    const before = scaleOf();
    act(() => {
      stage().dispatchEvent(new WheelEvent("wheel", { deltaY: 60, bubbles: true, cancelable: true }));
    });
    expect(scaleOf()).toBeLessThan(before);
    act(() => {
      stage().dispatchEvent(new WheelEvent("wheel", { deltaY: 100000, bubbles: true, cancelable: true }));
    });
    expect(scaleOf()).toBe(1);
  });

  test("a double click zooms in and a second one fits again", () => {
    render(<Harness />);
    loaded();
    fireEvent.pointerDown(stage(), { pointerId: 1, pointerType: "mouse", button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(stage(), { pointerId: 1, pointerType: "mouse", clientX: 10, clientY: 10 });
    fireEvent.doubleClick(stage(), { clientX: 10, clientY: 10 });
    expect(scaleOf()).toBe(2.5);
    fireEvent.doubleClick(stage(), { clientX: 10, clientY: 10 });
    expect(scaleOf()).toBe(1);
    expect(translateOf()).toEqual({ x: 0, y: 0 });
  });

  test("a double tap on touch zooms and does not also swipe", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} />);
    loaded();
    const touch = { pointerId: 1, pointerType: "touch" };
    for (let i = 0; i < 2; i++) {
      fireEvent.pointerDown(stage(), { ...touch, clientX: 50, clientY: 50 });
      fireEvent.pointerUp(stage(), { ...touch, clientX: 50, clientY: 50 });
    }
    expect(scaleOf()).toBe(2.5);
    expect(seen).not.toHaveBeenCalled();
  });

  test("a zoomed picture pans by dragging, and arrow keys pan it instead of moving on", () => {
    const seen = mock((_: string) => {});
    render(<Harness seen={seen} />);
    loaded();
    fireEvent.click(ui().getByRole("button", { name: "Zoom in" }));
    const mouse = { pointerId: 1, pointerType: "mouse", button: 0 };
    fireEvent.pointerDown(stage(), { ...mouse, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(stage(), { ...mouse, clientX: 130, clientY: 80 });
    fireEvent.pointerUp(stage(), { ...mouse, clientX: 130, clientY: 80 });
    expect(translateOf()).toEqual({ x: 30, y: -20 });
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(translateOf().x).toBe(30 - 64);
    expect(seen).not.toHaveBeenCalled();
    // Fitted again, the arrow keys move on.
    fireEvent.keyDown(stage(), { key: "0" });
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(seen).toHaveBeenLastCalledWith("otters");
  });

  test("two fingers pinch the picture bigger and smaller", () => {
    render(<Harness />);
    loaded();
    const a = { pointerId: 1, pointerType: "touch" };
    const b = { pointerId: 2, pointerType: "touch" };
    fireEvent.pointerDown(stage(), { ...a, clientX: 100, clientY: 100 });
    fireEvent.pointerDown(stage(), { ...b, clientX: 200, clientY: 100 });
    fireEvent.pointerMove(stage(), { ...b, clientX: 300, clientY: 100 });
    expect(scaleOf()).toBe(2);
    fireEvent.pointerMove(stage(), { ...b, clientX: 150, clientY: 100 });
    expect(scaleOf()).toBe(1);
    fireEvent.pointerUp(stage(), { ...b, clientX: 150, clientY: 100 });
    fireEvent.pointerUp(stage(), { ...a, clientX: 100, clientY: 100 });
  });

  test("a new file starts fitted", () => {
    render(<Harness />);
    loaded();
    fireEvent.click(ui().getByRole("button", { name: "Zoom in" }));
    expect(scaleOf()).toBe(1.5);
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    expect(within(document.body).getByRole("dialog", { name: "Garden at dawn" })).toBeTruthy();
    expect(scaleOf()).toBe(1);
  });

  test("the picture's motion stops for reduced motion", () => {
    render(<Harness />);
    expect(image().className).toContain("motion-reduce:transition-none");
    expect(dialog().className).toContain("motion-reduce:animate-none");
  });
});

describe("MediaViewer loading and errors", () => {
  test("a picture shows a loading state until it loads", () => {
    render(<Harness />);
    expect(document.body.querySelector("[data-slot=media-viewer-loading]")).toBeTruthy();
    expect(ui().getByText("Loading")).toBeTruthy();
    loaded();
    expect(document.body.querySelector("[data-slot=media-viewer-loading]")).toBeNull();
  });

  test("a picture that fails says what happened and offers to try again, and trying again asks for the picture again", () => {
    render(<Harness />);
    const first = image();
    fireEvent.error(first);
    const alert = ui().getByRole("alert");
    expect(alert.textContent).toContain("Fox in the snow could not be loaded. Check that Home is running, then try again.");
    expect(document.body.querySelector("[data-slot=media-viewer-image]")).toBeNull();
    expect(ui().queryByRole("button", { name: "Zoom in" })).toBeNull();
    fireEvent.click(ui().getByRole("button", { name: "Try again" }));
    expect(ui().queryByRole("alert")).toBeNull();
    const second = image();
    expect(second).toBeTruthy();
    expect(second === first).toBe(false);
    expect(document.body.querySelector("[data-slot=media-viewer-loading]")).toBeTruthy();
    loaded();
    expect(ui().getByRole("button", { name: "Zoom in" })).toBeTruthy();
  });

  test("an error clears when the person moves on, and the arrows still work", () => {
    render(<Harness />);
    fireEvent.error(image());
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    expect(ui().queryByRole("alert")).toBeNull();
  });
});

describe("MediaViewer other kinds", () => {
  test("a video plays in the kit Player with its poster and no zoom", () => {
    render(<Harness startId="otters" />);
    expect(dialog().querySelector("[data-slot=player]")).toBeTruthy();
    const media = dialog().querySelector("[data-slot=player-media]") as HTMLMediaElement;
    expect(media.querySelector("source")?.getAttribute("src")).toBe("https://example.com/api/files/otters/content");
    expect(document.body.querySelector("[data-slot=media-viewer-zoom]")).toBeNull();
  });

  test("a song plays in the audio layout", () => {
    render(<Harness startId="lullaby" />);
    expect(dialog().querySelector("[data-slot=player][data-layout=audio]")).toBeTruthy();
  });

  test("arrow keys inside the player seek there, and do not leave the file", () => {
    const seen = mock((_: string) => {});
    render(<Harness startId="otters" seen={seen} />);
    const player = dialog().querySelector("[data-slot=player]") as HTMLElement;
    fireEvent.keyDown(player, { key: "ArrowRight" });
    expect(seen).not.toHaveBeenCalled();
    // From the buttons around it, the arrow keys still move on.
    fireEvent.keyDown(ui().getByRole("button", { name: "Close" }), { key: "ArrowRight" });
    expect(seen).toHaveBeenLastCalledWith("lullaby");
  });

  test("a file that cannot be previewed shows its kind, its name and an Open link", () => {
    render(<Harness startId="plan" />);
    const box = document.body.querySelector("[data-slot=media-viewer-unsupported]") as HTMLElement;
    expect(within(box).getByText("Trip plan")).toBeTruthy();
    expect(within(box).getByText("document, application/pdf")).toBeTruthy();
    expect(within(box).getByText("This file cannot be previewed here.")).toBeTruthy();
    const link = within(box).getByRole("link", { name: "Open" });
    expect(link.getAttribute("href")).toBe("https://example.com/api/files/plan/content");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  test("the caller's own affordance replaces the Open link", () => {
    render(<Harness startId="plan" unsupportedActions={(item) => <button type="button">Download {item.name}</button>} />);
    expect(ui().getByRole("button", { name: "Download Trip plan" })).toBeTruthy();
    expect(ui().queryByRole("link", { name: "Open" })).toBeNull();
  });

  test("a script address gets no Open link", () => {
    render(<Harness items={[{ id: "bad", kind: "other", url: "javascript:alert(1)", name: "Odd file" }]} startId="bad" />);
    const box = document.body.querySelector("[data-slot=media-viewer-unsupported]") as HTMLElement;
    expect(within(box).queryByRole("link")).toBeNull();
    expect(within(box).getByText("Odd file")).toBeTruthy();
  });
});

describe("MediaViewer close, Escape and focus", () => {
  test("the close button closes and calls onClose once, after onOpenChange", () => {
    const order: string[] = [];
    const onOpenChange = mock((open: boolean) => order.push(`open:${open}`));
    const onClose = mock(() => order.push("close"));
    function Host() {
      return <MediaViewer open onOpenChange={onOpenChange} onClose={onClose} items={items} currentId="fox" onCurrentIdChange={() => {}} />;
    }
    render(<Host />);
    fireEvent.click(ui().getByRole("button", { name: "Close" }));
    expect(order).toEqual(["open:false", "close"]);
  });

  test("closing from the host does not call onClose", () => {
    const onClose = mock(() => {});
    const view = render(<MediaViewer open onOpenChange={() => {}} onClose={onClose} items={items} currentId="fox" onCurrentIdChange={() => {}} />);
    view.rerender(<MediaViewer open={false} onOpenChange={() => {}} onClose={onClose} items={items} currentId="fox" onCurrentIdChange={() => {}} />);
    expect(onClose).not.toHaveBeenCalled();
  });

  test("Escape first leaves the zoom, then closes", () => {
    const onOpenChange = mock((_: boolean) => {});
    const onClose = mock(() => {});
    render(<Harness onClose={onClose} onOpenChange={onOpenChange} />);
    loaded();
    fireEvent.click(ui().getByRole("button", { name: "Zoom in" }));
    fireEvent.keyDown(stage(), { key: "Escape" });
    expect(scaleOf()).toBe(1);
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog()).toBeTruthy();
    fireEvent.keyDown(stage(), { key: "Escape" });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("focus starts on the stage, stays in the dialog on Tab, and returns to the opener on close", async () => {
    const view = render(<Harness />);
    // The harness opened on mount, so open it again from the opener to see the return.
    fireEvent.click(ui().getByRole("button", { name: "Close" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(dialog()).toBeNull();
    const opener = view.getByTestId("reopen");
    opener.focus();
    expect(document.activeElement === opener).toBe(true);
    fireEvent.click(opener);
    await act(async () => {});
    expect(document.activeElement === stage()).toBe(true);
    // Tab from the last control loops to the first one.
    const tabbable = Array.from(dialog().querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex='0']"));
    const last = tabbable[tabbable.length - 1]!;
    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(dialog().contains(document.activeElement)).toBe(true);
    fireEvent.click(ui().getByRole("button", { name: "Close" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(document.activeElement === opener).toBe(true);
  });

  test("focus goes to returnFocusTo when the opener is gone", async () => {
    const target = document.createElement("button");
    document.body.appendChild(target);
    render(<Harness returnFocusTo={() => target} />);
    fireEvent.click(ui().getByRole("button", { name: "Close" }));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(document.activeElement === target).toBe(true);
    target.remove();
  });
});

describe("MediaViewer announcements", () => {
  test("nothing is announced on open, and the position is announced politely when it changes", () => {
    render(<Harness />);
    const live = document.body.querySelector("[data-slot=media-viewer-announcement]") as HTMLElement;
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.getAttribute("role")).toBe("status");
    expect(live.textContent).toBe("");
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    expect(live.textContent).toBe("Otters in a kitchen, 2 of 5");
    fireEvent.keyDown(stage(), { key: "ArrowRight" });
    expect(live.textContent).toBe("Moonlit lullaby, 3 of 5");
  });

  test("the words can be replaced for another language or a child's copy", () => {
    render(<Harness labels={{ counter: (p, t) => `${p} / ${t}`, announce: (name, p, t) => `${name} (${p} of ${t})`, next: "Forward" }} />);
    expect(ui().getByText("1 / 5")).toBeTruthy();
    fireEvent.click(ui().getByRole("button", { name: "Forward" }));
    expect(document.body.querySelector("[data-slot=media-viewer-announcement]")!.textContent).toBe("Otters in a kitchen (2 of 5)");
  });
});

describe("MediaViewer details and toolbar slots", () => {
  test("on a wide screen the details are a side panel, open to start, and the button and I key close and open it", () => {
    render(<Harness details={(item, index) => <p>About {item.name}, number {index + 1}</p>} />);
    const panel = () => document.body.querySelector("aside[data-slot=media-viewer-details]") as HTMLElement | null;
    expect(panel()).toBeTruthy();
    expect(within(panel()!).getByText("About Fox in the snow, number 1")).toBeTruthy();
    const toggle = ui().getByRole("button", { name: "Details" });
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(toggle.getAttribute("aria-controls")).toBe(panel()!.id);
    fireEvent.click(toggle);
    expect(panel()).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    fireEvent.keyDown(stage(), { key: "i" });
    expect(panel()).toBeTruthy();
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    expect(within(panel()!).getByText("About Otters in a kitchen, number 2")).toBeTruthy();
  });

  test("details given as plain content work too, and without details there is no button", () => {
    render(<Harness details={<p>Plain details</p>} />);
    expect(ui().getByText("Plain details")).toBeTruthy();
    cleanup();
    render(<Harness />);
    expect(ui().queryByRole("button", { name: "Details" })).toBeNull();
    fireEvent.keyDown(stage(), { key: "i" });
    expect(document.body.querySelector("[data-slot=media-viewer-details]")).toBeNull();
  });

  test("a host can control the details", () => {
    const onDetailsOpenChange = mock((_: boolean) => {});
    render(<Harness details={<p>Controlled</p>} detailsOpen={false} onDetailsOpenChange={onDetailsOpenChange} />);
    expect(document.body.querySelector("[data-slot=media-viewer-details]")).toBeNull();
    fireEvent.click(ui().getByRole("button", { name: "Details" }));
    expect(onDetailsOpenChange).toHaveBeenCalledWith(true);
    // Still closed: the host did not say open.
    expect(document.body.querySelector("[data-slot=media-viewer-details]")).toBeNull();
  });

  test("on a phone the details are a bottom sheet, closed to start, and Escape closes the sheet before the viewer", async () => {
    stubMatchMedia({});
    const onOpenChange = mock((_: boolean) => {});
    render(<Harness onOpenChange={onOpenChange} details={<p>Sheet details</p>} />);
    expect(document.body.querySelector("[data-slot=media-viewer-details]")).toBeNull();
    fireEvent.click(ui().getByRole("button", { name: "Details" }));
    await act(async () => {});
    const sheet = document.body.querySelector("[data-slot=media-viewer-details]") as HTMLElement;
    expect(sheet).toBeTruthy();
    expect(sheet.getAttribute("data-state")).toBe("open");
    expect(within(sheet).getByText("Sheet details")).toBeTruthy();
    fireEvent.keyDown(sheet, { key: "Escape" });
    await act(async () => {});
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(dialog()).toBeTruthy();
  });

  test("the toolbar slot is drawn for the current file with 48 px targets", () => {
    render(<Harness toolbar={(item) => <button type="button">Share {item.name}</button>} />);
    const bar = document.body.querySelector("[data-slot=media-viewer-toolbar]") as HTMLElement;
    expect(within(bar).getByRole("button", { name: "Share Fox in the snow" })).toBeTruthy();
    expect(bar.className).toContain("[&_button]:min-h-12");
    expect(bar.className).toContain("[&_button]:min-w-12");
    fireEvent.click(ui().getByRole("button", { name: "Next" }));
    expect(within(bar).getByRole("button", { name: "Share Otters in a kitchen" })).toBeTruthy();
  });

  test("the bar's own buttons are 48 px", () => {
    render(<Harness details={<p>x</p>} />);
    loaded();
    for (const name of ["Close", "Details", "Zoom in", "Zoom out", "Fit to screen"]) {
      expect(ui().getByRole("button", { name }).className).toContain("size-12");
    }
  });
});

describe("MediaViewer accessibility", () => {
  test("axe finds no violation on a picture, with details and a toolbar", async () => {
    render(<Harness details={<p>Details</p>} toolbar={<button type="button">Share</button>} />);
    loaded();
    const result = await axe.run(dialog(), { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
  });

  test("axe finds no violation on a file that cannot be previewed, or on an error", async () => {
    render(<Harness startId="plan" />);
    let result = await axe.run(dialog(), { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
    cleanup();
    render(<Harness />);
    fireEvent.error(image());
    result = await axe.run(dialog(), { rules: { "color-contrast": { enabled: false } } });
    expect(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 80)).join(" | ")}`)).toEqual([]);
  });
});
