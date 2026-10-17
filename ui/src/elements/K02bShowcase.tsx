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
      <ImageGeneration prompt="A quiet garden" generating progress={40} statusLabel="Drawing" elapsedLabel="12s" onStop={() => {}} size="large" />
      <AgentPlan title="Garden plan" steps={["Choose a site", "Plant seeds"]} activeIndex={1} />
      <Chart label="Latency" value="120 ms" delta="+8 ms" trend="up" upIsGood={false} points={[90, 98, 112, 120]} visibleCount={4} />
      <JobProgress title="Export" stages={[{ name: "Write", weight: 1 }]} stageIndex={1} stageProgress={1} eta="" outcome={{ status: "partial", summary: "One file was skipped." }} elapsedMs={42000} />
      <JobProgress title="Starter model" stages={[{ name: "Download", weight: 1 }]} stageIndex={0} stageProgress={0.22} completedBytes={2_100_000_000} totalBytes={9_400_000_000} bytesPerSecond={1_800_000} etaSeconds={410} items={[{ id: "part-1", label: "model-00001-of-00002.gguf", completedBytes: 2_100_000_000, totalBytes: 4_700_000_000, state: "running" }, { id: "part-2", label: "model-00002-of-00002.gguf", completedBytes: 0, totalBytes: 4_700_000_000, state: "queued" }]} variant="compact" />
      <JobProgress title="Starter model" stages={[{ name: "Download", weight: 1 }]} stageIndex={0} stageProgress={0.22} completedBytes={2_100_000_000} totalBytes={9_400_000_000} items={[{ id: "part-1", label: "model-00001-of-00002.gguf", completedBytes: 2_100_000_000, totalBytes: 4_700_000_000, state: "stalled" }]} downloadState="stalled" onResume={() => {}} />
      <JobProgress title="Paused download" stages={[{ name: "Download", weight: 1 }]} stageIndex={0} stageProgress={0.22} downloadState="paused" onResume={() => {}} items={[{ id: "part-1", label: "model.gguf", completedBytes: 2_100_000_000, totalBytes: 9_400_000_000, state: "paused" }]} />
      <JobProgress title="Verifying model" stages={[{ name: "Verify", weight: 1 }]} stageIndex={0} stageProgress={0.9} downloadState="verifying" items={[{ id: "part-1", label: "model.gguf", completedBytes: 9_400_000_000, totalBytes: 9_400_000_000, state: "verifying" }]} />
      <JobProgress title="Checksum failed" stages={[{ name: "Verify", weight: 1 }]} stageIndex={1} stageProgress={1} downloadState="failed" downloadStatus="checksum mismatch" copy={{ checksumFailed: "The file did not pass its checksum.", retry: "Retry download" }} onRetry={() => {}} />
      <JobProgress title="Out of space" stages={[{ name: "Download", weight: 1 }]} stageIndex={1} stageProgress={1} downloadState="failed" downloadStatus="out of space" copy={{ outOfSpace: "Free up disk space and retry." }} />
      <TerminalBlock command="bun test" lines={["2 tests passed"]} visibleCount={4} done exitCode={0} cwd="/home" durationMs={1200} />
      <TodoList title="Today" description="Three small tasks" maxVisible={1} items={[{ id: "tea", text: "Make tea", status: "active", description: "Use the kettle" }]} />
      <AssistantRuntimeProvider runtime={runtime}><MobileComposerRuntime /></AssistantRuntimeProvider>
    </div>
  );
}
