export interface ChildItem {
  id?: number | string;
  name: string;
  icon?: LucideIcon;
  items?: ChildItem[];
  item?: unknown;
  url?: string;
  color?: string;
  disabled?: boolean;
  subtitle?: string;
  badge?: boolean;
  badgeType?: string;
  badgeContent?: string;
  isActive?: boolean;
  external?: boolean;
}

export interface MenuItem {
  heading?: string;
  name?: string;
  icon?: LucideIcon;
  id?: number;
  to?: string;
  item?: MenuItem[];
  items?: ChildItem[];
  url?: string;
  disabled?: boolean;
  subtitle?: string;
  badgeType?: string;
  badge?: boolean;
  badgeContent?: string;
  isActive?: boolean;
}

import { uniqueId } from "lodash";

import {
  House,
  MessageCircle,
  LayoutGrid,
  Users,
  LucideIcon,
} from "lucide-react";

// Home's own sidebar, as data (owner ruling, ui-v0.5.23: Home, Chat,
// Plugins; Household: People; Settings and Help move to the rail's own
// bottom slot - NavUser.tsx, the same vendor-time data file this one
// is). The former System group (Settings alone) and Manage group
// (Engines, Updates, Repairs, Backups) are gone from the rail: all four
// Manage routes stay real and reachable - from the dashboard's own stat
// cards, and from a "Manage" section at the bottom of Settings' own
// Household tab - just not as permanent rail weight for four pages a
// household visits rarely. Labels and routes only - the template's own
// nav-items/Sidebar components render this unmodified.
const SidebarContent: MenuItem[] = [
  {
    heading: "Home",
    items: [
      {
        id: uniqueId(),
        name: "Home",
        icon: House,
        url: "/next",
      },
      {
        id: uniqueId(),
        name: "Chat",
        icon: MessageCircle,
        url: "/next/chat",
      },
      {
        id: uniqueId(),
        // This page lists internal tool-capability plugins, not apps a
        // person opens; reserve "Apps" for user-facing apps (owner
        // ruling, ui-v0.5.61, 2026-09-25).
        name: "Plugins",
        icon: LayoutGrid,
        url: "/next/apps",
      },
    ],
  },
  {
    heading: "Household",
    items: [
      {
        id: uniqueId(),
        name: "People",
        icon: Users,
        url: "/next/people",
      },
    ],
  },
];

export default SidebarContent;
