import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { LauncherBubble } from "./launcher-bubble";

afterEach(cleanup);

const base = { open: false, unread: 0, greeting: "Hi", prompts: [] as string[] };

describe("LauncherBubble listening state", () => {
  test("unset listening keeps today's bubble with no listening row", () => {
    const view = render(<LauncherBubble {...base} />);
    expect(view.container.querySelector("[data-slot=launcher-listening]")).toBeNull();
    expect(view.container.querySelector("svg.lucide-message-circle")).toBeTruthy();
  });

  test("listening shows the ear, the sentence and Turn off, and drops the idle circle when there is no toggle", () => {
    let off = 0;
    const view = render(<LauncherBubble {...base} listening="Listening for Hey Jarvis" onTurnOff={() => off++} />);
    expect(view.getByText("Listening for Hey Jarvis")).toBeTruthy();
    expect(view.container.querySelector("svg.lucide-ear")).toBeTruthy();
    expect(view.container.querySelector("svg.lucide-message-circle")).toBeNull();
    fireEvent.click(view.getByRole("button", { name: "Turn off wake word listening" }));
    expect(off).toBe(1);
  });

  test("with a toggle the launcher button stays beside the listening row", () => {
    const view = render(<LauncherBubble {...base} onToggle={() => {}} listening="Listening for Hey Jarvis" />);
    expect(view.getByRole("button", { name: "Open the assistant" })).toBeTruthy();
    expect(view.queryByRole("button", { name: "Turn off wake word listening" })).toBeNull();
  });
});
