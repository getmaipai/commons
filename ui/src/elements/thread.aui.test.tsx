import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider, MessagePrimitive, useLocalRuntime, type ChatModelAdapter } from "@assistant-ui/react";
import { Thread } from "./thread.aui";

afterEach(cleanup);

// A no-op adapter - these tests exercise the composer's own slot wiring,
// never a real turn.
const adapter: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function Harness({ ComposerInputOverride, MessageError, temporary, error = false }: { ComposerInputOverride?: React.ComponentType; MessageError?: React.ComponentType; temporary?: boolean; error?: boolean }) {
  const runtime = useLocalRuntime(error ? failingAdapter : adapter);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread components={ComposerInputOverride || MessageError ? { ComposerInputOverride, MessageError } : undefined} temporary={temporary} />
    </AssistantRuntimeProvider>
  );
}

const failingAdapter: ChatModelAdapter = {
  async *run() {
    throw new Error("test failure");
  },
};

async function sendFailingTurn(getByRole: (role: string, opts: { name: string }) => HTMLElement) {
  fireEvent.change(getByRole("textbox", { name: "Message input" }), { target: { value: "hi" } });
  fireEvent.click(getByRole("button", { name: "Send message" }));
  await waitFor(() => expect(document.querySelector(".aui-message-error-root") || document.querySelector("[data-testid='message-error-slot']")).toBeTruthy());
}

describe("Thread's MessageError slot", () => {
  test("a MessageError slot replaces the default error block", async () => {
    function CustomMessageError() {
      return <MessagePrimitive.Error><div data-testid="message-error-slot">Custom failure</div></MessagePrimitive.Error>;
    }
    const { getByRole, getByTestId, queryByText } = render(<Harness MessageError={CustomMessageError} error />);
    await sendFailingTurn(getByRole);
    expect(getByTestId("message-error-slot").textContent).toBe("Custom failure");
    expect(queryByText("test failure")).toBeNull();
    expect(document.querySelector(".aui-message-error-root")).toBeNull();
  });

  test("the default error block still renders with no slot set", async () => {
    const { getByRole, findByText } = render(<Harness error />);
    await sendFailingTurn(getByRole);
    expect(await findByText("test failure")).toBeTruthy();
    expect(document.querySelector(".aui-message-error-root")).toBeTruthy();
  });
});

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

// CHAT-WELCOME-01: the caller's own temporary/incognito mode tints the
// composer so the one place someone types is visibly different from an
// ordinary, saved conversation - `--composer-bg` is the one lever
// `Composer`'s own shell already reads, so this proves the root sets a
// genuinely different value, not that any real color renders (happy-dom
// computes no real layout or paint).
describe("Thread's temporary prop", () => {
  test("tints --composer-bg when armed, distinct from the ordinary value", () => {
    const { container: ordinary } = render(<Harness />);
    const { container: armed } = render(<Harness temporary />);
    const ordinaryBg = ordinary.querySelector(".aui-thread-root")?.getAttribute("style");
    const armedBg = armed.querySelector(".aui-thread-root")?.getAttribute("style");
    expect(armedBg).toContain("--color-primary");
    expect(armedBg).not.toBe(ordinaryBg);
  });
});
