import type { ReactNode } from "react";
import { cn } from "../dashboard/lib/utils";

/** The 48 px hit area for a text field. An input cannot carry a ::before
 * overhang, so the field sits in a label whose vertical padding adds the
 * rest (`pad` px above and below); negative margins cancel it in the
 * layout, and a click anywhere in the label focuses the field natively. */
export function HitField({ pad, className, children }: { pad: 6 | 10; className?: string; children: ReactNode }) {
  return (
    <label
      data-slot="hit-field"
      className={cn("flex min-w-0 cursor-text", pad === 10 ? "-my-2.5 py-2.5" : "-my-1.5 py-1.5", className)}
    >
      {children}
    </label>
  );
}
