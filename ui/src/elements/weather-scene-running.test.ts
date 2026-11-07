import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { createElement, useRef } from "react";
import { useSceneRunning } from "./weather-scene-running";
import { WeatherSky } from "./weather-sky";

type Callback = (entries: { target: Element; isIntersecting: boolean }[]) => void;
const created: FakeObserver[] = [];
class FakeObserver {
  observed = new Set<Element>(); disconnected = false;
  constructor(readonly callback: Callback, readonly options?: IntersectionObserverInit) { created.push(this); }
  observe(el: Element) { this.observed.add(el); }
  unobserve(el: Element) { this.observed.delete(el); }
  disconnect() { this.disconnected = true; this.observed.clear(); }
}
const original = globalThis.IntersectionObserver;
const setHidden = (hidden: boolean) => {
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
  document.dispatchEvent(new Event("visibilitychange"));
};

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const running = useSceneRunning(ref);
  return createElement("div", { ref, "data-testid": "probe", "data-running": String(running) });
}

beforeEach(() => { created.length = 0; (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = FakeObserver; });
afterEach(() => { cleanup(); setHidden(false); (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = original; });

describe("useSceneRunning", () => {
  test("uses one shared observer with a 100px margin for every sky", () => {
    const view = render(createElement("div", null, createElement(Probe), createElement(Probe), createElement(Probe)));
    expect(created).toHaveLength(1);
    expect(created[0]!.options?.rootMargin).toBe("100px");
    expect(created[0]!.observed.size).toBe(3);
    view.unmount();
    expect(created[0]!.disconnected).toBe(true);
  });
  test("is true at first and follows the observer", () => {
    const { getByTestId } = render(createElement(Probe));
    const el = getByTestId("probe");
    expect(el.dataset.running).toBe("true");
    act(() => created[0]!.callback([{ target: el, isIntersecting: false }]));
    expect(el.dataset.running).toBe("false");
    act(() => created[0]!.callback([{ target: el, isIntersecting: true }]));
    expect(el.dataset.running).toBe("true");
  });
  test("a hidden tab stops it and a visible tab restarts it", () => {
    const { getByTestId } = render(createElement(Probe));
    const el = getByTestId("probe");
    act(() => setHidden(true));
    expect(el.dataset.running).toBe("false");
    act(() => setHidden(false));
    expect(el.dataset.running).toBe("true");
  });
  test("works without IntersectionObserver (stays running)", () => {
    (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = undefined;
    const { getByTestId } = render(createElement(Probe));
    expect(getByTestId("probe").dataset.running).toBe("true");
  });
  test("WeatherSky follows the observer unless the running prop is given", () => {
    const view = render(createElement(WeatherSky, { cls: "rain", isDay: true }));
    const sky = view.container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    act(() => created[0]!.callback([{ target: sky, isIntersecting: false }]));
    expect(sky.dataset.running).toBe("false");
    view.unmount();
    const forced = render(createElement(WeatherSky, { cls: "rain", isDay: true, running: true }));
    const forcedSky = forced.container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    act(() => setHidden(true));
    expect(forcedSky.dataset.running).toBe("true");
  });
});
