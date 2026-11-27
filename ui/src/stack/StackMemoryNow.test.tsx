import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { StackMemoryNow } from "./StackMemoryNow";
import { stackMemorySegments, stackRoleColor } from "./stackMemory";
import type { StackMemoryEngine } from "./stackMemory";

afterEach(cleanup);
const GB = 1024 ** 3;
const reading = { total: 64 * GB, used: 40 * GB, avail: 24 * GB, pressure: 0 };
const engines: StackMemoryEngine[] = [
  { role: "chat", label: "Chat", state: "running", model_id: "qwen", memory_bytes: 20 * GB },
  { role: "tts", label: "Voice out", state: "idle", model_id: null, memory_bytes: 2 * GB },
  { role: "image", label: "Pictures", state: "idle", model_id: null, memory_bytes: 0 },
];

describe("stackMemorySegments", () => {
  test("lists loaded features biggest first, then other programs, then free, and the shares fit the computer", () => {
    const segments = stackMemorySegments(reading, engines, (id) => (id === "qwen" ? "Qwen3" : null));
    expect(segments.map((s) => s.id)).toEqual(["chat", "tts", "other", "free"]);
    expect(segments[0]!.detail).toBe("Qwen3");
    expect(segments[2]!.bytes).toBe(18 * GB);
    expect(segments.reduce((n, s) => n + s.percent, 0)).toBeCloseTo(100, 5);
  });
  test("gives no bar before the Stack's first reading", () => {
    expect(stackMemorySegments(null, engines)).toEqual([]);
    expect(stackMemorySegments({ ...reading, total: 0 }, engines)).toEqual([]);
  });
  test("a feature keeps its color whatever it holds", () => {
    expect(stackRoleColor("chat")).toBe(stackSegmentColor("chat"));
    expect(stackRoleColor("chat")).not.toBe(stackRoleColor("tts"));
  });
});
function stackSegmentColor(role: string): string { return stackMemorySegments(reading, [{ role, label: role, state: "idle", model_id: null, memory_bytes: GB }])[0]!.color; }

describe("StackMemoryNow", () => {
  test("draws one colored slice per loaded feature plus the rest, and names the pressure", () => {
    const { getByTestId } = render(<StackMemoryNow current={reading} engines={engines} budgetBytes={48 * GB} />);
    const root = within(getByTestId("stack-memory-now"));
    expect(root.getByText("40 GB of 64 GB")).toBeTruthy();
    expect(root.getByTestId("stack-memory-segment-chat").getAttribute("style")).toContain("var(--chart-1)");
    expect(root.getByTestId("stack-memory-segment-free")).toBeTruthy();
    expect(root.queryByTestId("stack-memory-segment-image")).toBeNull();
    expect(root.getByTestId("stack-memory-pressure").textContent).toContain("Comfortable");
    expect(root.getByText(/22 GB of their 48 GB budget/)).toBeTruthy();
  });
  test("says so before the first reading", () => {
    const { getByTestId } = render(<StackMemoryNow current={null} engines={null} />);
    expect(getByTestId("stack-memory-now").textContent).toContain("has not taken its first memory reading");
  });
  test("a feature opens its detail only when the caller can show one", () => {
    const opened: string[] = [];
    const { getByTestId, rerender } = render(<StackMemoryNow current={reading} engines={engines} />);
    expect((getByTestId("stack-memory-segment-chat") as HTMLButtonElement).disabled).toBe(true);
    rerender(<StackMemoryNow current={reading} engines={engines} onOpenRole={(role) => opened.push(role)} />);
    fireEvent.click(getByTestId("stack-memory-segment-chat"));
    expect(opened).toEqual(["chat"]);
    expect((getByTestId("stack-memory-segment-other") as HTMLButtonElement).disabled).toBe(true);
  });
});
