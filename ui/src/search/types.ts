export interface SearchResultItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: string;
  to: string;
  state?: Record<string, unknown>;
}

export interface SearchGroup {
  heading: string;
  items: SearchResultItem[];
}
