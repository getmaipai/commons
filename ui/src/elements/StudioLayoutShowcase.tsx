import { Badge } from "@/elements/ui/badge";
import { Button } from "@/elements/ui/button";
import { StudioLayout } from "@/kit/elements/studio-layout";

export function StudioLayoutShowcase() {
  return <StudioLayout
    title="Appearance studio"
    subtitle="My Rivet · draft"
    actions={<Button>Save changes</Button>}
    navLabel="Appearance sections"
    nav={<div className="flex gap-2 lg:flex-col"><Badge variant="secondary">Basics</Badge><Badge variant="outline">Appearance</Badge><Badge variant="outline">Voice</Badge></div>}
    rail={<section className="grid gap-3"><h2 className="font-medium">Reference</h2><div className="rounded-lg border border-border bg-card p-4 text-card-foreground">Portrait and style notes</div><h2 className="font-medium">Checks</h2><p className="text-sm text-muted-foreground">All changes are ready to review.</p></section>}
  >
    <section className="grid min-h-64 place-items-center rounded-xl border border-border bg-muted p-6 text-center">
      <div><h2 className="text-lg font-medium">Preview stage</h2><p className="mt-2 text-sm text-muted-foreground">Your character preview appears here.</p></div>
    </section>
  </StudioLayout>;
}
