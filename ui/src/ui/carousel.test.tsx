import { afterEach, describe, expect, test, mock } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/kit/ui/carousel";

let activeIndex = 0;
let carouselPlugins: unknown[] = [];
const carouselApi = {
  canScrollPrev: () => activeIndex > 0,
  canScrollNext: () => activeIndex < 2,
  scrollPrev: () => { activeIndex = Math.max(0, activeIndex - 1); carouselApi.emit("select"); },
  scrollNext: () => { activeIndex = Math.min(2, activeIndex + 1); carouselApi.emit("select"); },
  on: (event: string, callback: () => void) => { carouselApi.listeners.set(event, callback); },
  off: (event: string) => { carouselApi.listeners.delete(event); },
  emit: (event: string) => {
    if (event === "select") {
      document.querySelectorAll("[data-slot=carousel-item]").forEach((slide, index) => {
        if (index === activeIndex) slide.setAttribute("aria-current", "true");
        else slide.removeAttribute("aria-current");
      });
    }
    carouselApi.listeners.get(event)?.();
  },
  listeners: new Map<string, () => void>(),
};
mock.module("embla-carousel-react", () => ({
  default: (_options: unknown, plugins: unknown[] = []) => {
    carouselPlugins = plugins;
    return [(element: HTMLElement | null) => {
      if (element) element.parentElement?.querySelectorAll("[data-slot=carousel-item]").forEach((slide, index) => {
        if (index === activeIndex) slide.setAttribute("aria-current", "true");
        else slide.removeAttribute("aria-current");
      });
    }, carouselApi];
  },
}));
mock.module("embla-carousel-autoplay", () => ({ default: () => ({ name: "autoplay" }) }));

afterEach(cleanup);

describe("Carousel", () => {
  test("renders every slide", () => {
    activeIndex = 0;
    const { getAllByRole, getByText } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>First feature</CarouselItem>
          <CarouselItem>Second feature</CarouselItem>
          <CarouselItem>Third feature</CarouselItem>
        </CarouselContent>
      </Carousel>,
    );

    expect(getAllByRole("group")).toHaveLength(3);
    expect(getByText("First feature")).toBeTruthy();
    expect(getByText("Second feature")).toBeTruthy();
    expect(getByText("Third feature")).toBeTruthy();
  });

  test("next and previous change the active slide", async () => {
    activeIndex = 0;
    carouselApi.canScrollNext = () => activeIndex < 2;
    carouselApi.canScrollPrev = () => activeIndex > 0;
    const { getByRole, getAllByRole } = render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>First</CarouselItem>
          <CarouselItem>Second</CarouselItem>
          <CarouselItem>Third</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );

    await waitFor(() => { if ((getByRole("button", { name: "Next slide" }) as HTMLButtonElement).disabled) throw new Error("next is disabled"); });
    carouselApi.scrollNext();
    await waitFor(() => { if (getAllByRole("group")[1]?.getAttribute("aria-current") !== "true") throw new Error("second slide is not active"); });
    carouselApi.scrollPrev();
    await waitFor(() => { if (getAllByRole("group")[0]?.getAttribute("aria-current") !== "true") throw new Error("first slide is not active"); });
    expect(activeIndex).toBe(0);
    expect(getAllByRole("group")[0]?.getAttribute("aria-current")).toBe("true");
  });

  test("autoplay is off under reduced motion", async () => {
    activeIndex = 0;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      const { getByRole } = render(
        <Carousel autoplay>
          <CarouselContent>
            <CarouselItem>First</CarouselItem>
            <CarouselItem>Second</CarouselItem>
          </CarouselContent>
        </Carousel>,
      );

      await waitFor(() => expect(getByRole("region")).toBeTruthy());
      expect(carouselPlugins).toHaveLength(0);
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
