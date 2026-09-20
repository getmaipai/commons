// A package's own home-screen widget (platform plan's package manifest
// `contributes.widgets`). Temporary hand-typed shape until a real
// generated wire type exists in @maipai/spec - kept here rather than in
// a product's own API client so the kit's WidgetCard/WidgetRow/
// NodeRenderer widget node share one definition instead of each product
// re-declaring it.
export interface WidgetDescriptor {
  package: string;
  id: string;
  title: string;
  size: "card" | "row";
  refresh_s: number;
}

export interface WidgetItem {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: string;
  href?: string;
  image?: string;
}

export interface WidgetData {
  as_of: string;
  items: WidgetItem[];
}
