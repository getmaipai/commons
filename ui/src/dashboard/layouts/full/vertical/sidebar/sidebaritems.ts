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
import { i18n } from "@/kit/i18n";

import {
  House,
  MessageCircle,
  Users,
  Folder,
  LucideIcon,
} from "lucide-react";

// Home's own sidebar, as data (owner ruling, ui-v0.5.23: Home, Chat,
// Tools; Household: People; Settings and Help move to the rail's own
// bottom slot - NavUser.tsx, the same vendor-time data file this one
// is). The former System group (Settings alone) and Manage group
// (Engines, Updates, Repairs, Backups) are gone from the rail: all four
// Manage routes stay real and reachable - from the dashboard's own stat
// cards, and from a "Manage" section at the bottom of Settings' own
// Household tab - just not as permanent rail weight for four pages a
// household visits rarely. Labels and routes only - the template's own
// nav-items/Sidebar components render this unmodified.
// Labels are getters so they read the active language each time a consumer renders them.
const SidebarContent: MenuItem[] = [
  {
    get heading() { return i18n._({ id: "ui.Home", message: "Home" }) },
    items: [
      {
        id: uniqueId(),
        get name() { return i18n._({ id: "ui.Home", message: "Home" }) },
        icon: House,
        url: "/",
      },
      {
        id: uniqueId(),
        get name() { return i18n._({ id: "ui.Chat", message: "Chat" }) },
        icon: MessageCircle,
        url: "/chat",
      },
      {
        id: uniqueId(),
        get name() { return i18n._({ id: "ui.Library", message: "Library" }) },
        icon: Folder,
        url: "/files",
      },
    ],
  },
  {
    get heading() { return i18n._({ id: "ui.Household", message: "Household" }) },
    items: [
      {
        id: uniqueId(),
        get name() { return i18n._({ id: "ui.Family", message: "Family" }) },
        icon: Users,
        url: "/people",
      },
    ],
  },
];

export default SidebarContent;
