import { Fragment, type ReactNode } from "react";

// A description is a short blurb, not a chat reply: bold, italic, `code`, bullet lists and paragraphs are all it needs.
// It builds React elements from the text (never HTML), so nothing in a description can inject markup or a link.
const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|_[^_\s][^_]*_|`[^`]+`)/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    if (/^\*\*[^*]+\*\*$|^__[^_]+__$/.test(part)) return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
    if (/^\*[^*\s][^*]*\*$|^_[^_\s][^_]*_$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part)) return <code key={i} className="rounded bg-muted px-1 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function LightMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks = text.trim().split(/\n{2,}/).map((block) => block.split("\n"));
  return (
    <div data-slot="light-markdown" className={className ?? "space-y-2"}>
      {blocks.map((lines, i) => lines.every((line) => /^\s*[-*]\s+/.test(line))
        ? <ul key={i} className="list-disc space-y-1 pl-5">{lines.map((line, j) => <li key={j}>{inline(line.replace(/^\s*[-*]\s+/, ""))}</li>)}</ul>
        : <p key={i} className="break-words">{lines.map((line, j) => <Fragment key={j}>{j > 0 ? <br /> : null}{inline(line.replace(/^#{1,6}\s+/, ""))}</Fragment>)}</p>)}
    </div>
  );
}
