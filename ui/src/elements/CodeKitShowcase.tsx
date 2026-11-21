"use client";

// CODE-KIT-01 story: the Code app's session view parts (live file tree, line comments, streaming terminal, code view).
// Sample data is plain constants: story data, not kit text.
import { useState } from "react";
import { CodeDiff } from "./code-diff";
import { CodeView } from "./code-view";
import { FileTree, type FileTreeNode } from "./file-tree";
import { TerminalBlock } from "./terminal-block";

const NODES: readonly FileTreeNode[] = [
  { path: "src", name: "src", depth: 0, kind: "folder" },
  { path: "src/app.ts", name: "app.ts", depth: 1, kind: "file", additions: 12, deletions: 2 },
  { path: "src/util.ts", name: "util.ts", depth: 1, kind: "file", additions: 3, deletions: 0 },
];
const SOURCE = "export function add(a: number, b: number) {\n  return a + b;\n}\n";

export function CodeKitShowcase() {
  const [selected, setSelected] = useState("src/app.ts");
  const [last, setLast] = useState("");
  return (
    <div className="flex flex-col gap-6">
      <FileTree nodes={NODES} live selectedPath={selected} onSelect={setSelected} totalAdditions={15} totalDeletions={2} />
      <CodeDiff
        filename={selected}
        additions={1}
        deletions={1}
        compareLabel="vs main"
        onLineComment={(path, line) => setLast(`${path}:${line}`)}
        lines={[
          { kind: "context", text: "function add(a, b) {" },
          { kind: "removed", text: "  return a - b;" },
          { kind: "added", text: "  return a + b;" },
        ]}
      />
      <span className="text-muted-foreground text-xs">{last}</span>
      <TerminalBlock command="bun test" lines={["running 3 tests", "ok 1", "ok 2"]} done={false} streaming />
      <CodeView filename="src/add.ts" language="typescript" code={SOURCE} />
      <CodeView filename="src/add.ts" language="typescript" code={SOURCE} streaming />
    </div>
  );
}
