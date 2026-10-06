import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  ComposerPrimitive,
  useLocalRuntime,
  type ChatModelAdapter,
  type DictationAdapter,
} from "@assistant-ui/react";
import {
  barHeights,
  ComposerVoiceLevels,
  DictationControl,
} from "./composer-voice.aui";

afterEach(cleanup);

const chat: ChatModelAdapter = {
  async *run() {
    yield { content: [] };
  },
};

function fakeDictation() {
  const log: string[] = [];
  const adapter: DictationAdapter = {
    listen() {
      log.push("listen");
      return {
        status: { type: "running" },
        stop: async () => {
          log.push("stop");
        },
        cancel: () => {
          log.push("cancel");
        },
        onSpeechStart: () => () => {},
        onSpeechEnd: () => () => {},
        onSpeech: () => () => {},
      };
    },
  };
  return { adapter, log };
}

function Harness({ dictation }: { dictation?: DictationAdapter }) {
  const runtime = useLocalRuntime(chat, dictation ? { adapters: { dictation } } : undefined);
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <ComposerPrimitive.Root>
        <DictationControl startLabel="Talk" stopLabel="Done talking" />
      </ComposerPrimitive.Root>
    </AssistantRuntimeProvider>
  );
}

describe("composer-voice runtime", () => {
  test("with no dictation adapter the control draws nothing", () => {
    const view = render(<Harness />);
    expect(view.queryByRole("button")).toBeNull();
  });

  test("the mic starts the adapter's session and the stop button ends it", async () => {
    const { adapter, log } = fakeDictation();
    const view = render(<Harness dictation={adapter} />);
    fireEvent.click(view.getByRole("button", { name: "Talk" }));
    await waitFor(() => expect(view.getByRole("button", { name: "Done talking" })).toBeTruthy());
    expect(log).toEqual(["listen"]);
    fireEvent.click(view.getByRole("button", { name: "Done talking" }));
    await waitFor(() => expect(log).toContain("stop"));
  });
});

describe("ComposerVoiceLevels", () => {
  const heights = (view: ReturnType<typeof render>) =>
    [...view.container.querySelectorAll("[data-bar]")].map((bar) => (bar as HTMLElement).style.height);

  test("levels in, bars out: louder levels draw taller bars, one bar per slot", () => {
    const quiet = render(<ComposerVoiceLevels levels={[0.1, 0.1]} recording seconds={3} />);
    const quietHeights = heights(quiet);
    cleanup();
    const loud = render(<ComposerVoiceLevels levels={[1, 1]} recording seconds={3} />);
    const loudHeights = heights(loud);
    expect(quietHeights.length).toBe(14);
    expect(loudHeights.length).toBe(14);
    expect(parseFloat(loudHeights[0]!)).toBeGreaterThan(parseFloat(quietHeights[0]!));
    expect(loud.getByText("0:03")).toBeTruthy();
  });

  test("out-of-range levels are clamped and no levels draws flat bars", () => {
    expect(Math.max(...barHeights([5, -2]))).toBe(24);
    expect(Math.min(...barHeights([5, -2]))).toBe(3);
    expect(new Set(barHeights([]))).toEqual(new Set([3]));
  });

  test("once recording stops the bars go flat and the transcribing label is overridable", () => {
    const view = render(
      <ComposerVoiceLevels levels={[1, 1]} recording={false} seconds={9} transcribingLabel="Writing it down" />,
    );
    expect(new Set(heights(view))).toEqual(new Set(["3px"]));
    expect(view.getByText("Writing it down")).toBeTruthy();
  });
});
