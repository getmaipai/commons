import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useAuiState,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { ComposerMentions } from "./composer-mentions.aui";
import { ComposerSlashCommands } from "./composer-slash-commands.aui";

afterEach(cleanup);

const chat: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Text() {
  const text = useAuiState((s) => s.composer.text);
  return <output data-testid="text">{text}</output>;
}

function Harness({ children }: { children: React.ReactNode }) {
  const runtime = useLocalRuntime(chat);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <div className="relative">
          {children}
          <ComposerPrimitive.Root>
            <ComposerPrimitive.Input aria-label="Message" />
          </ComposerPrimitive.Root>
        </div>
        <Text />
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </AssistantRuntimeProvider>
  );
}

function type(input: HTMLElement, value: string) {
  const el = input as HTMLTextAreaElement;
  fireEvent.change(el, { target: { value, selectionStart: value.length, selectionEnd: value.length } });
  el.setSelectionRange(value.length, value.length);
  fireEvent.select(el);
  fireEvent.keyUp(el);
}

describe("composer triggers (runtime)", () => {
  test("typing the @ character opens the mention list and a pick writes a directive", async () => {
    const view = render(
      <Harness>
        <ComposerMentions items={[{ id: "nadia", type: "person", label: "Nadia" }]} />
      </Harness>,
    );
    type(view.getByRole("textbox", { name: "Message" }), "@");
    const option = await waitFor(() => view.getByText("Nadia"));
    fireEvent.click(option);
    await waitFor(() => expect(view.getByTestId("text").textContent).toContain("Nadia"));
  });

  test("typing / lists the caller's commands and a pick runs that command's execute", async () => {
    const ran: string[] = [];
    const view = render(
      <Harness>
        <ComposerSlashCommands
          commands={[{ id: "summarize", description: "Summarize this thread", execute: () => void ran.push("summarize") }]}
        />
      </Harness>,
    );
    type(view.getByRole("textbox", { name: "Message" }), "/");
    const option = await waitFor(() => view.getByText("Summarize this thread"));
    fireEvent.click(option);
    await waitFor(() => expect(ran).toEqual(["summarize"]));
  });

  test("with no matching trigger character nothing opens", () => {
    const view = render(
      <Harness>
        <ComposerMentions items={[{ id: "nadia", type: "person", label: "Nadia" }]} />
      </Harness>,
    );
    type(view.getByRole("textbox", { name: "Message" }), "hello");
    expect(view.queryByText("Nadia")).toBeNull();
  });
});
