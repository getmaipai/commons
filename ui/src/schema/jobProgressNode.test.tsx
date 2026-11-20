import { afterEach, describe, expect, jest, test } from "bun:test";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { calls, fixtureNode, hub, mountBlock } from "../../tests/blockHarness";
import { JobProgressNodeSchema } from "@/kit/schema/types";
import { FEED_POLL_INTERVAL_MS } from "@/kit/schema/feedPolling";

afterEach(cleanup);
afterEach(() => jest.useRealTimers());
const node = () => fixtureNode("job-progress.json");

describe("job_progress node", () => {
  test("parses the sample and rejects unsupported states", () => {
    const parsed = JobProgressNodeSchema.parse(node());
    expect(parsed.item_fields.failure_actions).toBe("failure.actions");
    expect(JobProgressNodeSchema.safeParse({ ...parsed, item_fields: { ...parsed.item_fields, extra: "x" } }).success).toBe(false);
  });
  test("maps bound shot fields and dispatches cancel with row data", async () => {
    hub({ shots: [{ id: "one", label: "Opening", state: "running", progress: 0.5, eta_seconds: 40, thumb: "/one.jpg", note: "Working", overall_eta_seconds: 40 }] });
    const view = mountBlock(node(), { packageId: "job-bind" });
    await waitFor(() => expect(view.container.querySelector('[data-slot="job-progress-shots"]')).toBeTruthy());
  });
  test("an answered empty list draws nothing, including no cancel control", async () => {
    hub({ shots: [] });
    const view = mountBlock(node(), { packageId: "job-empty" });
    await waitFor(() => expect((globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0));
    expect(view.container.querySelector('[data-slot="job-progress"]')).toBeNull();
  });
  test("polls while any configured row is running and stops once all rows are done", async () => {
    jest.useFakeTimers();
    let rows: Record<string, unknown>[] = [{ id: "one", label: "Opening", state: "running" }];
    hub({ shots: () => rows });
    const view = mountBlock(fixtureNode("job-progress.json", { poll_while: { field: "state", values: ["queued", "running", "held"] } }), { packageId: "job-poll" });
    await waitFor(() => expect(view.container.querySelector('[data-slot="job-progress-shots"]')).toBeTruthy());
    const reads = () => (globalThis.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
    const before = reads();
    await act(async () => { jest.advanceTimersByTime(FEED_POLL_INTERVAL_MS); await Promise.resolve(); await Promise.resolve(); });
    expect(reads()).toBeGreaterThan(before);
    rows = [{ id: "one", label: "Opening", state: "done" }];
    await act(async () => { jest.advanceTimersByTime(FEED_POLL_INTERVAL_MS); await Promise.resolve(); await Promise.resolve(); });
    await view.findByText(/1 of 1 shot done/);
    const stopped = reads();
    await act(async () => { jest.advanceTimersByTime(FEED_POLL_INTERVAL_MS * 3); await Promise.resolve(); });
    expect(reads()).toBe(stopped);
  });
  test("dispatches failure action call method and literal args with the shot row", async () => {
    hub({ shots: [{ id: "s1", label: "Opening", state: "failed", failure: { message: "Failed", actions: [{ label: "Retry", action: { call: { target: "/api/plugins/job-actions/shots/{id}/retry", method: "POST", args: { mode: "retry", priority: 2 } } } }] } }] });
    const view = mountBlock(fixtureNode("job-progress.json"), { packageId: "job-actions" });
    const retry = await view.findByRole("button", { name: "Retry" });
    fireEvent.click(retry);
    await waitFor(() => expect(calls.some((call) => call.url === "/api/plugins/job-actions/shots/s1/retry")).toBe(true));
    expect(calls.find((call) => call.url.endsWith("/s1/retry"))).toMatchObject({ method: "POST", body: { mode: "retry", priority: 2 } });
  });
});
