import type { ReactElement } from "react";
import { describe, expect, test, afterEach, mock } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { TooltipProvider } from "@/kit/ui/tooltip";
import { SensesDock } from "./SensesDock";
import { ChildBand } from "./ChildBand";
import { SourcesCard } from "./SourcesCard";
import { MemoryChip } from "./MemoryChip";

afterEach(cleanup);

// Radix's PopoverTrigger opens on pointerdown, not a plain click;
// happy-dom's click alone leaves it closed (aria-expanded stays false).
function openTrigger(trigger: HTMLElement): void {
  act(() => {
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 });
    fireEvent.click(trigger);
  });
}

// SensesDock's own Tooltip needs an ancestor TooltipProvider (Radix
// throws without one) - the real app gets this for free from
// sidebar.tsx's own SidebarProvider, which every page mounts under.
function renderDock(node: ReactElement) {
  return render(<TooltipProvider>{node}</TooltipProvider>);
}

describe("SensesDock", () => {
  test("each sense gets its own accessible name and the wake word switch reflects its state", () => {
    const { getByRole } = renderDock(
      <SensesDock
        senses={[
          { kind: "listening", state: "active", label: "Listening" },
          { kind: "speaking", state: "idle", label: "Not speaking" },
          { kind: "vision", state: "refused", label: "Camera access refused" },
        ]}
        wakeWordLabel="Hey MaiPai"
        wakeWordEnabled={true}
        onWakeWordChange={() => {}}
      />,
    );
    expect(getByRole("img", { name: "Listening" })).toBeInTheDocument();
    expect(getByRole("img", { name: "Not speaking" })).toBeInTheDocument();
    expect(getByRole("img", { name: "Camera access refused" })).toBeInTheDocument();
    expect(getByRole("switch", { name: "Hey MaiPai" })).toHaveAttribute("aria-checked", "true");
  });

  test("toggling the wake word switch fires onWakeWordChange", () => {
    const onWakeWordChange = mock(() => {});
    const { getByRole } = renderDock(
      <SensesDock senses={[]} wakeWordLabel="Hey MaiPai" wakeWordEnabled={false} onWakeWordChange={onWakeWordChange} />,
    );
    fireEvent.click(getByRole("switch", { name: "Hey MaiPai" }));
    expect(onWakeWordChange).toHaveBeenCalledWith(true);
  });
});

describe("ChildBand", () => {
  test("names the child and carries no dismiss control", () => {
    const { getByRole, container } = render(<ChildBand personName="Marlow" />);
    expect(getByRole("status")).toHaveTextContent("Marlow is chatting. A parent can see this chat.");
    expect(container.querySelector("button")).toBeNull();
  });
});

describe("SourcesCard", () => {
  const sources = [
    { id: "s1", title: "Weather today", host: "weather.example.com", href: "https://weather.example.com/today" },
    { id: "s2", title: "Recipe card", host: "recipes.example.com", href: "https://recipes.example.com/card" },
  ];

  test("renders nothing for an empty source list", () => {
    const { container } = render(<SourcesCard sources={[]} />);
    expect(container.firstChild).toBeNull();
  });

  test("collapsed by default, showing the count", () => {
    const { getByText, queryByText } = render(<SourcesCard sources={sources} />);
    expect(getByText("Sources (2)")).toBeInTheDocument();
    expect(queryByText("Weather today")).not.toBeInTheDocument();
  });

  test("expands on tap to show each source's title and host", () => {
    const { getByText } = render(<SourcesCard sources={sources} />);
    fireEvent.click(getByText("Sources (2)"));
    expect(getByText("Weather today")).toBeInTheDocument();
    expect(getByText("weather.example.com")).toBeInTheDocument();
  });

  test("every row link opens in a new tab with no referrer (org privacy architecture)", () => {
    const { getByText, getAllByRole } = render(<SourcesCard sources={sources} />);
    fireEvent.click(getByText("Sources (2)"));
    const links = getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const [i, link] of links.entries()) {
      expect(link).toHaveAttribute("href", sources[i]!.href);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAttribute("referrerpolicy", "no-referrer");
    }
  });

  test("open/onOpenChange lets a caller control the disclosure (a citation click scrolling it open)", () => {
    const onOpenChange = mock(() => {});
    const { getByText } = render(<SourcesCard sources={sources} open={false} onOpenChange={onOpenChange} />);
    fireEvent.click(getByText("Sources (2)"));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });
});

describe("MemoryChip", () => {
  test("shows the right label per kind", () => {
    const { getByRole, rerender } = render(<MemoryChip kind="remembered" onKeep={() => {}} onEdit={() => {}} onForget={() => {}} />);
    expect(getByRole("button", { name: /Remembered/ })).toBeInTheDocument();
    rerender(<MemoryChip kind="recalled" onKeep={() => {}} onEdit={() => {}} onForget={() => {}} />);
    expect(getByRole("button", { name: /From memory/ })).toBeInTheDocument();
  });

  test("tapping the chip opens a popover (never a modal) with keep/edit/forget", () => {
    const onKeep = mock(() => {});
    const onEdit = mock(() => {});
    const onForget = mock(() => {});
    const { getByRole } = render(<MemoryChip kind="remembered" onKeep={onKeep} onEdit={onEdit} onForget={onForget} />);
    function actionButton(label: string): HTMLElement {
      const button = [...document.body.querySelectorAll('[data-slot="popover-content"] button')].find((b) => b.textContent?.includes(label));
      if (!button) throw new Error(`no popover action labeled "${label}"`);
      return button as HTMLElement;
    }

    openTrigger(getByRole("button", { name: /Remembered/ }));
    expect(document.querySelector('[data-slot="popover-content"]')).toBeTruthy();
    fireEvent.click(actionButton("Keep"));
    expect(onKeep).toHaveBeenCalledTimes(1);

    openTrigger(getByRole("button", { name: /Remembered/ }));
    fireEvent.click(actionButton("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);

    openTrigger(getByRole("button", { name: /Remembered/ }));
    fireEvent.click(actionButton("Forget"));
    expect(onForget).toHaveBeenCalledTimes(1);
  });

  test("a failed save renders a plain button (no popover) that goes straight to onOpenMemory", () => {
    const onOpenMemory = mock(() => {});
    const { getByRole } = render(<MemoryChip kind="failed" onOpenMemory={onOpenMemory} />);
    const chip = getByRole("button", { name: /Memory wasn't saved/ });
    fireEvent.click(chip);
    expect(onOpenMemory).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull();
  });
});
