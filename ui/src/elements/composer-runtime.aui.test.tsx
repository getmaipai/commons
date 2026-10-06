import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  SimpleTextAttachmentAdapter,
  useAui,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import {
  AddAttachmentButton,
  ComposerAttachmentsRow,
} from "./composer-attachments.aui";
import { ComposerContextRail } from "./composer-context.aui";
import { ComposerModelPicker } from "./composer-model-picker.aui";

afterEach(cleanup);

const idle: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

const usageAdapter: ChatModelAdapter = {
  async *run() {
    yield {
      content: [{ type: "text", text: "hi" }],
      metadata: { steps: [{ state: "finished", usage: { inputTokens: 3000, outputTokens: 1000 } }] },
    };
  },
};

function Harness({ children, adapter = idle, attachments = false }: { children: React.ReactNode; adapter?: ChatModelAdapter; attachments?: boolean }) {
  const runtime = useLocalRuntime(
    adapter,
    attachments ? { adapters: { attachments: new SimpleTextAttachmentAdapter() } } : undefined,
  );
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

function Stage() {
  const aui = useAui();
  return (
    <button
      type="button"
      onClick={() => void aui.composer().addAttachment(new File(["hello"], "notes.txt", { type: "text/plain" }))}
    >
      stage
    </button>
  );
}

function Send() {
  const aui = useAui();
  return (
    <button type="button" onClick={() => aui.thread().append("hello")}>
      send
    </button>
  );
}

function ModelName() {
  const name = useAuiState((s) => s.modelContext.modelName);
  return <output data-testid="model">{name ?? "none"}</output>;
}

describe("composer-attachments (runtime)", () => {
  test("a staged file becomes a chip with an overridable remove label, and removing it clears the row", async () => {
    const view = render(
      <Harness attachments>
        <Stage />
        <ComposerPrimitive.Root>
          <ComposerAttachmentsRow removeLabel={(name) => `Drop ${name}`} />
          <AddAttachmentButton label="Attach" />
        </ComposerPrimitive.Root>
      </Harness>,
    );
    expect(view.getByRole("button", { name: "Attach" })).toBeTruthy();
    fireEvent.click(view.getByText("stage"));
    await waitFor(() => expect(view.getByText("notes.txt")).toBeTruthy());
    fireEvent.click(await waitFor(() => view.getByRole("button", { name: "Drop notes.txt" })));
    await waitFor(() => expect(view.queryByText("notes.txt")).toBeNull());
  });
});

describe("composer-context (runtime)", () => {
  test("the ring starts from the caller's fixed costs and grows with the thread's reported usage", async () => {
    const view = render(
      <Harness adapter={usageAdapter}>
        <Send />
        <ComposerContextRail systemTokens={12} toolTokens={8} contextWindow={200} />
      </Harness>,
    );
    expect(view.getByText("20k / 200k")).toBeTruthy();
    fireEvent.click(view.getByText("send"));
    await waitFor(() => expect(view.getByText("24k / 200k")).toBeTruthy());
  });
});

describe("composer-model-picker (runtime)", () => {
  const models = [
    { name: "Fast", meta: "local" },
    { name: "Careful", meta: "local" },
  ];

  test("the first model is registered, a pick switches it and tells the caller", async () => {
    const picked: string[] = [];
    const view = render(
      <Harness>
        <ModelName />
        <ComposerModelPicker models={models} onChange={(name) => picked.push(name)} />
      </Harness>,
    );
    await waitFor(() => expect(view.getByTestId("model").textContent).toBe("Fast"));
    fireEvent.click(view.container.querySelector("[data-slot='composer-model-trigger']")!);
    fireEvent.click(view.getByText("Careful"));
    await waitFor(() => expect(view.getByTestId("model").textContent).toBe("Careful"));
    expect(picked).toEqual(["Careful"]);
  });

  test("a list that arrives after mount selects its first model instead of staying empty", async () => {
    const view = render(
      <Harness>
        <ModelName />
        <ComposerModelPicker models={[]} />
      </Harness>,
    );
    view.rerender(
      <Harness>
        <ModelName />
        <ComposerModelPicker models={models} />
      </Harness>,
    );
    await waitFor(() => expect(view.getByTestId("model").textContent).toBe("Fast"));
  });

  test("with no models it draws nothing", () => {
    const view = render(
      <Harness>
        <ComposerModelPicker models={[]} />
      </Harness>,
    );
    expect(view.container.querySelector("[data-slot='composer-model-picker']")).toBeNull();
  });
});
