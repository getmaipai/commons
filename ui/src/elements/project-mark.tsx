"use client";

import { useState, type ComponentProps, type FC } from "react";
import { cn } from "cn";
import { getIcon } from "../icons";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import { i18n } from "@/kit/i18n";

/**
 * PROJECTS-KIT-01. The one drawing of a project's icon and colour: the
 * column row, the listing, the project page header and the edit dialog all
 * draw a `ProjectMark`, so the mark can never drift between them
 * (platform principle 1). The colour is a palette name, never a hex; each
 * maps to the kit's own `--hue-*` token (`neutral` is `--muted-foreground`).
 * Colour is never the only signal: the icon and the name always sit beside it.
 */
export const PROJECT_HUES = ["neutral", "blue", "violet", "teal", "orange", "pink", "red", "green", "yellow"] as const;
export type ProjectHue = (typeof PROJECT_HUES)[number];

/** The icon names a project may use, all keys of the kit's `icons` registry. */
export const PROJECT_ICON_NAMES = [
  "folder", "book", "briefcase", "home", "heart", "star", "graduation-cap", "calendar",
  "camera", "music", "code", "chef-hat", "plane", "dumbbell", "leaf", "paw-print",
  "gamepad", "palette", "wrench", "file-text", "sparkles", "globe", "baby", "gift",
] as const;
export type ProjectIconName = (typeof PROJECT_ICON_NAMES)[number];

export const DEFAULT_PROJECT_ICON: ProjectIconName = "folder";
export const DEFAULT_PROJECT_HUE: ProjectHue = "neutral";

export const isProjectHue = (value: unknown): value is ProjectHue =>
  typeof value === "string" && (PROJECT_HUES as readonly string[]).includes(value);

/** The CSS colour a hue name draws with. */
export const projectHueVar = (hue: string | undefined): string =>
  isProjectHue(hue) && hue !== "neutral" ? `var(--hue-${hue})` : "var(--muted-foreground)";

export const ProjectMark: FC<
  Omit<ComponentProps<"span">, "children"> & {
    icon?: string | undefined;
    color?: string | undefined;
    /** sm 16px (column rows), md 20px (tables, header). Default sm. */
    size?: "sm" | "md" | "lg" | undefined;
  }
> = ({ icon, color, size = "sm", className, style, ...props }) => {
  const known = icon !== undefined && (PROJECT_ICON_NAMES as readonly string[]).includes(icon);
  const Icon = getIcon(known ? icon : DEFAULT_PROJECT_ICON);
  return (
    <span
      data-slot="project-mark"
      data-hue={isProjectHue(color) ? color : "neutral"}
      aria-hidden
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ color: projectHueVar(color), ...style }}
      {...props}
    >
      <Icon className={size === "lg" ? "size-7" : size === "md" ? "size-5" : "size-4"} />
    </span>
  );
};

export type ProjectIconPickerLabels = {
  /** Accessible name of the button that opens the picker. Default "Choose icon and colour". */
  open?: string;
  icon?: string;
  color?: string;
  /** Names of the nine hues, by key. Defaults to the key with a capital. */
  hues?: Partial<Record<ProjectHue, string>>;
};

const hueName = (hue: ProjectHue): string => {
  switch (hue) {
    case "neutral": return i18n._({ id: "ui.Neutral", message: "Neutral" });
    case "blue": return i18n._({ id: "ui.Blue", message: "Blue" });
    case "violet": return i18n._({ id: "ui.Violet", message: "Violet" });
    case "teal": return i18n._({ id: "ui.Teal", message: "Teal" });
    case "orange": return i18n._({ id: "ui.Orange", message: "Orange" });
    case "pink": return i18n._({ id: "ui.Pink", message: "Pink" });
    case "red": return i18n._({ id: "ui.Red", message: "Red" });
    case "green": return i18n._({ id: "ui.Green", message: "Green" });
    case "yellow": return i18n._({ id: "ui.Yellow", message: "Yellow" });
  }
};

const iconName = (name: ProjectIconName): string => {
  switch (name) {
    case "folder": return i18n._({ id: "ui.Folder", message: "Folder" });
    case "book": return i18n._({ id: "ui.Book", message: "Book" });
    case "briefcase": return i18n._({ id: "ui.Briefcase", message: "Briefcase" });
    case "home": return i18n._({ id: "ui.Home", message: "Home" });
    case "heart": return i18n._({ id: "ui.Heart", message: "Heart" });
    case "star": return i18n._({ id: "ui.Star", message: "Star" });
    case "graduation-cap": return i18n._({ id: "ui.Graduation cap", message: "Graduation cap" });
    case "calendar": return i18n._({ id: "ui.Calendar", message: "Calendar" });
    case "camera": return i18n._({ id: "ui.Camera", message: "Camera" });
    case "music": return i18n._({ id: "ui.Music", message: "Music" });
    case "code": return i18n._({ id: "ui.Code", message: "Code" });
    case "chef-hat": return i18n._({ id: "ui.Chef hat", message: "Chef hat" });
    case "plane": return i18n._({ id: "ui.Plane", message: "Plane" });
    case "dumbbell": return i18n._({ id: "ui.Dumbbell", message: "Dumbbell" });
    case "leaf": return i18n._({ id: "ui.Leaf", message: "Leaf" });
    case "paw-print": return i18n._({ id: "ui.Paw print", message: "Paw print" });
    case "gamepad": return i18n._({ id: "ui.Gamepad", message: "Gamepad" });
    case "palette": return i18n._({ id: "ui.Palette", message: "Palette" });
    case "wrench": return i18n._({ id: "ui.Wrench", message: "Wrench" });
    case "file-text": return i18n._({ id: "ui.File text", message: "File text" });
    case "sparkles": return i18n._({ id: "ui.Sparkles", message: "Sparkles" });
    case "globe": return i18n._({ id: "ui.Globe", message: "Globe" });
    case "baby": return i18n._({ id: "ui.Baby", message: "Baby" });
    case "gift": return i18n._({ id: "ui.Gift", message: "Gift" });
  }
};

/**
 * The icon button beside a project's name field (ChatGPT's project
 * settings): it shows the current mark and opens a popover with the icon
 * grid and the colour row. Both are single-select toggle groups.
 */
export const ProjectIconPicker: FC<{
  icon: string;
  color: string;
  onChange: (next: { icon: string; color: string }) => void;
  disabled?: boolean | undefined;
  labels?: ProjectIconPickerLabels | undefined;
}> = ({ icon, color, onChange, disabled, labels }) => {
  const [open, setOpen] = useState(false);
  const text = {
    open: labels?.open ?? i18n._({ id: "ui.Choose icon and colour", message: "Choose icon and colour" }),
    icon: labels?.icon ?? i18n._({ id: "ui.Icon", message: "Icon" }),
    color: labels?.color ?? i18n._({ id: "ui.Colour", message: "Colour" }),
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-slot="project-icon-picker-trigger"
          aria-label={text.open}
          disabled={disabled}
          className="border-input hover:bg-accent focus-visible:ring-ring/50 relative flex size-9 shrink-0 items-center justify-center rounded-lg border outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 before:absolute before:-inset-1.5 before:content-['']"
        >
          <ProjectMark icon={icon} color={color} size="md" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" data-slot="project-icon-picker" className="flex w-72 flex-col gap-3 p-3">
        <ToggleGroup
          type="single"
          variant="default"
          aria-label={text.color}
          value={color}
          onValueChange={(next) => next && onChange({ icon, color: next })}
          className="flex flex-wrap gap-1"
        >
          {PROJECT_HUES.map((hue) => (
            <ToggleGroupItem key={hue} value={hue} aria-label={labels?.hues?.[hue] ?? hueName(hue)} size="sm">
              <span aria-hidden className="size-4 rounded-full" style={{ backgroundColor: projectHueVar(hue) }} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <ToggleGroup
          type="single"
          variant="default"
          aria-label={text.icon}
          value={icon}
          onValueChange={(next) => next && onChange({ icon: next, color })}
          className="flex flex-wrap gap-1"
        >
          {PROJECT_ICON_NAMES.map((name) => (
            <ToggleGroupItem key={name} value={name} aria-label={iconName(name)} size="sm">
              <ProjectMark icon={name} color={color} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
};
