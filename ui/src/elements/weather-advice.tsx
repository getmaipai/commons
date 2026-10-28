"use client";

import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { getIcon, icons } from "../icons";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Badge } from "../ui/badge";

/** One advice chip ("Bring a jacket"). `icon` is a kit icon name; an unknown or absent name draws no icon. */
export interface WeatherAdvice {
  id: string;
  label: string;
  icon?: string;
  tone?: "info" | "warn";
}

/** A weather alert banner. `severe` draws in the destructive variant, `warn` in the warning variant. */
export interface WeatherAlert {
  title: string;
  text?: string;
  severity?: "info" | "warn" | "severe";
}

/** The advice chips row. Draws nothing when the list is absent or empty. */
export function WeatherAdviceChips({ advice }: { advice?: readonly WeatherAdvice[] }) {
  if (!advice?.length) return null;
  return (
    <ul data-slot="weather-advice" aria-label="Recommended" className="flex flex-wrap items-center gap-2">
      <li data-slot="weather-advice-lead" aria-hidden className="text-xs font-medium tracking-wide uppercase opacity-70">Recommended</li>
      {advice.map((item) => {
        const Icon = item.icon && item.icon in icons ? getIcon(item.icon) : null;
        return (
          <li key={item.id} data-slot="weather-advice-item" data-tone={item.tone ?? "info"}>
            <Badge variant={item.tone === "warn" ? "default" : "secondary"} tone={item.tone === "warn" ? "warning" : undefined}>
              {Icon ? <Icon aria-hidden /> : null}
              {item.label}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}

/** The alert banner. Draws nothing when absent. */
export function WeatherAlertBanner({ alert }: { alert?: WeatherAlert }) {
  if (!alert) return null;
  const severity = alert.severity ?? "info";
  const Icon = severity === "info" ? InfoIcon : AlertTriangleIcon;
  return (
    <Alert
      data-slot="weather-alert"
      data-severity={severity}
      variant={severity === "severe" ? "destructive" : severity === "warn" ? "warning" : "default"}
    >
      <Icon aria-hidden />
      <AlertTitle>{alert.title}</AlertTitle>
      {alert.text ? <AlertDescription>{alert.text}</AlertDescription> : null}
    </Alert>
  );
}
