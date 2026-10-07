import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AgentPlan } from "./agent-plan";
import { Chart } from "./chart";
import { DataTable } from "./data-table";
import { ImageGeneration } from "./image-generation";
import { JobProgress } from "./job-progress";
import { TodoList } from "./todo-list";
import { TerminalBlock } from "./terminal-block";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { MobileComposerRuntime } from "./mobile-composer";

afterEach(cleanup);

function RuntimeHarness({ adapter }: { adapter: ChatModelAdapter }) {
  const runtime = useLocalRuntime(adapter);
  return <AssistantRuntimeProvider runtime={runtime}><MobileComposerRuntime /></AssistantRuntimeProvider>;
}

describe("ELT-T1-K02b additive props", () => {
  test("per-column formats use the keyed default, with explicit column format precedence", () => {
    const { container, getAllByText } = render(
      <DataTable
        rows={[{ name: "Tea", price: 3.5, available: true }]}
        columns={[
          { id: "name", header: "Name" },
          { id: "price", header: "Price", format: { kind: "number", decimals: 0 } },
          { id: "available", header: "Available" },
        ]}
        formats={{ price: { kind: "currency", currency: "USD" }, available: { kind: "boolean", trueLabel: "In stock" } }}
        locale="en-US"
      />,
    );
    expect(getAllByText("4").length).toBeGreaterThan(0);
    expect(getAllByText("In stock").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("[data-slot='data-table-card-row']")).toHaveLength(1);
    const legacy = render(<DataTable rows={[{ name: "Alpha", context: "8k", cost: "$1" }]} />);
    expect(legacy.getByText("Model")).toBeTruthy();
    expect(legacy.getByText("Alpha")).toBeTruthy();
  });

  test("image regeneration is actionable only when supplied and disabled while generating", () => {
    let calls = 0;
    const view = render(<ImageGeneration prompt="Garden" generating={false} onRegenerate={() => calls++} />);
    fireEvent.click(view.getByRole("button", { name: "Regenerate image" }));
    expect(calls).toBe(1);
    view.rerender(<ImageGeneration prompt="Garden" generating />);
    expect((view.container.querySelector("button[aria-label='Regenerate image']") as HTMLButtonElement).disabled).toBe(true);
    const legacy = render(<ImageGeneration prompt="Garden" generating={false} />);
    expect(legacy.getByRole("button", { name: "Regenerate image" })).toBeTruthy();
  });

  test("agent plan title defaults to Plan and accepts a caller title", () => {
    const view = render(<AgentPlan steps={["Read"]} activeIndex={0} />);
    expect(view.getByText("Plan")).toBeTruthy();
    view.rerender(<AgentPlan title="Research" steps={["Read"]} activeIndex={0} />);
    expect(view.getByText("Research")).toBeTruthy();
  });

  test("mobile runtime form sends through assistant-ui composer primitives", async () => {
    let runs = 0;
    const adapter: ChatModelAdapter = { async *run() { runs++; yield { content: [] }; } };
    const view = render(<RuntimeHarness adapter={adapter} />);
    fireEvent.change(view.getByRole("textbox", { name: "Message" }), { target: { value: "Hello" } });
    fireEvent.click(view.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(runs).toBe(1));
  });

  test("chart honors explicit trend and whether an upward change is good", () => {
    const view = render(<Chart label="Latency" value="120" delta="+8" trend="up" upIsGood={false} points={[90, 120]} visibleCount={2} />);
    const delta = view.container.querySelector("[data-trend='up']")!;
    expect(delta.className).toContain("text-red-600");
    view.rerender(<Chart label="Latency" value="120" delta="+8" points={[90, 120]} visibleCount={2} />);
    expect(view.container.querySelector("[data-trend='up']")).toBeTruthy();
  });

  test("job outcome, terminal metadata, and todo descriptions render while legacy props remain valid", () => {
    const job = render(<JobProgress title="Export" stages={[{ name: "Write", weight: 1 }]} stageIndex={0} stageProgress={0.5} eta="1m" outcome={{ status: "partial", summary: "Skipped one" }} elapsedMs={42000} />);
    expect(job.getByText("partial")).toBeTruthy();
    expect(job.getByText("Skipped one")).toBeTruthy();
    expect(job.getByText("42s")).toBeTruthy();
    const terminal = render(<TerminalBlock command="run" lines={["out"]} visibleCount={5} done exitCode={7} stderr={["bad"]} cwd="/tmp" durationMs={2000} truncated maxCollapsedLines={2} />);
    expect(terminal.container.querySelector("[data-state='failure']")).toBeTruthy();
    expect(terminal.container.querySelector("[data-stream='stderr']")?.textContent).toBe("bad");
    expect(terminal.getByText("exit 7")).toBeTruthy();
    expect(terminal.getByText(/\/tmp/)).toBeTruthy();
    const todos = render(<TodoList title="Today" description="Three tasks" maxVisible={1} items={[{ id: "a", text: "First", status: "active", description: "Details" }, { id: "b", text: "Second", status: "pending" }]} />);
    expect(todos.getByText("Today")).toBeTruthy();
    expect(todos.getByText("Three tasks")).toBeTruthy();
    expect(todos.getByText("Details")).toBeTruthy();
    expect(todos.queryByText("Second")).toBeNull();
    const legacyTodo = render(<TodoList items={[{ id: "a", text: "Old shape", status: "done" }]} />);
    expect(legacyTodo.getByText("Todos")).toBeTruthy();
    expect(legacyTodo.getByText("Old shape")).toBeTruthy();
  });
});
