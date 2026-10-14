import type { ReactNode } from "react";
import { useMediaQuery } from "usehooks-ts";
import { Button } from "@/kit/ui/button";
import { getIcon } from "@/kit/icons";
import { cn, FOCUS_RING } from "@/kit/utils";
import { Progress } from "@/kit/primitives/Progress";

const CheckIcon = getIcon("check");

export interface WizardStep {
  id: string;
  title: string;
}

interface WizardProps {
  steps: WizardStep[];
  currentStepId: string;
  /** A step index at or below this has already been completed and can be
   * jumped back to from the task list; steps after it are locked (shown,
   * named, but not yet reachable) - platform plan 6.4's Wizard pattern:
   * "resume after reload," never "skip ahead of what you haven't done." */
  completedCount: number;
  onJumpTo: (id: string) => void;
  children: ReactNode;
  banner?: ReactNode;
  /** Optional full-height picture beside a single-column wizard; it is not mounted below `lg`. */
  aside?: ReactNode;
  onBack?: () => void;
  onNext: () => void;
  /** "Skip says what it means" (plan 6.4) - the caller supplies the real
   * reason (e.g. "Skip - set this up later in Settings"), never a bare
   * "Skip" that hides what's being given up. */
  skipLabel?: string;
  onSkip?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  /** Three phase flow: phase names stay visible without step numbers, and
   * each phase control keeps the kit's 48px touch target. */
  phaseMode?: boolean;
  /** "centered" keeps the default one-column flow in a centered 40rem-wide
   * column. "split" uses two panes from the kit's `lg` breakpoint up. */
  layout?: "default" | "centered" | "split";
  /** When passed, it is the one `h1` and the step title becomes a small
   * caption above it (or is dropped when `progress` is passed). */
  heading?: ReactNode;
  description?: ReactNode;
  /** A slot shown centered above the heading; the kit ships no logo. */
  hero?: ReactNode;
  /** Pins the footer to the bottom of the viewport as a full-width bar.
   * Defaults to true for layout="split", false otherwise. */
  stickyFooter?: boolean;
  /** Replaces the step strip with a segmented progress bar. */
  progress?: { current: number; total: number; label?: string };
}

/** The kit's one wizard pattern (platform plan 6.4): "detect first, one
 * question per step, Continue, Back always works, Skip says what it
 * means, resume after reload... over seven steps, a task list" (not a
 * progress rail with a remaining-count, which the pattern reserves for
 * three-to-seven-step wizards - the setup wizard's own 9+ steps is
 * exactly the case a task list is for). Rendered as a horizontal strip
 * of numbered steps by default. `layout="centered"` constrains the flow
 * to a centered 40rem column; `layout="split"` uses two panes at wide
 * widths. Passing `aside` puts the single-column wizard flow on the left
 * and mounts the picture on the right at `lg` and wider. Without `aside`,
 * the default works identically at phone and desktop widths. A completed
 * step's number is clickable to jump back and change an earlier answer;
 * a step past the current one is named but not yet reachable. */
export function Wizard({
  steps,
  currentStepId,
  completedCount,
  onJumpTo,
  children,
  banner,
  aside,
  onBack,
  onNext,
  skipLabel,
  onSkip,
  nextLabel = "Continue",
  nextDisabled,
  busy,
  phaseMode = false,
  layout = "default",
  heading,
  description,
  hero,
  stickyFooter,
  progress,
}: WizardProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const showAside = useMediaQuery("(min-width: 64rem)", { defaultValue: false, initializeWithValue: false });
  const split = layout === "split";
  const centered = layout === "centered";
  const sticky = stickyFooter ?? split;
  const progressLabel = progress ? (progress.label ?? `Step ${progress.current} of ${progress.total}`) : undefined;
  const progressBar = progress ? (
    <Progress
      mode="determinate"
      value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
      segments={progress.total}
      label={progressLabel}
    />
  ) : null;
  // Same column the bar's contents align to: one centered column on a phone,
  // the full two-pane width from `lg` up.
  const columnClass = "mx-auto w-full max-w-[var(--wizard-column-max)] px-4 lg:max-w-none lg:px-12";
  const stepAnimation = split ? "motion-safe:animate-[wizard-step-in_200ms_ease-out]" : undefined;

  const heads = (
    <>
      {hero ? <div className={cn("flex justify-center", split && "lg:justify-start")}>{hero}</div> : null}
      {heading !== undefined ? (
        <>
          {!progress ? <p className="text-sm text-muted-foreground">{steps[currentIndex]?.title}</p> : null}
          <h1 className={cn("text-[length:var(--font-size-title)] font-semibold", !split && "mb-4")}>{heading}</h1>
        </>
      ) : (
        <h1 className="mb-4 text-2xl font-bold">{steps[currentIndex]?.title}</h1>
      )}
      {description !== undefined ? (
        <div className="text-[length:var(--font-size-body)] text-muted-foreground">{description}</div>
      ) : null}
    </>
  );

  const footer = (
    <Footer
      onBack={onBack}
      onNext={onNext}
      onSkip={onSkip}
      skipLabel={skipLabel}
      nextLabel={nextLabel}
      nextDisabled={nextDisabled}
      busy={busy}
      split={split}
      className={sticky
        ? cn(centered ? "mx-auto w-full max-w-[40rem] px-4" : columnClass, "border-0 py-3")
        : undefined}
    />
  );
  // A fixed, full-width bar with the segmented progress along its top edge.
  const bar = sticky ? (
    <div
      data-wizard-bar
      className={cn("fixed inset-x-0 bottom-0 z-10 flex flex-col justify-end border-t border-border bg-background", aside && "lg:right-1/2")}
      style={{ minHeight: "var(--wizard-bar-height)" }}
    >
      {progressBar ? <div className="w-full">{progressBar}</div> : null}
      {footer}
    </div>
  ) : (
    footer
  );

  if (split && !aside) {
    const content = (
      <>
        {!progress ? (
          <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 lg:col-span-2" aria-label={phaseMode ? "Setup phases" : "Setup steps"}>
            {stepItems()}
          </ol>
        ) : null}
        {banner ? <div className="lg:col-span-2">{banner}</div> : null}
        <div key={`head-${currentStepId}`} className={cn("flex flex-col gap-4 lg:col-start-1", stepAnimation)}>
          {heads}
        </div>
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane.tsx's own precedent). */}
        <div key={`body-${currentStepId}`} tabIndex={0} className={cn("flex min-w-0 flex-col gap-[var(--wizard-section-gap)] lg:col-start-2", FOCUS_RING, stepAnimation)}>
          {children}
        </div>
        {sticky ? bar : <div className="lg:col-span-2">{footer}</div>}
      </>
    );
    return (
      <main
        data-wizard-layout="split"
        className={cn(
          "relative mx-auto grid min-h-dvh w-full max-w-[var(--wizard-column-max)] grid-cols-1 content-start gap-[var(--wizard-section-gap)] px-4 pt-[var(--wizard-section-gap)] lg:max-w-none lg:grid-cols-2 lg:content-center lg:items-center lg:gap-x-16 lg:px-12",
          sticky && "pb-[var(--wizard-bar-height)]",
        )}
      >
        {content}
      </main>
    );
  }

  if (aside) {
    return (
      <main
        data-wizard-layout={centered ? "centered" : "aside"}
        className="grid min-h-dvh w-full grid-cols-1 lg:grid-cols-2"
      >
        <div className={cn("mx-auto flex min-h-dvh w-full flex-col gap-6 p-6", centered && "max-w-[40rem]")}>
          {progress ? (
            <div className="flex w-full flex-col gap-2">
              {progressBar}
              <span className="text-sm text-muted-foreground">{progressLabel}</span>
            </div>
          ) : (
            <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={phaseMode ? "Setup phases" : "Setup steps"}>
              {stepItems()}
            </ol>
          )}
          {banner}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane.tsx's own precedent). */}
          <div tabIndex={0} className={cn("min-h-0 flex-1 overflow-y-auto", sticky && "pb-[var(--wizard-bar-height)]", FOCUS_RING)}>
            {heads}
            {children}
          </div>
          {bar}
        </div>
        {showAside ? (
          <aside data-wizard-aside className="sticky top-0 h-dvh min-w-0 overflow-hidden bg-muted">
            <div className="h-full w-full [&_img]:h-full [&_img]:w-full [&_img]:object-cover">{aside}</div>
          </aside>
        ) : null}
      </main>
    );
  }

  return (
    <main
      data-wizard-layout={centered ? "centered" : undefined}
      className={cn("flex h-full flex-col gap-6 p-6", centered && "mx-auto w-full max-w-[40rem]")}
    >
      {progress ? (
        <div className="flex w-full flex-col gap-2">
          {progressBar}
          <span className="text-sm text-muted-foreground">{progressLabel}</span>
        </div>
      ) : (
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-2" aria-label={phaseMode ? "Setup phases" : "Setup steps"}>
          {stepItems()}
        </ol>
      )}

      {banner}

      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a keyboard-scrollable region, not a widget (DetailPane.tsx's own precedent). */}
      <div tabIndex={0} className={cn("min-h-0 flex-1 overflow-y-auto", sticky && "pb-[var(--wizard-bar-height)]", FOCUS_RING)}>
        {heads}
        {children}
      </div>

      {bar}
    </main>
  );

  function stepItems() {
    return steps.map((step, index) => {
      const isDone = index < completedCount;
      const isCurrent = step.id === currentStepId;
      const isReachable = isDone || isCurrent;
      return (
        <li key={step.id} className="flex items-center gap-1">
          {index > 0 ? <span className="h-px w-4 bg-border" aria-hidden /> : null}
          <button
            type="button"
            onClick={() => isDone && !busy && onJumpTo(step.id)}
            disabled={!isDone || busy}
            aria-current={isCurrent ? "step" : undefined}
            className={cn(
              phaseMode ? "flex min-h-12 items-center gap-2 rounded-full px-3 py-2 text-base" : "flex items-center gap-1.5 rounded-full px-2 py-1 text-base",
              isCurrent && "bg-primary/10 font-medium text-primary",
              !isCurrent && isReachable && "text-foreground",
              !isReachable && "text-muted-foreground",
              isDone && "cursor-pointer hover:bg-accent",
            )}
          >
            {phaseMode ? (isDone ? <CheckIcon className="h-4 w-4" aria-hidden /> : null) : (
              <span
                className={cn(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-sm",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  isCurrent && !isDone && "border-primary text-primary",
                  !isReachable && "border-border",
                )}
              >
                {isDone ? <CheckIcon className="h-3 w-3" aria-hidden /> : index + 1}
              </span>
            )}
            <span className={phaseMode ? undefined : "hidden sm:inline"}>{step.title}</span>
          </button>
        </li>
      );
    });
  }
}

function Footer({
  onBack,
  onNext,
  onSkip,
  skipLabel,
  nextLabel,
  nextDisabled,
  busy,
  split,
  className,
}: {
  onBack?: () => void;
  onNext: () => void;
  onSkip?: () => void;
  skipLabel?: string;
  nextLabel: string;
  nextDisabled?: boolean;
  busy?: boolean;
  split: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2 border-t border-border pt-4", className)}>
      {onBack ? (
        <Button type="button" variant={split ? "link" : "ghost"} onClick={onBack} disabled={busy}>
          Back
        </Button>
      ) : null}
      <div className="flex-1" />
      {onSkip ? (
        <Button type="button" variant="ghost" onClick={onSkip} disabled={busy}>
          {skipLabel ?? "Skip"}
        </Button>
      ) : null}
      <Button type="button" onClick={onNext} disabled={busy || nextDisabled}>
        {busy ? "Working…" : nextLabel}
      </Button>
    </div>
  );
}
