import type { ReactNode } from "react";

export interface StudioLayoutProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  navLabel: string;
  nav: ReactNode;
  rail?: ReactNode;
  children: ReactNode;
}

export function StudioLayout({ title, subtitle, actions, navLabel, nav, rail, children }: StudioLayoutProps) {
  return <div className="grid gap-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div> : null}
      </div>
      {actions ? <div className="min-w-0 sm:shrink-0">{actions}</div> : null}
    </header>
    <div className={rail ? "grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)_18rem]" : "grid min-w-0 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]"}>
      <nav aria-label={navLabel} className="min-w-0 overflow-x-auto">{nav}</nav>
      <div className="min-w-0">{children}</div>
      {rail ? <aside className="min-w-0 border-border lg:border-l lg:pl-6">{rail}</aside> : null}
    </div>
  </div>;
}
