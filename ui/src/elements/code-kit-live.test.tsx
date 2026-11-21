import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { CodeDiff, type DiffLine } from "./code-diff";
import { CodeView } from "./code-view";
import { FileTree, type FileTreeNode } from "./file-tree";
import { ReviewableDiff } from "./reviewable-diff";
import { TerminalBlock } from "./terminal-block";
import { CodeKitShowcase } from "./CodeKitShowcase";

afterEach(cleanup);

const NODES: FileTreeNode[] = [
  { path: "src", name: "src", depth: 0, kind: "folder" },
  { path: "src/a.ts", name: "a.ts", depth: 1, kind: "file", additions: 4, deletions: 1 },
  { path: "src/b.ts", name: "b.ts", depth: 1, kind: "file", additions: 2 },
];
const LINES: DiffLine[] = [
  { kind: "context", text: "one" },
  { kind: "added", text: "two" },
];
const rows = (c: HTMLElement) => c.querySelectorAll("[data-slot='file-tree'] > div:last-child > div");

describe("FileTree live and selection", () => {
  test("live shows every node with no reveal animation, ignoring visibleCount", () => {
    const { container } = render(<FileTree nodes={NODES} visibleCount={1} live totalAdditions={6} totalDeletions={1} />);
    expect(rows(container).length).toBe(3);
    expect(container.innerHTML).not.toContain("animate-in");
    expect(container.textContent).toContain("+4");
    expect(container.textContent).toContain("−1");
  });

  test("without the new props it still reveals visibleCount rows and has no interactive markup", () => {
    const { container } = render(<FileTree nodes={NODES} visibleCount={2} totalAdditions={6} totalDeletions={1} />);
    expect(rows(container).length).toBe(2);
    expect(container.innerHTML).toContain("animate-in");
    expect(container.querySelector("[aria-selected], [tabindex], [role]")).toBeNull();
  });

  test("selectedPath marks one row aria-selected", () => {
    const { container } = render(<FileTree nodes={NODES} live selectedPath="src/b.ts" totalAdditions={6} totalDeletions={1} />);
    const selected = container.querySelectorAll("[aria-selected='true']");
    expect(selected.length).toBe(1);
    expect(selected[0]!.textContent).toContain("b.ts");
  });

  test("onSelect fires on click, Enter and Space, and rows are focusable", () => {
    const seen: string[] = [];
    const { container } = render(<FileTree nodes={NODES} live onSelect={(p) => seen.push(p)} totalAdditions={6} totalDeletions={1} />);
    const row = rows(container)[1]! as HTMLElement;
    expect(row.getAttribute("tabindex")).toBe("0");
    fireEvent.click(row);
    fireEvent.keyDown(row, { key: "Enter" });
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "a" });
    expect(seen).toEqual(["src/a.ts", "src/a.ts", "src/a.ts"]);
  });
});

describe("line comments and compareLabel", () => {
  test("CodeDiff reports the file and line, and shows the compare label", () => {
    const seen: [string, number][] = [];
    const { container, getByText, getByLabelText } = render(
      <CodeDiff filename="a.ts" additions={1} deletions={0} lines={LINES} compareLabel="vs main" onLineComment={(p, l) => seen.push([p, l])} />,
    );
    expect(getByText("vs main")).toBeTruthy();
    fireEvent.click(getByLabelText("Comment on line 2"));
    expect(seen).toEqual([["a.ts", 2]]);
    expect(container.querySelectorAll("button").length).toBe(2);
  });

  test("CodeDiff without the new props has no buttons and cycle is optional", () => {
    const { container } = render(<CodeDiff filename="a.ts" additions={1} deletions={0} lines={LINES} />);
    expect(container.querySelector("button")).toBeNull();
  });

  test("a line's own number wins over its row", () => {
    const seen: number[] = [];
    const { getByLabelText } = render(
      <CodeDiff filename="a.ts" additions={0} deletions={0} lines={[{ kind: "context", text: "x", line: 41 }]} onLineComment={(_, l) => seen.push(l)} />,
    );
    fireEvent.click(getByLabelText("Comment on line 41"));
    expect(seen).toEqual([41]);
  });

  test("ReviewableDiff reports hunk lines and shows the compare label", () => {
    const seen: [string, number][] = [];
    const { getByText, getByLabelText, container } = render(
      <ReviewableDiff filename="b.ts" hunks={[{ id: "h", range: "@@ 1", decision: "pending", lines: LINES }]} compareLabel="vs main" onLineComment={(p, l) => seen.push([p, l])} />,
    );
    expect(getByText("vs main")).toBeTruthy();
    fireEvent.click(getByLabelText("Comment on line 1"));
    expect(seen).toEqual([["b.ts", 1]]);
    cleanup();
    const plain = render(<ReviewableDiff filename="b.ts" hunks={[{ id: "h", range: "@@ 1", decision: "kept", lines: LINES }]} />);
    expect(plain.container.querySelector("button")).toBeNull();
    expect(container).toBeTruthy();
  });
});

function setGeometry(el: HTMLElement, g: { scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => g.scrollHeight });
  Object.defineProperty(el, "clientHeight", { configurable: true, get: () => g.clientHeight });
}

describe("TerminalBlock streaming and followTail", () => {
  test("streaming shows every line without a visibleCount and without per-line animation", () => {
    const { container, rerender } = render(<TerminalBlock command="t" lines={["a", "b"]} done={false} streaming />);
    expect(container.querySelectorAll("[data-stream]").length).toBe(2);
    expect(container.querySelector("[data-stream]")!.className).not.toContain("animate-in");
    rerender(<TerminalBlock command="t" lines={["a", "b", "c"]} done={false} streaming />);
    expect(container.querySelectorAll("[data-stream]").length).toBe(3);
  });

  test("without the new props visibleCount still limits and lines animate", () => {
    const { container } = render(<TerminalBlock command="t" lines={["a", "b", "c"]} visibleCount={1} done={false} />);
    expect(container.querySelectorAll("[data-stream]").length).toBe(1);
    expect(container.querySelector("[data-stream]")!.className).toContain("animate-in");
    expect(container.querySelector("[data-follow-tail]")).toBeNull();
  });

  test("followTail keeps the end in view, until the person scrolls up", () => {
    const geo = { scrollHeight: 500, clientHeight: 200 };
    const { container, rerender } = render(<TerminalBlock command="t" lines={["a"]} done={false} streaming />);
    const body = container.querySelector("[data-follow-tail]") as HTMLElement;
    setGeometry(body, geo);
    rerender(<TerminalBlock command="t" lines={["a", "b"]} done={false} streaming />);
    expect(body.scrollTop).toBe(500);
    // The person scrolls up: new output must not pull them back down.
    body.scrollTop = 40;
    act(() => { fireEvent.scroll(body); });
    geo.scrollHeight = 700;
    rerender(<TerminalBlock command="t" lines={["a", "b", "c"]} done={false} streaming />);
    expect(body.scrollTop).toBe(40);
    // Back at the end: following resumes.
    body.scrollTop = 500;
    act(() => { fireEvent.scroll(body); });
    geo.scrollHeight = 900;
    rerender(<TerminalBlock command="t" lines={["a", "b", "c", "d"]} done={false} streaming />);
    expect(body.scrollTop).toBe(900);
  });
});

describe("CodeView", () => {
  test("draws a line-number gutter that matches the code and honors startLine", () => {
    const { container } = render(<CodeView code={"a\nb\nc\n"} language="text" streaming startLine={10} />);
    const gutter = container.querySelector("[data-slot='code-view-gutter']")!;
    expect(gutter.getAttribute("aria-hidden")).toBe("true");
    expect(Array.from(gutter.children).map((c) => c.textContent)).toEqual(["10", "11", "12"]);
    expect(container.textContent).toContain("a");
  });

  test("streaming renders plain code and a streaming flag; the gutter grows with the code", () => {
    const { container, rerender } = render(<CodeView code="a" language="typescript" streaming filename="x.ts" />);
    expect(container.querySelector("[data-streaming]")).toBeTruthy();
    expect(container.querySelector("pre code")!.textContent).toBe("a");
    expect(container.textContent).toContain("x.ts");
    rerender(<CodeView code={"a\nb"} language="typescript" streaming filename="x.ts" />);
    expect(container.querySelector("[data-slot='code-view-gutter']")!.children.length).toBe(2);
  });
});

describe("CodeKitShowcase", () => {
  test("renders every part", () => {
    const { container } = render(<CodeKitShowcase />);
    for (const slot of ["file-tree", "code-diff", "terminal-block", "code-view"]) expect(container.querySelector(`[data-slot='${slot}']`)).toBeTruthy();
  });
});
