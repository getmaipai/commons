import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { VideoPlayer, type VideoPlayerAction } from "./video-player";

afterEach(cleanup);

const noop = () => {};

describe("VideoPlayer draft", () => {
  test("shows the still and the three built-in handlers, each carrying its starts marker", () => {
    const log: string[] = [];
    const view = render(
      <VideoPlayer status="draft" prompt="a paper boat" still="/still.jpg" onRender={() => log.push("render")} onAnotherStill={() => log.push("another")} onEditWords={() => log.push("edit")} onStop={() => log.push("cancel")} onMakeAnother={noop} />,
    );
    expect(view.container.querySelector("[data-slot=video-player-still] img")!.getAttribute("src")).toBe("/still.jpg");
    expect(view.container.querySelector("video")).toBeNull();
    expect(view.queryByRole("button", { name: "Make another" })).toBeNull();
    expect(view.getByRole("button", { name: "Make the video from this" }).getAttribute("data-starts")).toBe("video");
    expect(view.getByRole("button", { name: "Another still" }).getAttribute("data-starts")).toBe("picture");
    expect(view.getByRole("button", { name: "Edit words" }).hasAttribute("data-starts")).toBe(false);
    for (const name of ["Make the video from this", "Another still", "Edit words", "Cancel"]) fireEvent.click(view.getByRole("button", { name }));
    expect(log).toEqual(["render", "another", "edit", "cancel"]);
    expect(view.container.textContent).toContain("a paper boat");
  });
  test("a disabledReason disables the control and the handler is not called", () => {
    let called = 0;
    const view = render(
      <VideoPlayer status="draft" prompt="x" onRender={() => { called += 1; }} onAnotherStill={noop} controls={{ render: { disabledReason: "Videos are not ready yet." }, anotherStill: { disabledReason: "Pictures are not ready yet." } }} />,
    );
    const render_ = view.getByRole("button", { name: "Make the video from this" }) as HTMLButtonElement;
    expect(render_.disabled).toBe(true);
    expect((view.getByRole("button", { name: "Another still" }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(render_);
    expect(called).toBe(0);
  });
});

describe("VideoPlayer built-ins take disabledReason and starts", () => {
  test("Retry and Make another start a clip by default, Stop does not, and each can be disabled", () => {
    const view = render(<VideoPlayer status="failed" prompt="x" onRetry={noop} controls={{ retry: { disabledReason: "Videos are not ready yet." } }} />);
    const retry = view.getByRole("button", { name: "Try again" }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    expect(retry.getAttribute("data-starts")).toBe("video");
    view.rerender(<VideoPlayer status="cancelled" prompt="x" onMakeAnother={noop} controls={{ makeAnother: { starts: "picture" } }} />);
    expect(view.getByRole("button", { name: "Make another" }).getAttribute("data-starts")).toBe("picture");
    view.rerender(<VideoPlayer status="generating" prompt="x" onStop={noop} controls={{ stop: { disabledReason: "x" } }} />);
    const stop = view.getByRole("button", { name: "Stop" }) as HTMLButtonElement;
    expect(stop.disabled).toBe(true);
    expect(stop.hasAttribute("data-starts")).toBe(false);
  });
});

describe("VideoPlayer actionItems", () => {
  const items: VideoPlayerAction[] = [
    { label: "Remix", icon: "pencil", placement: "start", onSelect: noop },
    { label: "Make it Max", icon: "sparkles", starts: "video", disabledReason: "Videos are not ready yet.", onSelect: noop },
    { label: "Fix it", when: ["failed"], onSelect: noop },
  ];
  test("when defaults to ready, and filters by status", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={items} />);
    expect(view.queryByRole("button", { name: "Fix it" })).toBeNull();
    expect(view.getByRole("button", { name: "Remix" })).toBeTruthy();
    view.rerender(<VideoPlayer status="failed" prompt="x" actionItems={items} />);
    expect(view.getByRole("button", { name: "Fix it" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Remix" })).toBeNull();
  });
  test("placement start comes before the built-ins, end after; starts and disabledReason are applied", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" onShare={noop} actionItems={items} />);
    const names = Array.from(view.container.querySelectorAll("[data-slot=video-player-actions] button")).map(b => b.textContent);
    expect(names).toEqual(["Remix", "Download", "Share", "Make it Max"]);
    const max = view.getByRole("button", { name: "Make it Max" }) as HTMLButtonElement;
    expect(max.disabled).toBe(true);
    expect(max.getAttribute("data-starts")).toBe("video");
  });
  test("a click runs onSelect", () => {
    let n = 0;
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[{ label: "Go", onSelect: () => { n += 1; } }]} />);
    fireEvent.click(view.getByRole("button", { name: "Go" }));
    expect(n).toBe(1);
  });
  test("icons variant draws icon buttons named by their label", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionsVariant="icons" actionItems={items} />);
    const remix = view.getByRole("button", { name: "Remix" });
    expect(remix.textContent).toBe("");
    expect(view.getByRole("button", { name: "Download" }).textContent).toBe("");
    expect(view.container.querySelector("[data-slot=video-player-actions]")!.getAttribute("data-variant")).toBe("icons");
  });
  test("actionsInline keeps N inline and puts the rest in a More menu, capped at 8", async () => {
    const many: VideoPlayerAction[] = Array.from({ length: 12 }, (_, i) => ({ label: `Act ${i + 1}`, onSelect: noop }));
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionsVariant="icons" actionsInline={3} actionItems={many} />);
    const inline = Array.from(view.container.querySelectorAll("[data-slot=video-player-actions] button")).map(b => b.getAttribute("aria-label"));
    expect(inline).toEqual(["Download", "Act 1", "Act 2", "More"]);
    fireEvent.pointerDown(view.getByRole("button", { name: "More" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(document.body.querySelectorAll("[role=menuitem]").length).toBeGreaterThan(0));
    const labels = Array.from(document.body.querySelectorAll("[role=menuitem]")).map(i => i.textContent);
    // Download + Act 1..7 are the eight drawn; three inline, five in the menu.
    expect(labels).toHaveLength(5);
    expect(labels[0]).toContain("Act 3");
    expect(labels.some(l => l?.includes("Act 9"))).toBe(false);
  });
  test("a menu item runs its action and shows its disabled reason", async () => {
    let n = 0;
    const view = render(
      <VideoPlayer status="ready" prompt="x" src="/v.mp4" actionsInline={0} actionItems={[{ label: "Go", onSelect: () => { n += 1; } }, { label: "Later", disabledReason: "Not ready yet.", onSelect: noop }]} />,
    );
    fireEvent.pointerDown(view.getByRole("button", { name: "More" }), { button: 0, ctrlKey: false });
    await waitFor(() => expect(document.body.querySelectorAll("[role=menuitem]").length).toBe(3));
    const items = Array.from(document.body.querySelectorAll("[role=menuitem]")) as HTMLElement[];
    expect(items[2]!.getAttribute("data-disabled")).not.toBeNull();
    expect(items[2]!.textContent).toContain("Not ready yet.");
    fireEvent.click(items[1]!);
    expect(n).toBe(1);
  });
});

describe("VideoPlayer Favorite", () => {
  test("is a pressed toggle at the end of the row, called with the next state", () => {
    const seen: boolean[] = [];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" favorite={false} onFavorite={next => seen.push(next)} onMakeAnother={noop} />);
    const fav = view.getByRole("button", { name: "Favorite" });
    expect(fav.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(fav);
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" favorite onFavorite={next => seen.push(next)} />);
    expect(view.getByRole("button", { name: "Favorite" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(view.getByRole("button", { name: "Favorite" }));
    expect(seen).toEqual([true, false]);
  });
  test("is drawn only with onFavorite, and not while it is being made or failed", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" />);
    expect(view.queryByRole("button", { name: "Favorite" })).toBeNull();
    view.rerender(<VideoPlayer status="failed" prompt="x" onFavorite={noop} />);
    expect(view.queryByRole("button", { name: "Favorite" })).toBeNull();
  });
});

describe("VideoPlayer notice and hint", () => {
  test("notice shows in every status; hint stays live-only", () => {
    for (const status of ["draft", "queued", "generating", "ready", "failed", "cancelled"] as const) {
      const view = render(<VideoPlayer status={status} prompt="x" src="/v.mp4" notice="Videos are not ready yet." hint="About 2 minutes" />);
      expect(view.container.querySelector("[data-slot=video-player-notice]")!.textContent).toBe("Videos are not ready yet.");
      const live = status === "queued" || status === "generating";
      expect(view.container.textContent?.includes("About 2 minutes")).toBe(live);
      view.unmount();
    }
  });
  test("no notice, no element", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" />);
    expect(view.container.querySelector("[data-slot=video-player-notice]")).toBeNull();
  });
});

describe("VideoPlayer size", () => {
  test("default is the 576 px column, the others widen it", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" />);
    const card = () => view.container.querySelector("[data-slot=video-player]")!;
    expect(card().className).toContain("max-w-xl");
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" size="xl" />);
    expect(card().className).toContain("max-w-5xl");
    expect(card().className).not.toContain("max-w-xl");
    view.rerender(<VideoPlayer status="ready" prompt="x" src="/v.mp4" size="full" />);
    expect(card().className).toContain("max-w-none");
  });
});

describe("VideoPlayer sheet action (K7)", () => {
  const trim: VideoPlayerAction = {
    label: "Trim",
    icon: "scissors",
    sheet: {
      title: "Trim this clip",
      submitLabel: "Trim",
      fields: [
        { name: "start", label: "Start (seconds)", kind: "number", min: 0, defaultValue: 0 },
        { name: "end", label: "End (seconds)", kind: "number", min: 1, max: 10, required: true },
        { name: "title", label: "Name", kind: "text" },
      ],
    },
    onSubmit: () => {},
  };
  test("opens a form, blocks a bad number with a plain line, then submits typed values", async () => {
    const got: unknown[] = [];
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[{ ...trim, onSubmit: values => got.push(values) }]} />);
    fireEvent.click(view.getByRole("button", { name: "Trim" }));
    await waitFor(() => expect(document.body.querySelector("[data-slot=video-player-sheet]")).not.toBeNull());
    expect(document.body.textContent).toContain("Trim this clip");
    const end = document.body.querySelector("input[type=number][required]") as HTMLInputElement;
    fireEvent.change(end, { target: { value: "99" } });
    fireEvent.click(document.body.querySelector("button[type=submit]")!);
    expect(document.body.querySelector("[role=alert]")!.textContent).toContain("at most 10");
    expect(got).toHaveLength(0);
    fireEvent.change(end, { target: { value: "4.5" } });
    fireEvent.change(document.body.querySelector("input[type=text]")!, { target: { value: " cut " } });
    fireEvent.click(document.body.querySelector("button[type=submit]")!);
    expect(got).toEqual([{ start: 0, end: 4.5, title: "cut" }]);
    await waitFor(() => expect(document.body.querySelector("[data-slot=video-player-sheet]")).toBeNull());
  });
  test("a clips field lists options and returns the picked values in the order ticked", async () => {
    const got: unknown[] = [];
    const join: VideoPlayerAction = {
      label: "Join",
      sheet: { title: "Join clips", submitLabel: "Join", fields: [{ name: "clips", label: "Clips", kind: "clips", required: true, options: [{ value: "a", label: "Boat" }, { value: "b", label: "Bird" }, { value: "c", label: "Cat" }] }] },
      onSubmit: values => got.push(values),
    };
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[join]} />);
    fireEvent.click(view.getByRole("button", { name: "Join" }));
    await waitFor(() => expect(document.body.querySelector("[data-slot=video-player-sheet]")).not.toBeNull());
    fireEvent.click(document.body.querySelector("button[type=submit]")!);
    expect(document.body.querySelector("[role=alert]")!.textContent).toContain("Pick at least one");
    fireEvent.click(document.body.querySelector('[role=checkbox][id$="-c"]')!);
    fireEvent.click(document.body.querySelector('[role=checkbox][id$="-a"]')!);
    fireEvent.click(document.body.querySelector("button[type=submit]")!);
    expect(got).toEqual([{ clips: ["c", "a"] }]);
  });
  test("a sheet action that is disabled does not open", () => {
    const view = render(<VideoPlayer status="ready" prompt="x" src="/v.mp4" actionItems={[{ ...trim, disabledReason: "Not ready." }]} />);
    fireEvent.click(view.getByRole("button", { name: "Trim" }));
    expect(document.body.querySelector("[data-slot=video-player-sheet]")).toBeNull();
  });
});
