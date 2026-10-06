import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter, type ThreadMessageLike } from "@assistant-ui/react";
import { Thread } from "./thread.aui";
import { ErrorState } from "./error-state";
import { RegenerateMenu } from "./regenerate-menu";
import { EmptyStateSuggestion } from "./empty-state";

afterEach(cleanup);

const adapter: ChatModelAdapter = { async *run() { yield { content: [{ type: "text", text: "again" }] }; } };
const done = { type: "complete", reason: "stop" } as const;
const MESSAGES: ThreadMessageLike[] = [
  { role: "user", content: [{ type: "text", text: "Q1" }] },
  { role: "assistant", content: [{ type: "text", text: "A1" }], status: done },
  { role: "user", content: [{ type: "text", text: "Q2" }] },
];

function Harness({ engineDown, messages = MESSAGES }: { engineDown?: string; messages?: ThreadMessageLike[] }) {
  const runtime = useLocalRuntime(adapter, { initialMessages: messages, adapters: { suggestion: { async *generate() { yield [{ prompt: "More please" }]; } } } });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={{ engineDown, assistantActionBarAutohide: "never" }} />
    </AssistantRuntimeProvider>
  );
}
const named = (label: string) => Array.from(document.querySelectorAll("button")).find((b) => (b.textContent ?? "").trim().startsWith(label)) as HTMLButtonElement | undefined;

describe("Thread engineDown (ENGINE-DOWN-UI-01)", () => {
  test("Refresh, Retry, Edit and Send are disabled with the reason in their names", async () => {
    render(<Harness engineDown="Chat is paused" />);
    await waitFor(() => expect(named("Refresh")).toBeTruthy());
    for (const label of ["Refresh", "Retry", "Edit"]) {
      expect(named(label)!.disabled).toBe(true);
      expect(named(label)!.textContent).toContain("Chat is paused");
    }
    expect((document.querySelector('[aria-label="Send message"]') as HTMLButtonElement).disabled).toBe(true);
    expect(named("Copy")!.disabled).toBe(false);
    expect(named("Helpful") === undefined || named("Helpful")!.disabled === false).toBe(true);
  });

  test("the same controls are enabled with no engineDown", async () => {
    render(<Harness />);
    await waitFor(() => expect(named("Refresh")).toBeTruthy());
    for (const label of ["Refresh", "Retry", "Edit", "Copy"]) expect(named(label)!.disabled).toBe(false);
  });
});

describe("additive disabled props", () => {
  test("EmptyStateSuggestion takes disabled", () => {
    const { getByRole } = render(<EmptyStateSuggestion disabled>Plan a week</EmptyStateSuggestion>);
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });
  test("ErrorState retryDisabled disables Retry and names the reason", () => {
    const { getByRole } = render(<ErrorState title="Oops" retrying={false} onRetry={() => {}} retryDisabled="Chat is paused" />);
    const retry = getByRole("button") as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    expect(retry.textContent).toContain("Chat is paused");
  });
  test("ErrorState Retry is enabled without retryDisabled", () => {
    const { getByRole } = render(<ErrorState title="Oops" retrying={false} onRetry={() => {}} />);
    expect((getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });
  test("RegenerateMenu disabled disables its trigger and names the reason", () => {
    const { getByRole } = render(<RegenerateMenu options={[]} open={false} currentId="a" onOpenChange={() => {}} disabled="Chat is paused" />);
    const trigger = getByRole("button") as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);
    expect(trigger.getAttribute("aria-label")).toContain("Chat is paused");
  });
});
