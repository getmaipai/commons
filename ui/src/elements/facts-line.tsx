import { cn } from "cn";

/**
 * A facts line: one string the server supplies ("Full HD · 5 s · 1920×1088 · about 8 min"), set in the mono face, muted, on one line
 * where it fits and wrapping on a phone. It draws nothing for an empty string. The words are never built here.
 */
export function FactsLine({ children, className }: { children?: string | null; className?: string }) {
  const text = typeof children === "string" ? children.trim() : "";
  if (!text) return null;
  return <p data-slot="facts-line" title={text} className={cn("text-muted-foreground m-0 font-mono text-xs leading-relaxed [overflow-wrap:anywhere] sm:truncate sm:text-[13px]", className)}>{text}</p>;
}
