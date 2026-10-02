import { cn } from "../../../../../lib/utils";
import { ChevronRight } from "lucide-react";
import { ChildItem } from "../sidebaritems";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type React from "react";
import { SidebarMenuButton } from "../../../../../components/ui/sidebar";

interface NavItemProps {
  item: ChildItem;
  hasChildren: boolean;
  className?: string;
  isActive?: boolean;
  status?: { title: string; ariaLabel: string };
  render?: React.ReactElement;
}

export function navItemTooltip(name: string, statusTitle?: string) {
  return <span className="flex flex-col"><span>{name}</span>{statusTitle ? <span className="text-[10px] opacity-75">{statusTitle}</span> : null}</span>;
}

export default function NavItem({
  item,
  hasChildren,
  className,
  isActive,
  status,
  render,
}: NavItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const ariaLabel = status?.ariaLabel
    ? status.ariaLabel.toLocaleLowerCase().startsWith(`${item.name.toLocaleLowerCase()}:`)
      ? status.ariaLabel
      : `${item.name}: ${status.ariaLabel}`
    : item.name;

  // Owner ruling, 2026-09-27, accessibility touch-target fix - see
  // docs/BACKLOG.md SHELL-09. Preserve the sidebar's 40px row appearance;
  // 48px link rows are applied by nav-collapse, where the real anchors live.
  return (

    <SidebarMenuButton render={render ?? <motion.div
      className={cn("relative flex items-center gap-3 w-full group group-data-[state=collapsed]:px-2.5 px-3 py-2 my-0.5 transition-all duration-200 rounded-md",
        isActive && "bg-primary text-background font-medium", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={ariaLabel}
    />} tooltip={{ children: navItemTooltip(item.name, status?.title) }} isActive={isActive} aria-label={ariaLabel}>
      <AnimatePresence>

        {isHovered && (
          <motion.div
            layoutId="nav-hover-bg"
            className="absolute inset-0 bg-primary/5  rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        )}
      </AnimatePresence>

      <span className={"relative flex items-center gap-2 w-full  rounded-md "}>
        {/* Icon */}
        {item.icon && (
          <item.icon className={`h-4 w-4 ${item.color ?? ""}`} />
        )}

        {/* Name */}
        <span className="font-medium hide-menu">{item.name}</span>

        {/* Badge */}
        {item.badge && (
          <span
            className={`ms-auto  hide-menu text-xs rounded-full px-2 py-0.5 ${item.badgeType === "filled"
              ? "bg-primary text-white dark:text-black"
              : "border border-primary text-primary"
              }`}
          >
            {item.badgeContent}
          </span>
        )}

        {/* Chevron only if it has children */}
        {hasChildren && (
          <ChevronRight className="ms-auto h-4 w-4 transition-transform duration-200 group-open/nav:rotate-90 hide-menu" />
        )}
      </span>
    </SidebarMenuButton>
  );
}
