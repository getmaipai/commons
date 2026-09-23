import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
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

// Screen finding: typing the first character into a new chat shifted
// the whole welcome block (heading and composer both) down by 8px.
// Root cause: the suggestions row used to unmount the instant the
// composer stopped being empty, removing its own `gap-4` unit from the
// vertically-centered welcome block, so the whole block re-centered
// and dropped. happy-dom computes no real layout (this file's own
// established reason a pixel claim always lives in a real headless
// Playwright capture instead), so this proves only the DOM-structure
// half of the fix - the row staying mounted, only its visibility
// toggling - which is what the real headless pixel check depends on.
describe("Thread's new-chat suggestions row", () => {
  test("stays mounted once the composer has text - visibility toggles, not presence", () => {
    const { getByRole, container } = render(<Harness />);
    const row = () => container.querySelector(".aui-thread-welcome-suggestions");

    expect(row()).toBeTruthy();
    expect(row()?.className).not.toContain("invisible");

    fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "h" } });

    expect(row()).toBeTruthy();
    expect(row()?.className).toContain("invisible");
  });

  test("becomes visible again once the composer is cleared back to empty", () => {
    const { getByRole, container } = render(<Harness />);
    const textbox = getByRole("textbox", { name: "Message input" });
    const row = () => container.querySelector(".aui-thread-welcome-suggestions");

    fireEvent.change(textbox, { target: { value: "h" } });
    expect(row()?.className).toContain("invisible");

    fireEvent.change(textbox, { target: { value: "" } });
    expect(row()?.className).not.toContain("invisible");
  });
});
