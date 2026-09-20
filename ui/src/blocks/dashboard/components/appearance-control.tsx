import { useTheme } from "next-themes";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";

const MonitorIcon = getIcon("monitor");
const SunIcon = getIcon("sun");
const MoonIcon = getIcon("moon");

/** System/Light/Dark, the one theme-mode control every product's header
 * shows - built on next-themes, never a hand-rolled dark-mode toggle. */
export function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  const options: { value: "system" | "light" | "dark"; label: string }[] = [
    { value: "system", label: "System" },
    { value: "light", label: "Light" },
    { value: "dark", label: "Dark" },
  ];
  return (
    <div className="hidden items-center gap-0.5 rounded-md border bg-muted/40 p-0.5 sm:flex">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="icon-sm"
          variant={theme === option.value ? "secondary" : "ghost"}
          aria-label={`Use ${option.label.toLowerCase()} appearance`}
          aria-pressed={theme === option.value}
          title={option.label}
          onClick={() => setTheme(option.value)}
          // icon-sm's own 48px hit-area extension would overlap the next
          // segment in this tightly-packed (gap-0.5) segmented control -
          // cancelled here rather than misfiring onto the wrong option.
          className="before:content-none"
        >
          {option.value === "dark" ? <MoonIcon className="size-4" /> : option.value === "light" ? <SunIcon className="size-4" /> : <MonitorIcon className="size-4" />}
        </Button>
      ))}
    </div>
  );
}
