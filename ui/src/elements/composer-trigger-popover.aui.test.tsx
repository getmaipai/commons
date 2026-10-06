import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { ComposerTriggerPopover } from "./composer-trigger-popover.aui";

afterEach(cleanup);

const chat: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ children }: { children: React.ReactNode }) {
  const runtime = useLocalRuntime(chat);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ComposerPrimitive.Unstable_TriggerPopoverRoot>
        <ComposerPrimitive.Root>{children}</ComposerPrimitive.Root>
      </ComposerPrimitive.Unstable_TriggerPopoverRoot>
    </AssistantRuntimeProvider>
  );
}

describe("ComposerTriggerPopover", () => {
  test("closed by default: nothing draws until the trigger character is typed", () => {
    const view = render(
      <Harness>
        <ComposerTriggerPopover
          char="#"
          adapter={{ categories: () => [], categoryItems: () => [], search: () => [] }}
          action={{ onExecute: () => {} }}
        />
      </Harness>,
    );
    expect(view.container.querySelector("[data-slot='composer-trigger-popover']")).toBeNull();
  });

  test("declaring neither a directive nor an action warns once", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Harness>
        <ComposerTriggerPopover
          char="#"
          adapter={{ categories: () => [], categoryItems: () => [], search: () => [] }}
          {...({} as { action: { onExecute: () => void } })}
        />
      </Harness>,
    );
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
