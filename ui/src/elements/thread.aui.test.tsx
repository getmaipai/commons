import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { AssistantRuntimeProvider, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "./thread.aui";

afterEach(cleanup);

// A no-op adapter - these tests exercise the composer's own slot wiring,
// never a real turn.
const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ ComposerInputOverride }: { ComposerInputOverride?: React.ComponentType }) {
  const runtime = useLocalRuntime(adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={ComposerInputOverride ? { ComposerInputOverride } : undefined} />
    </AssistantRuntimeProvider>
  );
}

describe("Thread's ComposerInputOverride slot", () => {
  test("with no override, the built-in composer input renders", () => {
    const { getByRole } = render(<Harness />);
    expect(getByRole("textbox", { name: "Message input" })).toBeTruthy();
  });

  test("with an override, it fully replaces the built-in input - never rendered alongside it", () => {
    function Waveform() {
      return <div data-testid="fake-waveform">bars</div>;
    }
    const { getByTestId, queryByRole } = render(<Harness ComposerInputOverride={Waveform} />);
    expect(getByTestId("fake-waveform")).toBeTruthy();
    expect(queryByRole("textbox", { name: "Message input" })).toBeNull();
  });
});
