import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Joyride, type EventData, type TooltipRenderProps, type Step } from "react-joyride";
import { Button } from "@/kit/ui/button";
import { Card } from "@/kit/primitives/Card";
import { Progress } from "@/kit/primitives/Progress";
import { i18n } from "@/kit/i18n";

export interface TourStep {
  target?: string | HTMLElement | null;
  title: string;
  body: string;
  placement?: Step["placement"];
}

export interface TourProps {
  steps: TourStep[];
  onFinish?: () => void;
  onSkip?: () => void;
  onTargetMissing?: (stepIndex: number) => void;
}

function TourTooltip(props: TooltipRenderProps) {
  const titleId = useId();
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => bubbleRef.current?.focus({ preventScroll: true }), []);
  const title = String(props.step.title ?? "");
  const body = String(props.step.content ?? "");
  const count = i18n._({ id: "ui.Step {current} of {total}", message: "Step {current} of {total}", values: { current: props.index + 1, total: props.size } });

  return (
    <Card
      label={title}
      className="flex w-full flex-col gap-4 p-4"
    >
      <div ref={bubbleRef} {...props.tooltipProps} aria-labelledby={titleId} tabIndex={-1} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          <p className="text-base text-muted-foreground">{body}</p>
          <span className="text-sm text-muted-foreground">{count}</span>
          <Progress mode="determinate" value={((props.index + 1) / props.size) * 100} label={count} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" {...props.skipProps}>{i18n._({ id: "ui.Skip", message: "Skip" })}</Button>
          <div className="flex gap-2">
            {props.index > 0 ? <Button variant="outline" {...props.backProps}>{i18n._({ id: "ui.Back", message: "Back" })}</Button> : null}
            <Button {...props.primaryProps}>{props.isLastStep ? i18n._({ id: "ui.Finish", message: "Finish" }) : i18n._({ id: "ui.Next", message: "Next" })}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function useViewportSettings() {
  const [settings, setSettings] = useState({ phone: false, reducedMotion: false });
  useEffect(() => {
    const phoneQuery = window.matchMedia("(max-width: 639px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSettings({
      phone: phoneQuery.matches || window.innerWidth < 640,
      reducedMotion: motionQuery.matches,
    });
    update();
    phoneQuery.addEventListener?.("change", update);
    motionQuery.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      phoneQuery.removeEventListener?.("change", update);
      motionQuery.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return settings;
}

export function Tour({ steps, onFinish, onSkip, onTargetMissing }: TourProps) {
  const { phone, reducedMotion } = useViewportSettings();
  const hasShownStep = useRef(false);
  const previousFocus = useCallback(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement ? active : null;
  }, []);
  const focusBeforeTour = useState(previousFocus)[0];

  const joyrideSteps: Step[] = steps.map((step) => {
    const centered = !step.target;
    return {
      target: step.target ?? "body",
      title: step.title,
      content: step.body,
      placement: centered ? "center" : phone ? "bottom" : step.placement ?? "bottom",
      hideOverlay: centered,
      targetWaitTimeout: 1000,
      scrollDuration: reducedMotion ? 0 : 300,
      skipBeacon: true,
    };
  });

  const handleEvent = useCallback((event: EventData) => {
    if (event.type === "tooltip") hasShownStep.current = true;
    if (event.type === "error:target_not_found") onTargetMissing?.(event.index);
    if (event.type === "tour:end") {
      if (event.status === "skipped") onSkip?.();
      else if (event.status === "finished" && hasShownStep.current) onFinish?.();
      focusBeforeTour?.focus({ preventScroll: true });
    }
  }, [focusBeforeTour, onFinish, onSkip, onTargetMissing]);

  if (joyrideSteps.length === 0) return null;

  return (
    <Joyride
      run
      continuous
      steps={joyrideSteps}
      onEvent={handleEvent}
      tooltipComponent={TourTooltip}
      loaderComponent={null}
      options={{
        targetWaitTimeout: 1000,
        dismissKeyAction: "close",
        scrollDuration: reducedMotion ? 0 : 300,
        width: phone ? "calc(100vw - 2rem)" : 380,
      }}
      floatingOptions={{ hideArrow: true, shiftOptions: { padding: 16, crossAxis: true }, flipOptions: { padding: 16 } }}
      styles={{
        tooltip: { backgroundColor: "transparent", boxShadow: "none", padding: 0 },
        tooltipContainer: { padding: 0 },
        overlay: {
          backgroundColor: "color-mix(in srgb, var(--foreground) 55%, transparent)",
          ...(reducedMotion ? { transition: "none" } : {}),
        },
        spotlight: reducedMotion
          ? { style: { pointerEvents: "none", transition: "none" } }
          : {},
        floater: reducedMotion ? { transition: "none" } : {},
        beaconInner: reducedMotion ? { animation: "none" } : {},
        beaconOuter: reducedMotion ? { animation: "none" } : {},
      }}
    />
  );
}
