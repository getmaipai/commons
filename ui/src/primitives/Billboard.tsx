import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getIcon } from "@/kit/icons";
import { Button } from "@/kit/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/kit/ui/carousel";
import { cn, FOCUS_RING } from "@/kit/utils";
import { SafeImage } from "@/kit/primitives/SafeImage";

/** One action on a slide. */
export interface BillboardAction {
  label: string;
  icon?: string;
  onSelect: () => void;
}

/** One slide: backdrop art, a short eyebrow line, the title, a subtitle, a primary action (Play) and optional
 * secondary ones (Watch later, More info). */
export interface BillboardSlide {
  id: string;
  /** Backdrop art (a hub file route). */
  art?: string;
  /** Small line over the title ("New from Nova Skywatch"). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Extra facts under the title (year, rating badge, seasons). */
  meta?: ReactNode;
  primary: BillboardAction;
  secondary?: BillboardAction[];
}

export interface BillboardProps {
  slides: readonly BillboardSlide[];
  /** Accessible name of the carousel. */
  label: string;
  /** `card`: a rounded card in the page flow. `hero`: full width and taller, the title set large (Shows and Films).
   * MEDIA-POLISH-01 `banner`: a short 340 px band from 640 px, so the first shelf shows under it (Videos, the approved
   * media mockup); on a phone it grows with its words, with room on top for the dots. */
  size?: "card" | "hero" | "banner";
  autoplay?: boolean;
  autoplayDelay?: number;
  /** The dwell preview slot: what to draw over a slide's backdrop after the person rests on it (a muted trailer).
   * Never shown under reduced motion. */
  renderPreview?: (slide: BillboardSlide) => ReactNode;
  dwellMs?: number;
  /** Reports the slide in view (for a page that shows its details elsewhere). */
  onSlideChange?: (slide: BillboardSlide) => void;
}

function Icon({ name }: { name: string }) {
  const Glyph = getIcon(name);
  return <Glyph className={name === "play" ? "size-5 fill-current" : "size-5"} aria-hidden />;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** A media home's rotating hero, composed from the kit's shadcn Carousel (Embla with its autoplay plugin): autoplay
 * pauses on hover, on focus, on a hidden tab (the plugin's own) and under reduced motion (the Carousel's own). */
export function Billboard({
  slides,
  label,
  size = "card",
  autoplay = true,
  autoplayDelay = 8000,
  renderPreview,
  dwellMs = 1500,
  onSlideChange,
}: BillboardProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const dwell = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const changeRef = useRef(onSlideChange);
  changeRef.current = onSlideChange;

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const index = api.selectedScrollSnap();
      setCurrent(index);
      setPreviewing(null);
      const slide = slides[index];
      if (slide) changeRef.current?.(slide);
    };
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api, slides]);

  const stopDwell = useCallback(() => {
    if (dwell.current) clearTimeout(dwell.current);
    dwell.current = null;
  }, []);
  const startDwell = useCallback(
    (id: string) => {
      if (!renderPreview || reducedMotion) return;
      stopDwell();
      dwell.current = setTimeout(() => setPreviewing(id), dwellMs);
    },
    [renderPreview, reducedMotion, dwellMs, stopDwell],
  );
  useEffect(() => stopDwell, [stopDwell]);

  if (slides.length === 0) return null;
  const hero = size === "hero";

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: slides.length > 1 }}
      autoplay={autoplay && slides.length > 1}
      autoplayDelay={autoplayDelay}
      aria-label={label}
      data-slot="billboard"
      data-size={size}
      className={cn("dark w-full overflow-hidden text-foreground", hero ? "" : "rounded-[var(--radius-card)]")}
    >
      <CarouselContent>
        {slides.map((slide, index) => (
          <CarouselItem
            key={slide.id}
            aria-label={`${index + 1} of ${slides.length}: ${slide.title}`}
            aria-current={index === current ? "true" : undefined}
            onMouseEnter={() => startDwell(slide.id)}
            onMouseLeave={() => {
              stopDwell();
              setPreviewing(null);
            }}
            onFocus={() => startDwell(slide.id)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                stopDwell();
                setPreviewing(null);
              }
            }}
          >
            <div
              className={cn(
                "relative isolate flex w-full flex-col justify-end overflow-hidden bg-[var(--art-surface)]",
                hero ? "min-h-[28rem] sm:min-h-[36rem]" : size === "banner" ? "min-h-72 pt-14 sm:h-[340px] sm:min-h-0 sm:pt-0" : "aspect-[4/3] sm:aspect-[21/8]",
              )}
            >
              <SafeImage src={slide.art} alt="" kind="video" className="absolute inset-0 -z-20 size-full object-cover" />
              {previewing === slide.id && renderPreview ? (
                <div className="absolute inset-0 -z-10" data-slot="billboard-preview">
                  {renderPreview(slide)}
                </div>
              ) : null}
              {/* The scrim that keeps the words readable over any art. */}
              <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--background)] via-[color-mix(in_srgb,var(--background)_45%,transparent)] to-transparent" />
              <div className={cn("flex max-w-2xl flex-col gap-3", hero ? "p-6 sm:p-10" : "p-4 sm:p-6")}>
                {slide.eyebrow ? (
                  <p className="text-sm font-semibold tracking-widest text-[var(--art-eyebrow)] uppercase">{slide.eyebrow}</p>
                ) : null}
                <h2 className={cn("font-bold text-balance", hero ? "text-4xl uppercase sm:text-6xl" : "text-2xl sm:text-3xl")}>{slide.title}</h2>
                {slide.meta ? <div className="flex flex-wrap items-center gap-2 text-sm">{slide.meta}</div> : null}
                {slide.subtitle ? <p className="text-base text-pretty opacity-90">{slide.subtitle}</p> : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="inverse" onClick={slide.primary.onSelect}>
                    <Icon name={slide.primary.icon ?? "play"} />
                    {slide.primary.label}
                  </Button>
                  {slide.secondary?.map((action) => (
                    <Button key={action.label} variant="secondary" onClick={action.onSelect}>
                      {action.icon ? <Icon name={action.icon} /> : null}
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {slides.length > 1 ? (
        <div className="absolute end-2 top-2 flex sm:top-auto sm:bottom-2" data-slot="billboard-dots">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show ${slide.title}`}
              aria-current={index === current ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
              className={cn("flex size-12 items-center justify-center rounded-full", FOCUS_RING)}
            >
              <span
                aria-hidden
                className={cn("block h-2 rounded-full bg-foreground transition-all", index === current ? "w-6" : "w-2 opacity-50")}
              />
            </button>
          ))}
        </div>
      ) : null}
    </Carousel>
  );
}
