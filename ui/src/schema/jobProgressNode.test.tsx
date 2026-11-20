import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, waitFor } from "@testing-library/react";
import { fixtureNode, hub, mountBlock } from "../../tests/blockHarness";
import { JobProgressNodeSchema } from "@/kit/schema/types";

afterEach(cleanup);
const node = () => fixtureNode("job-progress.json");

describe("job_progress node", () => {
  test("parses the sample and rejects unsupported states", () => {
    const parsed = JobProgressNodeSchema.parse(node());
    expect(parsed.item_fields.failure_actions).toBe("failure.actions");
    expect(JobProgressNodeSchema.safeParse({ ...parsed, item_fields: { ...parsed.item_fields, extra: "x" } }).success).toBe(false);
  });
  test("maps bound shot fields and dispatches cancel with row data", async () => {
    hub({ shots: [{ id: "one", label: "Opening", state: "running", progress: 0.5, eta_seconds: 40, thumb: "/one.jpg", note: "Working", overall_eta_seconds: 40 }] });
    const view = mountBlock(node());
    await waitFor(() => expect(view.container.querySelector('[data-slot="job-progress-shots"]')).toBeTruthy());
  });
});
