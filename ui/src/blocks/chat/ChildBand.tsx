import { getIcon } from "@/kit/icons";
import { cn } from "@/kit/utils";

export interface ChildBandProps {
  /** The child's own display name, e.g. "Marlow". */
  personName: string;
  className?: string;
}

const EyeIcon = getIcon("eye");

/** A one-line band under the header, panel color, when a child profile
 * is chatting (spec.md "The senses dock and the model picker"). Always
 * on for a child, never dismissable - part of the safety architecture,
 * so this component takes no `onDismiss` and renders no close control. */
export function ChildBand({ personName, className }: ChildBandProps) {
  return (
    <div data-slot="chat-child-band" role="status" className={cn("flex items-center gap-2 bg-card px-4 py-2 text-sm text-muted-foreground", className)}>
      <EyeIcon className="size-4 shrink-0" aria-hidden />
      <span>{personName} is chatting. A parent can see this chat.</span>
    </div>
  );
}
