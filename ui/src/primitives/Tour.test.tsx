import { afterEach, describe, expect, mock, test } from "bun:test";
import { cleanup, render, waitFor } from "@testing-library/react";
import type { Controls, EventData, Props, TooltipRenderProps } from "react-joyride";

let joyrideProps: Props | undefined;
mock.module("react-joyride", () => ({
  Joyride: (props: Props) => {
    joyrideProps = props;
    return null;
  },
}));

const { Tour } = await import("@/kit/primitives/Tour");

function makeMediaQueryList(query: string, matches: boolean): MediaQueryList {
  return {
    matches,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

function currentJoyrideProps(): Props {
  if (!joyrideProps) throw new Error("Joyride has not rendered");
  return joyrideProps;
}

function currentTooltip(): NonNullable<Props["tooltipComponent"]> {
  const tooltip = currentJoyrideProps().tooltipComponent;
  if (!tooltip) throw new Error("Joyride tooltip has not been configured");
  return tooltip;
}

afterEach(() => {
  cleanup();
  joyrideProps = undefined;
  window.innerWidth = 1024;
  window.matchMedia = (query) => makeMediaQueryList(query, false);
});

const STEP = { target: "#tour-target", title: "Welcome", body: "Here is the first stop." };

function simulateEvent(event: Pick<EventData, "type"> & Partial<EventData>) {
  currentJoyrideProps().onEvent?.({ index: 0, size: 1, ...event } as EventData, {} as Controls);
}

function tooltipProps(overrides: Partial<TooltipRenderProps> = {}) {
  return {
    continuous: true,
    index: 0,
    isLastStep: true,
    size: 2,
    step: { ...STEP, content: STEP.body },
    backProps: { "aria-label": "Back", "data-action": "back", onClick: () => {}, role: "button", title: "Back" },
    closeProps: { "aria-label": "Close", "data-action": "close", onClick: () => {}, role: "button", title: "Close" },
    primaryProps: { "aria-label": "Next", "data-action": "primary", onClick: () => {}, role: "button", title: "Next" },
    skipProps: { "aria-label": "Skip", "data-action": "skip", onClick: () => {}, role: "button", title: "Skip" },
    controls: {} as TooltipRenderProps["controls"],
    tooltipProps: { "aria-modal": true, role: "alertdialog" },
    ...overrides,
  } as TooltipRenderProps;
}

describe("Tour", () => {
  test("moves focus into the bubble on start and returns it to the previous element on end", async () => {
    const previous = document.createElement("button");
    previous.textContent = "Open tour";
    document.body.append(previous);
    previous.focus();
    const onFinish = mock(() => {});
    render(<Tour steps={[STEP]} onFinish={onFinish} />);

    const Tooltip = currentTooltip();
    const view = render(<Tooltip {...tooltipProps()} />);
    await waitFor(() => expect(document.activeElement).toBe(view.getByRole("alertdialog")));
    simulateEvent({ type: "tour:end", status: "finished" });
    expect(document.activeElement).toBe(previous);
    previous.remove();
  });

  test("calls onFinish when the tour ends after a card was shown", () => {
    const onFinish = mock(() => {});
    render(<Tour steps={[STEP]} onFinish={onFinish} />);
    simulateEvent({ type: "tooltip" });
    simulateEvent({ type: "tour:end", status: "finished" });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  test("closes on Escape", () => {
    render(<Tour steps={[STEP]} />);
    expect(currentJoyrideProps().options?.dismissKeyAction).toBe("close");
  });

  test("labels the bubble by its title and says step N of M", () => {
    render(<Tour steps={[STEP, { ...STEP, title: "Next" }]} />);
    const Tooltip = currentTooltip();
    const view = render(<Tooltip {...tooltipProps({ index: 1, size: 2, isLastStep: false })} />);
    const dialog = view.getByRole("alertdialog", { name: "Welcome" });
    expect(dialog).toHaveTextContent("Step 2 of 2");
    expect(dialog).toHaveTextContent("Here is the first stop.");
  });

  test("reduced motion turns off Joyride and scroll animation options", () => {
    window.matchMedia = (query) => makeMediaQueryList(query, query === "(prefers-reduced-motion: reduce)");
    const view = render(<Tour steps={[STEP]} />);
    expect(currentJoyrideProps().options?.scrollDuration).toBe(0);
    expect(currentJoyrideProps().styles?.spotlight?.style).toMatchObject({ transition: "none" });
    expect(currentJoyrideProps().styles?.floater?.transition).toBe("none");
    view.unmount();
  });

  test("places every bubble at the bottom below 640 pixels", () => {
    window.innerWidth = 639;
    render(<Tour steps={[STEP, { ...STEP, target: "#second", placement: "top" }]} />);
    expect(currentJoyrideProps().steps.map((step) => step.placement)).toEqual(["bottom", "bottom"]);
    expect(currentJoyrideProps().options?.width).toBe("calc(100vw - 2rem)");
  });

  test("skips a missing target after one second and reports its step index", () => {
    const onTargetMissing = mock((_index: number) => {});
    render(<Tour steps={[STEP]} onTargetMissing={onTargetMissing} />);
    expect(currentJoyrideProps().steps[0]?.targetWaitTimeout).toBe(1000);
    simulateEvent({ type: "error:target_not_found" });
    expect(onTargetMissing).toHaveBeenCalledWith(0);
  });

  test("ends when every target is missing without calling onFinish", () => {
    const onFinish = mock(() => {});
    const onTargetMissing = mock((_index: number) => {});
    render(<Tour steps={[STEP]} onFinish={onFinish} onTargetMissing={onTargetMissing} />);
    simulateEvent({ type: "error:target_not_found" });
    simulateEvent({ type: "tour:end", status: "finished" });
    expect(onTargetMissing).toHaveBeenCalledWith(0);
    expect(onFinish).not.toHaveBeenCalled();
  });

  test("renders a step with no target centered", () => {
    render(<Tour steps={[{ title: "Pause", body: "A centered note." }]} />);
    expect(currentJoyrideProps().steps[0]?.placement).toBe("center");
    expect(currentJoyrideProps().steps[0]?.hideOverlay).toBe(true);
  });
});
