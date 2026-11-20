import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { JobProgress, type JobProgressShot } from "./job-progress";
import { JobProgressShotsShowcase } from "./JobProgressShotsShowcase";

afterEach(cleanup);

const stages = [{ name: "Film", weight: 1 }];
const base = { title: "Rendering The Blue Mug", stages, stageIndex: 0, stageProgress: 0.4 };

describe("JobProgress without shots", () => {
  test("draws no shot list and keeps the plain look", () => {
    const v = render(<JobProgress {...base} overallEtaSeconds={600} />);
    expect(v.container.querySelector("[data-slot=job-progress-shots]")).toBeNull();
    expect(v.queryByRole("list")).toBeNull();
    expect(v.container.querySelector("[data-slot=job-progress]")!.className).toContain("max-w-sm");
  });
});

describe("JobProgress shots", () => {
  const shots: JobProgressShot[] = [
    { id: "a", label: "1 · Juniper, wide", state: "done", thumb: "data:image/svg+xml;utf8,x", note: "Fixed on its own: a small noise was trimmed." },
    { id: "b", label: "2 · Atlas, close", state: "running", progress: 0.62, etaSeconds: 180 },
    { id: "c", label: "3 · Willow, medium", state: "queued", etaSeconds: 480 },
    { id: "d", label: "4 · Sage, wide", state: "held", heldReason: "Your picture job goes first, about 6 minutes." },
  ];

  test("is a list with one item per shot, and a header with the overall time left", () => {
    const v = render(<JobProgress {...base} overallEtaSeconds={1320} shots={shots} />);
    const list = v.getByRole("list", { name: "Shots" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(v.getByText("1 of 4 shots done")).toBeTruthy();
    expect(v.container.querySelector("[data-slot=job-progress-overall-eta]")!.textContent).toBe("About 22 minutes left");
  });

  test("shows no overall time when it is unknown or not a usable number", () => {
    for (const eta of [undefined, Number.NaN, -5, Number.POSITIVE_INFINITY]) {
      const v = render(<JobProgress {...base} overallEtaSeconds={eta} shots={shots} />);
      expect(v.container.querySelector("[data-slot=job-progress-overall-eta]")).toBeNull();
      v.unmount();
    }
  });

  test("only the running row has a progressbar, with a value and a name", () => {
    const v = render(<JobProgress {...base} shots={shots} />);
    const bar = v.getByRole("progressbar", { name: "2 · Atlas, close progress" });
    expect(bar.getAttribute("aria-valuenow")).toBe("62");
    const rows = v.getAllByRole("listitem");
    expect(within(rows[1]!).getByRole("progressbar")).toBe(bar);
    for (const i of [0, 2, 3]) expect(within(rows[i]!).queryByRole("progressbar")).toBeNull();
  });

  test("per-shot time: a running row says unknown, other rows draw nothing", () => {
    const v = render(<JobProgress {...base} shots={[
      { id: "r", label: "Run", state: "running", progress: 0.2 },
      { id: "q", label: "Queue", state: "queued" },
      { id: "h", label: "Held", state: "held" },
      { id: "d", label: "Done", state: "done", etaSeconds: 60 },
      { id: "r2", label: "Run with time", state: "running", etaSeconds: 180 },
    ]} />);
    const eta = (i: number) => v.getAllByRole("listitem")[i]!.querySelector("[data-slot=job-progress-shot-eta]")?.textContent;
    expect(eta(0)).toBe("Time left unknown");
    expect(eta(1)).toBeUndefined();
    expect(eta(2)).toBeUndefined();
    expect(eta(3)).toBeUndefined();
    expect(eta(4)).toBe("About 3 minutes left");
    expect(v.getAllByText("Time left unknown")).toHaveLength(1);
  });

  test("a running row without progress draws no bar", () => {
    const v = render(<JobProgress {...base} shots={[{ id: "r", label: "Run", state: "running" }]} />);
    expect(v.queryByRole("progressbar", { name: "Run progress" })).toBeNull();
  });

  test("held rows give their reason; notes show under the shot; the picture is decorative", () => {
    const v = render(<JobProgress {...base} shots={shots} />);
    expect(v.getByText("Your picture job goes first, about 6 minutes.")).toBeTruthy();
    expect(v.getByText("Fixed on its own: a small noise was trimmed.").getAttribute("data-slot")).toBe("job-progress-shot-note");
    expect(v.container.querySelector("li img")!.getAttribute("alt")).toBe("");
  });

  test("a failed row gives the message and its actions, which fire", () => {
    const hits: string[] = [];
    const v = render(<JobProgress {...base} shots={[{
      id: "f", label: "4 · Willow, medium", state: "failed",
      failure: { message: "The first take did not match her face. Try again.", actions: [
        { id: "retry", label: "Try again", primary: true, onSelect: () => hits.push("retry") },
        { id: "open", label: "Open the shot", onSelect: () => hits.push("open") },
      ] },
    }]} />);
    expect(v.getByText("Did not finish")).toBeTruthy();
    expect(v.getByText("The first take did not match her face. Try again.")).toBeTruthy();
    fireEvent.click(v.getByRole("button", { name: "Try again" }));
    fireEvent.click(v.getByRole("button", { name: "Open the shot" }));
    expect(hits).toEqual(["retry", "open"]);
    expect(v.getByRole("button", { name: "Try again" }).className).toContain("min-h-12");
  });

  test("failure details only show on a failed row", () => {
    const v = render(<JobProgress {...base} shots={[{ id: "x", label: "Odd", state: "done", failure: { message: "Hidden" } }]} />);
    expect(v.queryByText("Hidden")).toBeNull();
  });

  test("uses design tokens only", () => {
    const v = render(<JobProgress {...base} shots={shots} />);
    expect(v.container.innerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|bg-red|text-red|rgb\(/i);
  });
});

describe("JobProgressShotsShowcase", () => {
  test("shows every state", () => {
    const v = render(<JobProgressShotsShowcase />);
    for (const state of ["queued", "running", "done", "held", "failed"]) expect(v.container.querySelector(`[data-state=${state}]`)).toBeTruthy();
    fireEvent.click(v.getAllByRole("button", { name: "Try again" })[0]!);
    expect(v.getByRole("status").textContent).toContain("Try again on s4");
  });
});

describe("JobProgress in shots mode with no stages", () => {
  const mk = (...states: JobProgressShot["state"][]): JobProgressShot[] => states.map((state, i) => ({ id: `s${i}`, label: `Shot ${i + 1}`, state }));
  const header = (v: ReturnType<typeof render>) => v.container.querySelector("[data-slot=job-progress]")!.firstElementChild!;

  test("a running shot keeps the job unfinished: no done word and the Cancel control shows", () => {
    const v = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk("done", "running", "failed")} />);
    expect(header(v).textContent).not.toMatch(/done|partial|failed/i);
    expect(v.getByRole("button", { name: "Cancel the job" })).toBeTruthy();
  });
  test("a queued or held shot also keeps it running", () => {
    for (const states of [["done", "queued"], ["done", "held"]] as const) {
      const v = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk(...states)} />);
      expect(v.queryByRole("button", { name: "Cancel the job" })).not.toBeNull();
      v.unmount();
    }
  });
  test("all shots done: the header says done and there is no Cancel", () => {
    const v = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk("done", "done")} />);
    expect(header(v).textContent).toContain("done");
    expect(v.queryByRole("button", { name: "Cancel the job" })).toBeNull();
  });
  test("finished with some failed reads partial; all failed reads failed; a caller outcome wins", () => {
    const partial = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk("done", "failed")} />);
    expect(header(partial).textContent).toContain("partial");
    partial.unmount();
    const failed = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk("failed", "failed")} />);
    expect(header(failed).textContent).toContain("failed");
    failed.unmount();
    const cancelled = render(<JobProgress title="Rendering" stages={[]} stageIndex={0} stageProgress={0} shots={mk("running")} outcome={{ status: "cancelled" }} />);
    expect(header(cancelled).textContent).toContain("cancelled");
  });
});
