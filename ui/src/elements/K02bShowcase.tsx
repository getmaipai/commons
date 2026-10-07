"use client";

// ELT-T1-K02b stories for the additive upstream Element props.
import { AgentPlan } from "./agent-plan";
import { Chart } from "./chart";
import { DataTable } from "./data-table";
import { ImageGeneration } from "./image-generation";
import { JobProgress } from "./job-progress";
import { MobileComposerRuntime } from "./mobile-composer";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { TerminalBlock } from "./terminal-block";
import { TodoList } from "./todo-list";

export function K02bShowcase() {
  const runtime = useLocalRuntime({ async *run() { yield { content: [] }; } } satisfies ChatModelAdapter);
  return (
    <div className="flex flex-col gap-6">
      <DataTable
        rows={[{ item: "Tea", cost: 3.5, available: true }]}
        columns={[
          { id: "item", header: "Item" },
          { id: "cost", header: "Cost", align: "end" },
          { id: "available", header: "Available" },
        ]}
        formats={{ cost: { kind: "currency", currency: "USD" }, available: { kind: "boolean" } }}
        locale="en-US"
      />
      <ImageGeneration prompt="A quiet garden" generating={false} onRegenerate={() => {}} />
      <AgentPlan title="Garden plan" steps={["Choose a site", "Plant seeds"]} activeIndex={1} />
      <Chart label="Latency" value="120 ms" delta="+8 ms" trend="up" upIsGood={false} points={[90, 98, 112, 120]} visibleCount={4} />
      <JobProgress title="Export" stages={[{ name: "Write", weight: 1 }]} stageIndex={1} stageProgress={1} eta="" outcome={{ status: "partial", summary: "One file was skipped." }} elapsedMs={42000} />
      <TerminalBlock command="bun test" lines={["2 tests passed"]} visibleCount={4} done exitCode={0} cwd="/home" durationMs={1200} />
      <TodoList title="Today" description="Three small tasks" maxVisible={1} items={[{ id: "tea", text: "Make tea", status: "active", description: "Use the kettle" }]} />
      <AssistantRuntimeProvider runtime={runtime}><MobileComposerRuntime /></AssistantRuntimeProvider>
    </div>
  );
}
