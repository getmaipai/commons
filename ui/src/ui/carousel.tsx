"use client"

import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/kit/utils"
import { Button } from "@/kit/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = NonNullable<UseCarouselParameters[1]>[number]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin[]
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
  autoplay?: boolean
  autoplayDelay?: number
  paused?: boolean
  onPausedChange?: (paused: boolean) => void
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
} & React.ComponentProps<"div">

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: CarouselApi
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  autoplay: boolean
  autoplayDelay: number
  paused: boolean
  onPausedChange: (paused: boolean) => void
  pauseOnHover?: boolean
  pauseOnFocus?: boolean
} & Pick<CarouselProps, "orientation">

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

function Carousel({
  orientation = "horizontal",
  opts,
  setApi,
  plugins,
  autoplay = false,
  autoplayDelay = 8000,
  paused,
  onPausedChange,
  pauseOnHover,
  pauseOnFocus,
  className,
  children,
  ...props
}: CarouselProps) {
  const [reducedMotion, setReducedMotion] = React.useState(false)
  React.useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])
  const [internalPaused, setInternalPaused] = React.useState(false)
  const lastMotionPreference = React.useRef(false)
  const controlled = paused !== undefined
  const isPaused = controlled ? paused : internalPaused
  const setPaused = React.useCallback((value: boolean) => {
    if (!controlled) setInternalPaused(value)
    onPausedChange?.(value)
  }, [controlled, onPausedChange])
  React.useEffect(() => {
    if (reducedMotion && !lastMotionPreference.current) setPaused(true)
    lastMotionPreference.current = reducedMotion
  }, [reducedMotion, setPaused])
  const autoplayPlugin = React.useMemo(
    () => (autoplay && !isPaused && !reducedMotion ? [Autoplay({ delay: autoplayDelay })] : []),
    [autoplay, autoplayDelay, isPaused, reducedMotion],
  )
  const [carouselRef, api] = useEmblaCarousel(
    {
      ...opts,
      axis: orientation === "horizontal" ? "x" : "y",
      ...(reducedMotion ? { duration: 0 } : {}),
    },
    [...(plugins ?? []), ...autoplayPlugin],
  )
  const [canScrollPrev, setCanScrollPrev] = React.useState(false)
  const [canScrollNext, setCanScrollNext] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const [focused, setFocused] = React.useState(false)

  const onSelect = React.useCallback((api: CarouselApi) => {
    if (!api) return
    setCanScrollPrev(api.canScrollPrev())
    setCanScrollNext(api.canScrollNext())
  }, [])

  const scrollPrev = React.useCallback(() => api?.scrollPrev(), [api])
  const scrollNext = React.useCallback(() => api?.scrollNext(), [api])

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        scrollPrev()
      } else if (event.key === "ArrowRight") {
        event.preventDefault()
        scrollNext()
      }
    },
    [scrollPrev, scrollNext],
  )

  React.useEffect(() => {
    if (!api || !setApi) return
    setApi(api)
  }, [api, setApi])

  React.useEffect(() => {
    if (!api) return
    onSelect(api)
    api.on("reInit", onSelect)
    api.on("select", onSelect)

    return () => {
      api.off("select", onSelect)
      api.off("reInit", onSelect)
    }
  }, [api, onSelect])

  return (
    <CarouselContext.Provider
      value={{
        carouselRef,
        api,
        orientation,
        autoplay,
        autoplayDelay,
        paused: isPaused,
        onPausedChange: setPaused,
        pauseOnHover,
        pauseOnFocus,
        scrollPrev,
        scrollNext,
        canScrollPrev,
        canScrollNext,
      }}
    >
      <div
        onKeyDownCapture={handleKeyDown}
        onMouseEnter={() => { if (pauseOnHover ?? autoplay) { setHovered(true); setPaused(true) } }}
        onMouseLeave={() => { if (pauseOnHover ?? autoplay) { setHovered(false); if (!focused) setPaused(false) } }}
        onFocusCapture={() => { if (pauseOnFocus ?? autoplay) { setFocused(true); setPaused(true) } }}
        onBlurCapture={(event) => {
          if ((pauseOnFocus ?? autoplay) && !event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); if (!hovered) setPaused(false) }
        }}
        className={cn("relative", className)}
        role="region"
        aria-roledescription="carousel"
        data-slot="carousel"
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  )
}

function CarouselContent({ className, ...props }: React.ComponentProps<"div">) {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div ref={carouselRef} className="overflow-hidden" data-slot="carousel-content">
      <div
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className,
        )}
        {...props}
      />
    </div>
  )
}

function CarouselItem({ className, ...props }: React.ComponentProps<"div">) {
  const { orientation } = useCarousel()

  return (
    <div
      role="group"
      aria-label={props["aria-label"]}
      aria-roledescription="slide"
      data-slot="carousel-item"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className,
      )}
      {...props}
    />
  )
}

function CarouselPrevious({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      data-slot="carousel-previous"
      variant={variant}
      size={size}
      disabled={!canScrollPrev}
      className={cn(
        "absolute size-12 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -left-12 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
}

function CarouselNext({
  className,
  variant = "outline",
  size = "icon",
  ...props
}: React.ComponentProps<typeof Button>) {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      data-slot="carousel-next"
      variant={variant}
      size={size}
      disabled={!canScrollNext}
      className={cn(
        "absolute size-12 rounded-full",
        orientation === "horizontal"
          ? "top-1/2 -right-12 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className,
      )}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight />
      <span className="sr-only">Next slide</span>
    </Button>
  )
}

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  Autoplay as CarouselAutoplay,
}
