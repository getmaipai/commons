import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";

// Embla measures layout, which happy-dom does not do; the same stand-in carousel.test.tsx uses.
let selected = 0;
let plugins: unknown[] = [];
const listeners = new Map<string, () => void>();
const api = {
  canScrollPrev: () => selected > 0,
  canScrollNext: () => true,
  scrollPrev: () => {},
  scrollNext: () => {},
  scrollTo: (i: number) => {
    selected = i;
    listeners.get("select")?.();
  },
  selectedScrollSnap: () => selected,
  on: (event: string, cb: () => void) => listeners.set(event, cb),
  off: (event: string) => listeners.delete(event),
};
mock.module("embla-carousel-react", () => ({
  default: (_options: unknown, p: unknown[] = []) => {
    plugins = p;
    return [() => {}, api];
  },
}));
mock.module("embla-carousel-autoplay", () => ({ default: (options: unknown) => ({ name: "autoplay", options }) }));

const { Billboard } = await import("@/kit/primitives/Billboard");

afterEach(() => {
  cleanup();
  selected = 0;
});

const play = mock(() => {});
const later = mock(() => {});
const SLIDES = [
  {
    id: "a",
    art: "/art/a.jpg",
    eyebrow: "New from Nova Skywatch",
    title: "The night sky this month",
    subtitle: "Two planets meet low in the west.",
    primary: { label: "Play", onSelect: play },
    secondary: [{ label: "Watch later", icon: "plus", onSelect: later }],
  },
  { id: "b", title: "The Quiet Harbor", primary: { label: "Resume S2 E4", onSelect: () => {} } },
];

function reducedMotion(on: boolean) {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: on && query === "(prefers-reduced-motion: reduce)",
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe("Billboard", () => {
  test("draws each slide with its words and actions", () => {
    const restore = reducedMotion(false);
    try {
      const { getByRole, getByText, getAllByRole } = render(<Billboard label="Featured" slides={SLIDES} />);
      expect(getByRole("region", { name: "Featured" })).toBeTruthy();
      expect(getAllByRole("group")).toHaveLength(2);
      expect(getByText("New from Nova Skywatch")).toBeTruthy();
      expect(getByRole("heading", { name: "The night sky this month" })).toBeTruthy();
      fireEvent.click(getByRole("button", { name: "Play" }));
      fireEvent.click(getByRole("button", { name: "Watch later" }));
      expect(play).toHaveBeenCalled();
      expect(later).toHaveBeenCalled();
    } finally {
      restore();
    }
  });

  test("autoplays with the Embla autoplay plugin, and not under reduced motion", async () => {
    let restore = reducedMotion(false);
    try {
      render(<Billboard label="Featured" slides={SLIDES} autoplayDelay={6000} />);
      expect((plugins[0] as { options: { delay: number } }).options.delay).toBe(6000);
    } finally {
      restore();
    }
    cleanup();
    restore = reducedMotion(true);
    try {
      render(<Billboard label="Featured" slides={SLIDES} />);
      await waitFor(() => expect(plugins).toHaveLength(0));
    } finally {
      restore();
    }
  });

  test("one slide does not autoplay or draw dots", () => {
    const restore = reducedMotion(false);
    try {
      const { container } = render(<Billboard label="Featured" slides={SLIDES.slice(0, 1)} />);
      expect(plugins).toHaveLength(0);
      expect(container.querySelector("[data-slot=billboard-dots]")).toBeNull();
    } finally {
      restore();
    }
  });

  test("the dots move to a slide and report it", async () => {
    const restore = reducedMotion(false);
    const onSlideChange = mock((_: { id: string }) => {});
    try {
      const { getByRole } = render(<Billboard label="Featured" slides={SLIDES} onSlideChange={onSlideChange} />);
      const dot = getByRole("button", { name: "Show The Quiet Harbor" });
      expect(dot.className).toContain("size-12");
      fireEvent.click(dot);
      await waitFor(() => expect(dot.getAttribute("aria-current")).toBe("true"));
      expect(onSlideChange.mock.calls.at(-1)?.[0].id).toBe("b");
    } finally {
      restore();
    }
  });

  test("resting on a slide shows the dwell preview, leaving removes it", async () => {
    const restore = reducedMotion(false);
    try {
      const { getAllByRole, findByText, queryByText } = render(
        <Billboard label="Featured" slides={SLIDES} dwellMs={30} renderPreview={(s) => <span>Preview of {s.id}</span>} />,
      );
      fireEvent.mouseEnter(getAllByRole("group")[0]!);
      await findByText("Preview of a");
      fireEvent.mouseLeave(getAllByRole("group")[0]!);
      expect(queryByText("Preview of a")).toBeNull();
    } finally {
      restore();
    }
  });

  test("no dwell preview under reduced motion", async () => {
    const restore = reducedMotion(true);
    try {
      const { getAllByRole, queryByText } = render(
        <Billboard label="Featured" slides={SLIDES} dwellMs={10} renderPreview={(s) => <span>Preview of {s.id}</span>} />,
      );
      fireEvent.mouseEnter(getAllByRole("group")[0]!);
      await new Promise((r) => setTimeout(r, 60));
      expect(queryByText("Preview of a")).toBeNull();
    } finally {
      restore();
    }
  });
});
