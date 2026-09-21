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
  Settings,
  Cpu,
  RefreshCw,
  Wrench,
  DatabaseBackup,
  LucideIcon,
} from "lucide-react";

// Home's own sidebar, as data (the plan's stand-up list: Home, Chat, Apps;
// Household: People; System: Settings; Manage: Engines, Updates, Repairs,
// Backups). Labels and routes only - the template's own nav-items/Sidebar
// components render this unmodified.
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
        name: "Apps",
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
  {
    heading: "System",
    items: [
      {
        id: uniqueId(),
        name: "Settings",
        icon: Settings,
        url: "/next/settings",
      },
    ],
  },
  {
    heading: "Manage",
    items: [
      {
        id: uniqueId(),
        name: "Engines",
        icon: Cpu,
        url: "/next/engines",
      },
      {
        id: uniqueId(),
        name: "Updates",
        icon: RefreshCw,
        url: "/next/updates",
      },
      {
        id: uniqueId(),
        name: "Repairs",
        icon: Wrench,
        url: "/next/repairs",
      },
      {
        id: uniqueId(),
        name: "Backups",
        icon: DatabaseBackup,
        url: "/next/backups",
      },
    ],
  },
];

export default SidebarContent;
