import type { ReactNode } from "react";
import { Avatar } from "@/kit/primitives/Avatar";
import { cn } from "@/kit/utils";

export interface CharacterHeroProps {
  name: string;
  seed?: string | null;
  media?: ReactNode;
  line?: ReactNode;
  actions?: ReactNode;
  sticky?: boolean;
}

export function CharacterHero({ name, seed, media, line, actions, sticky = false }: CharacterHeroProps) {
  return <section aria-label={name} className={cn("flex flex-col items-center gap-3", sticky && "sticky top-0 z-20 bg-background/90 py-3 backdrop-blur")}>
    <div className="relative flex flex-col items-center">
      <div className="flex size-40 items-center justify-center overflow-hidden rounded-full">{media ?? <Avatar name={name} seed={seed} size="profile" className="size-full text-4xl" />}</div>
      <span className="mt-3 rounded-full bg-secondary px-4 py-2 text-base font-medium text-secondary-foreground">{name}</span>
    </div>
    {line ? <div className="text-sm text-muted-foreground">{line}</div> : null}
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </section>;
}
