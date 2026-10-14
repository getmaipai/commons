import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/kit/ui/carousel";

let activeIndex = 0;
let carouselPlugins: unknown[] = [];
let carouselOptions: Record<string, unknown> = {};
const carouselApi = {
  canScrollPrev: () => activeIndex > 0,
  canScrollNext: () => activeIndex < 2,
  scrollPrev: () => { activeIndex = Math.max(0, activeIndex - 1); carouselApi.emit("select"); },
  scrollNext: () => { activeIndex = Math.min(2, activeIndex + 1); carouselApi.emit("select"); },
  on: (event: string, callback: () => void) => { carouselApi.listeners.set(event, callback); },
  off: (event: string) => { carouselApi.listeners.delete(event); },
  emit: (event: string) => {
    if (event === "select") document.querySelectorAll("[data-slot=carousel-item]").forEach((slide, index) => {
      if (index === activeIndex) slide.setAttribute("aria-current", "true");
      else slide.removeAttribute("aria-current");
    });
    carouselApi.listeners.get(event)?.();
  },
  listeners: new Map<string, () => void>(),
};
mock.module("embla-carousel-react", () => ({
  default: (options: Record<string, unknown>, plugins: unknown[] = []) => {
    carouselOptions = options;
    carouselPlugins = plugins;
    return [(element: HTMLElement | null) => {
      if (element) element.parentElement?.querySelectorAll("[data-slot=carousel-item]").forEach((slide, index) => {
        if (index === activeIndex) slide.setAttribute("aria-current", "true");
        else slide.removeAttribute("aria-current");
      });
    }, carouselApi];
  },
}));
mock.module("embla-carousel-autoplay", () => ({ default: (options: unknown) => ({ name: "autoplay", options }) }));

afterEach(cleanup);

describe("Carousel", () => {
  test("renders every slide", () => {
    activeIndex = 0;
    const { getAllByRole, getByText } = render(<Carousel><CarouselContent><CarouselItem>First feature</CarouselItem><CarouselItem>Second feature</CarouselItem><CarouselItem>Third feature</CarouselItem></CarouselContent></Carousel>);
    expect(getAllByRole("group")).toHaveLength(3);
    expect(getByText("First feature")).toBeTruthy();
    expect(getByText("Second feature")).toBeTruthy();
    expect(getByText("Third feature")).toBeTruthy();
  });

  test("next and previous change the active slide", async () => {
    activeIndex = 0;
    const { getByRole, getAllByRole } = render(<Carousel><CarouselContent><CarouselItem>First</CarouselItem><CarouselItem>Second</CarouselItem><CarouselItem>Third</CarouselItem></CarouselContent><CarouselPrevious /><CarouselNext /></Carousel>);
    await waitFor(() => expect((getByRole("button", { name: "Next slide" }) as HTMLButtonElement).disabled).toBe(false));
    carouselApi.scrollNext();
    await waitFor(() => expect(getAllByRole("group")[1]?.getAttribute("aria-current")).toBe("true"));
    carouselApi.scrollPrev();
    await waitFor(() => expect(getAllByRole("group")[0]?.getAttribute("aria-current")).toBe("true"));
  });

  test("autoplay is off and manual changes are immediate under reduced motion", async () => {
    activeIndex = 0;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)", media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false })) as typeof window.matchMedia;
    try {
      const { getByRole } = render(<Carousel autoplay><CarouselContent><CarouselItem>First</CarouselItem><CarouselItem>Second</CarouselItem></CarouselContent></Carousel>);
      await waitFor(() => expect(getByRole("region")).toBeTruthy());
      expect(carouselPlugins).toHaveLength(0);
      expect(carouselOptions.duration).toBe(0);
      carouselApi.scrollNext();
      expect(activeIndex).toBe(1);
    } finally { window.matchMedia = originalMatchMedia; }
  });

  test("uses an 8 second default and the configured autoplay delay", () => {
    render(<Carousel autoplay><CarouselContent><CarouselItem>First</CarouselItem></CarouselContent></Carousel>);
    expect((carouselPlugins[0] as { options: { delay: number } }).options.delay).toBe(8000);
    cleanup();
    render(<Carousel autoplay autoplayDelay={42}><CarouselContent><CarouselItem>First</CarouselItem></CarouselContent></Carousel>);
    expect((carouselPlugins[0] as { options: { delay: number } }).options.delay).toBe(42);
  });

  test("pause control and hover/focus callbacks work", () => {
    const onPausedChange = mock(() => {});
    const { getByRole } = render(<Carousel autoplay onPausedChange={onPausedChange}><CarouselContent><CarouselItem><button type="button">Inside</button></CarouselItem></CarouselContent></Carousel>);
    const region = getByRole("region");
    fireEvent.mouseEnter(region);
    expect(onPausedChange).toHaveBeenCalledWith(true);
    fireEvent.mouseLeave(region);
    fireEvent.focus(region);
    expect(onPausedChange).toHaveBeenCalledWith(true);
    fireEvent.blur(region, { relatedTarget: document.body });
    expect(onPausedChange).toHaveBeenCalledWith(false);
  });
});
