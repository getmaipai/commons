// APPROVE-CALM-01: ToolFallback.Approval's additive `primaryHint` puts a
// host's keyboard hint inside the one primary (allow) button only.
import { afterEach, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import type { ReactNode } from "react";
import { ToolFallback } from "./tool-fallback.aui";

afterEach(cleanup);

const adapter: ChatModelAdapter = { async run() { return { content: [{ type: "text", text: "ok" }] }; } };

function Runtime({ children }: { children: ReactNode }) {
  const runtime = useLocalRuntime(adapter);
  return <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>;
}

const options = [
  { id: "yes", kind: "allow-once", label: "Approve" },
  { id: "no", kind: "reject-once", label: "Deny" },
] as const;

test("the hint renders inside the primary button and nowhere else", () => {
  const respond = mock(async () => {});
  const view = render(
    <Runtime>
      <ToolFallback.Approval approval={{ id: "a1", options: [...options], prompt: "Go ahead?" } as never} respondToApproval={respond} primaryHint={<kbd>Ctrl Enter</kbd>} />
    </Runtime>,
  );
  const approve = view.getByRole("button", { name: /Approve/ });
  expect(approve.querySelector("kbd")?.textContent).toBe("Ctrl Enter");
  expect(view.getByRole("button", { name: "Deny" }).querySelector("kbd")).toBeNull();
  fireEvent.click(approve);
  expect(respond).toHaveBeenCalledTimes(1);
});

test("without a hint the buttons render as before", () => {
  const view = render(
    <Runtime>
      <ToolFallback.Approval approval={{ id: "a1", options: [...options] } as never} respondToApproval={async () => {}} />
    </Runtime>,
  );
  expect(view.getByRole("button", { name: "Approve" }).querySelector("kbd")).toBeNull();
});
