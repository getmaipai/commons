import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import { RunningNow, type RunningNowItem } from "@/kit/primitives/RunningNow";

afterEach(cleanup);

// Bound per call: `screen` binds to the document at import time, before the preload registers one.
const s = () => within(document.body);

const desktop = () => {
  window.innerWidth = 1440;
  window.dispatchEvent(new Event("resize"));
};

beforeEach(desktop);

const copy = {
  label: "Running now",
  heading: "Running now",
  waitingHeading: "Waiting for you",
  doneLabel: (n: number) => `${n} done`,
  emptyText: "Nothing is running right now.",
};

const reply: RunningNowItem = { id: "reply", title: "Writing a reply", status: "Working", tone: "running", detail: "Started 12 seconds ago" };

describe("RunningNow", () => {
  test("the trigger names how many things are running or waiting", () => {
    const stop = mock(() => {});
    render(
      <RunningNow
        {...copy}
        running={[{ ...reply, actions: [{ label: "Stop", onSelect: stop }] }]}
        waiting={[{ id: "ask-1", title: "Nova asked to install Chess", status: "Needs you", tone: "waiting" }]}
        done={[]}
      />,
    );
    const trigger = s().getByRole("button", { name: "Running now, 2 items" });
    expect(trigger.textContent).toContain("2");
  });

  test("an idle trigger carries no count", () => {
    render(<RunningNow {...copy} running={[]} waiting={[]} done={[]} />);
    expect(s().getByRole("button", { name: "Running now" }).textContent).not.toMatch(/\d/);
  });

  test("opens a panel with the reply, its Stop control and the waiting section", () => {
    const stop = mock(() => {});
    const approve = mock(() => {});
    render(
      <RunningNow
        {...copy}
        running={[{ ...reply, actions: [{ label: "Stop", onSelect: stop }] }]}
        waiting={[{ id: "ask-1", title: "Nova asked to install Chess", status: "Needs you", tone: "waiting", actions: [{ label: "Approve", onSelect: approve, primary: true }, { label: "Deny", onSelect: () => {} }] }]}
        done={[]}
      />,
    );
    fireEvent.click(s().getByRole("button", { name: "Running now, 2 items" }));
    const panel = s().getByRole("dialog", { name: "Running now" });
    expect(panel.textContent).toContain("Writing a reply");
    expect(panel.textContent).toContain("Waiting for you");
    fireEvent.click(s().getByRole("button", { name: "Stop Writing a reply" }));
    expect(stop).toHaveBeenCalledTimes(1);
    fireEvent.click(s().getByRole("button", { name: "Approve Nova asked to install Chess" }));
    expect(approve).toHaveBeenCalledTimes(1);
  });

  test("a progress fraction draws a labelled bar; no fraction draws none", () => {
    render(
      <RunningNow
        {...copy}
        defaultOpen
        running={[
          { id: "j1", title: "Downloading a model", status: "Working", tone: "running", progress: 0.45 },
          { id: "j2", title: "Making a picture", status: "Working", tone: "running" },
        ]}
        waiting={[]}
        done={[]}
      />,
    );
    const bars = s().getAllByRole("progressbar");
    expect(bars).toHaveLength(1);
    expect(bars[0]?.getAttribute("aria-label")).toBe("Downloading a model progress");
  });

  test("the done list stays folded until asked", () => {
    render(
      <RunningNow
        {...copy}
        defaultOpen
        running={[]}
        waiting={[]}
        done={[{ id: "d1", title: "Made a picture of a fox", status: "Done", tone: "done" }]}
      />,
    );
    expect(s().queryByText("Made a picture of a fox")).toBeNull();
    fireEvent.click(s().getByRole("button", { name: "1 done" }));
    expect(s().getByText("Made a picture of a fox")).toBeTruthy();
  });

  test("nothing at all says so plainly", () => {
    render(<RunningNow {...copy} defaultOpen running={[]} waiting={[]} done={[]} />);
    expect(s().getByText("Nothing is running right now.")).toBeTruthy();
  });

  test("raw details stay behind a Details control", () => {
    render(
      <RunningNow
        {...copy}
        defaultOpen
        running={[{ id: "j1", title: "Downloading a model", status: "Working", tone: "running", details: "model-a.gguf 2.1 GB of 4.7 GB" }]}
        waiting={[]}
        done={[]}
      />,
    );
    expect(s().queryByText("model-a.gguf 2.1 GB of 4.7 GB")).toBeNull();
    fireEvent.click(s().getByRole("button", { name: "Details: Downloading a model" }));
    expect(s().getByText("model-a.gguf 2.1 GB of 4.7 GB")).toBeTruthy();
  });

  test("Escape closes the panel and focus returns to the trigger", async () => {
    render(<RunningNow {...copy} running={[reply]} waiting={[]} done={[]} />);
    const trigger = s().getByRole("button", { name: "Running now, 1 item" });
    trigger.focus();
    fireEvent.click(trigger);
    const panel = s().getByRole("dialog", { name: "Running now" });
    await act(async () => {
      fireEvent.keyDown(panel, { key: "Escape" });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(s().queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  test("no looping animation anywhere, in any state", () => {
    const { baseElement } = render(
      <RunningNow
        {...copy}
        defaultOpen
        running={[{ ...reply, progress: 0.3 }]}
        waiting={[{ id: "a", title: "Asked a parent", status: "Waiting", tone: "waiting" }]}
        done={[{ id: "d", title: "Done thing", status: "Done", tone: "done" }]}
      />,
    );
    expect(baseElement.innerHTML).not.toMatch(/animate-(spin|pulse|ping|bounce)/);
  });

  test("a polite live region carries the host's announcement", () => {
    render(<RunningNow {...copy} running={[]} waiting={[]} done={[]} announcement="Your picture is ready." />);
    const region = s().getByRole("status");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("Your picture is ready.");
  });

  test("on a phone the panel opens as a bottom sheet", () => {
    window.innerWidth = 390;
    window.dispatchEvent(new Event("resize"));
    render(<RunningNow {...copy} running={[reply]} waiting={[]} done={[]} />);
    fireEvent.click(s().getByRole("button", { name: "Running now, 1 item" }));
    const sheet = s().getByRole("dialog", { name: "Running now" });
    expect(sheet.getAttribute("data-slot")).toBe("sheet-content");
    expect(sheet.textContent).toContain("Writing a reply");
  });
});
