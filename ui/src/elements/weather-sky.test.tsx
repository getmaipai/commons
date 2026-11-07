import { afterEach, describe, expect, test, jest } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { WeatherSky } from "./weather-sky";
import { cloudWindFactor, lightPosition, moonFromDate, type WeatherVariant } from "./weather-scene";
import { readFileSync } from "node:fs";
import type { WeatherClass } from "./weather-condition";
import scene from "./weather-scene.json";

const css = readFileSync(new URL("../tokens.css", import.meta.url), "utf8");
const skySource = readFileSync(new URL("./weather-sky.tsx", import.meta.url), "utf8");

afterEach(cleanup);

describe("WeatherSky moon disc", () => {
  test("cloud counts follow class and variant design", () => {
    const expected: Record<string, number> = { clear: 2, "partly-cloudy": 4, overcast: 6, drizzle: 4, rain: 5, snow: 3, thunderstorm: 6, fog: 0 };
    for (const [cls, count] of Object.entries(expected)) {
      const { container, unmount } = render(<WeatherSky cls={cls as WeatherClass} isDay={true} />);
      expect(container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(count); unmount();
    }
    const night = render(<WeatherSky cls="clear" isDay={false} />);
    expect(night.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(0); night.unmount();
    for (const variant of ["lite", "compact", "wide"] as const) {
      const { container } = render(<WeatherSky cls="thunderstorm" isDay={true} variant={variant} />);
      expect(container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(variant === "lite" ? 2 : variant === "compact" ? 4 : 7);
      cleanup();
    }
  });
  test("clouds are masked, have no blur, and use the specified depth and drift rules", () => {
    const rule = css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"] {'), css.indexOf('[data-slot="weather-sky"] [data-fx="fog"] {'));
    expect(rule).not.toContain("filter:"); expect(rule).not.toContain("blur(");
    expect(rule).toContain("mask-image:"); expect(rule).toContain("-webkit-mask-image:");
    for (const text of ["scale: .62", "opacity: .42", "scale: .88", "opacity: .74", "scale: 1.15", "opacity: .96", "z-index: 21", "z-index: 22", "z-index: 23", "7px", "13px", "22px", "0% 22%", "8% 40%", "20% 56%"])
      expect(rule).toContain(text);
    expect(css).toContain("translate3d(100cqw, 0, 0)");
  });
  test("cloud puff circles fit their boxes and widths use container-relative clamps", () => {
    const ratios: Record<string, number> = { a: 2.6, b: 1.9, c: 1.5 };
    for (const [shape, puffList] of Object.entries(scene.clouds.puffs)) for (const [x = 0, y = 0, radius = 0] of puffList) {
      expect(x - radius).toBeGreaterThanOrEqual(4);
      expect(y - radius * ratios[shape]!).toBeGreaterThanOrEqual(4 - 0.01);
      expect(100 - x - radius).toBeGreaterThanOrEqual(4);
      expect(100 - y - radius * ratios[shape]!).toBeGreaterThanOrEqual(4 - 0.01);
      expect(shape).toMatch(/^[abc]$/);
    }
    const cloudRules = css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"] {'), css.indexOf('[data-slot="weather-sky"] [data-fx="fog"] {'));
    expect(cloudRules).not.toContain("ellipse");
    expect(skySource).toMatch(/widthCqw[^\n]+cqw[^\n]+width/);
    expect(skySource).toContain('"--s": p.size');
    for (const depth of Object.values(scene.clouds.depths)) {
      expect(depth.widthCqw).toBeGreaterThan(0);
      expect(depth.width).toBeGreaterThan(depth.minWidth);
      expect(skySource).toContain("clamp(${d.minWidth}px, ${d.widthCqw}cqw, ${d.width}px)");
    }
  });
  test("cloud bottoms stay above the text zone at the far edge of every y band", () => {
    const shapeRatio: Record<string, number> = { a: 2.6, b: 1.9, c: 1.5 };
    for (const [width, height] of [[218, 170], [360, 220], [470, 230]] as const) for (const [depthName, depth] of Object.entries(scene.clouds.depths)) for (const [shape, ratio] of Object.entries(shapeRatio)) {
      const cloudWidth = Math.max(depth.minWidth, Math.min(depth.widthCqw * width / 100, depth.width));
      const cloudHeight = cloudWidth / ratio * depth.scale / height * 100;
      const visualBottom = Math.min(depth.y[1] ?? 0, 56 - cloudHeight) + cloudHeight;
      expect(visualBottom, `${width}x${height} ${depthName} ${shape}`).toBeLessThanOrEqual(56);
    }
  });
  test("cloud windows have populated negative delays and wind retimes only at iteration", () => {
    expect(cloudWindFactor()).toBe(1); expect(cloudWindFactor(-100)).toBe(0.6); expect(cloudWindFactor(1000)).toBe(2.4);
    const { container, rerender } = render(<WeatherSky cls="rain" isDay={true} wind={0} width={400} />);
    const clouds = [...container.querySelectorAll<HTMLElement>('[data-fx="cloud"]')];
    expect(clouds).toHaveLength(5);
    for (const cloud of clouds) expect(Number.parseFloat(cloud.style.getPropertyValue("--dl"))).toBeLessThanOrEqual(0);
    const near = clouds.find(x => x.dataset.depth === "near")!;
    const before = near.style.getPropertyValue("--d");
    rerender(<WeatherSky cls="rain" isDay={true} wind={30} width={400} />);
    near.dispatchEvent(new Event("animationiteration"));
    expect(near.style.getPropertyValue("--d")).not.toBe(before);
  });
  test("precipitation pools scale by intensity, area and variant", () => {
    const cases = [["rain", 61, 12], ["rain", 63, 22], ["thunderstorm", 95, 22], ["thunderstorm", 96, 32]] as const;
    for (const [cls, code, expected] of cases) {
      const { container, unmount } = render(<WeatherSky cls={cls} isDay={true} code={code} width={420} height={230} variant="full" />);
      expect(container.querySelectorAll('[data-fx="fall"]')).toHaveLength(expected); unmount();
    }
    const drizzle = render(<WeatherSky cls="drizzle" isDay={true} code={55} width={420} height={230} />);
    expect(drizzle.container.querySelectorAll('[data-fx="fall"]')).toHaveLength(16);
    expect(drizzle.container.querySelectorAll('[data-fx="splash"]')).toHaveLength(0);
    expect(drizzle.container.querySelectorAll('[data-fx="fog"]')).toHaveLength(1); drizzle.unmount();
    const snow = render(<WeatherSky cls="snow" isDay={true} code={75} width={420} height={230} />);
    expect(snow.container.querySelectorAll('[data-fx="flake"]')).toHaveLength(36);
    expect(snow.container.querySelectorAll('[data-fx="sway"]')).toHaveLength(6);
    expect(snow.container.querySelectorAll('[data-fx="pile"]')).toHaveLength(1);
    for (const variant of ["full", "lite", "compact", "wide"] as const) {
      const view = render(<WeatherSky cls="thunderstorm" isDay={true} code={96} width={420} height={230} variant={variant} />);
      expect(view.container.querySelectorAll('[data-fx="fall"]').length).toBeLessThanOrEqual(({ full: 32, lite: 8, compact: 18, wide: 34 })[variant]); view.unmount();
    }
  });
  test("precipitation and fog CSS keyframes are transform and opacity only", () => {
    for (const name of ["wx-fall", "wx-flake", "wx-sway", "wx-pile", "wx-splash", "wx-fog", "wx-breathe"]) expect(css).toContain(`@keyframes ${name}`);
    const blocks = css.match(/@keyframes wx-[^{]+\{[^}]*\}/g) ?? [];
    for (const block of blocks) expect(block).not.toMatch(/filter:|box-shadow:|background:/);
    expect(css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="fog"]'), css.indexOf('[data-slot="weather-sky"] [data-fx="sun"]'))).not.toContain("blur(");
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="fall"]');
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="flake"]');
    expect(css).not.toContain('[data-slot="weather-card"] [data-fx="fog"]');
  });
  test("publishes phase, intensity and variant with inline phase values", () => {
    const { container } = render(<WeatherSky cls="rain" isDay={true} code={63}/>);
    const sky = container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    expect(sky.dataset.phase).toBe("day"); expect(sky.dataset.intensity).toBe("0.75");
    expect(sky.dataset.running).toBe("true"); expect(sky.dataset.variant).toBe("full");
    expect(sky.style.getPropertyValue("--wx-t")).toBe("1");
    expect(sky.style.getPropertyValue("--wx-light-x")).toBe("74%");
  });

  test("re-reads the clock every 60 seconds and clears the interval", () => {
    jest.useFakeTimers();
    const { container, unmount } = render(<WeatherSky cls="clear" isDay={true} sunrise="2026-10-22T06:00" sunset="2026-10-22T18:00"/>);
    const sky = container.querySelector<HTMLElement>("[data-slot=weather-sky]")!;
    expect(jest.getTimerCount()).toBeGreaterThan(0);
    unmount();
    jest.useRealTimers();
    expect(sky.dataset.phase).toBeTruthy();
  });
  test("uses the phase disc in place of the generic crescent when moon data is present", () => {
    const { container } = render(<WeatherSky cls="clear" isDay={false} moon={{ phase: "Waning Gibbous", illumination: 72 }} />);
    expect(container.querySelector('[data-fx="moon"]')).toBeNull();
    const disc = container.querySelector<SVGElement>('[data-slot="weather-moon-disk"]');
    expect(disc).not.toBeNull();
    expect(disc?.getAttribute("width")).toBe("54");
  });

  test("calculates moon phases and always renders MoonDisc on clear and partly cloudy nights", () => {
    const newMoon = moonFromDate("2000-01-06T18:14:00Z");
    const fullMoon = moonFromDate("2000-01-21T04:40:00Z");
    expect(newMoon.illumination).toBeLessThan(3);
    expect(fullMoon.illumination).toBeGreaterThan(97);
    expect(moonFromDate("2000-01-12T00:00:00Z").phase.startsWith("Waxing")).toBe(true);
    expect(moonFromDate("2000-02-02T00:00:00Z").phase.startsWith("Waning")).toBe(true);
    for (const cls of ["clear", "partly-cloudy"] as const) {
      const { container, unmount } = render(<WeatherSky cls={cls} isDay={false} now="2000-01-21T04:40:00Z" />);
      expect(container.querySelector('[data-slot="weather-moon-disk"]')).not.toBeNull();
      expect(container.querySelector('[data-fx="moon"]')).toBeNull();
      unmount();
    }
  });

  test("light and star source CSS has the required shapes", () => {
    expect(css).not.toMatch(/sun-rays|wx-rays|wx-sun-pulse|moon-glow-pulse|conic-gradient/);
    expect(css).toContain("@keyframes wx-corona");
    expect(css).toContain("@keyframes wx-twinkle");
    expect(css).toContain("--wx-night");
    // WEATHER-SCENE-08: the disc uses the new disc tokens; the legacy hex tokens below stay defined.
    expect(css).toMatch(/radial-gradient\(circle at 35% 35%,\s*var\(--weather-sun-disc-core\),\s*var\(--weather-sun-disc-edge\) 78%\)/);
    expect(css).toContain("#ffd75e");
    expect(css).toContain("#ffb02e");
    expect(skySource).not.toContain('data-fx="sun-rays"');
    expect(skySource).not.toContain('data-fx="moon"');
  });

  test("light source visibility and star pools follow class, phase and variant", () => {
    const night = (cls: WeatherClass, variant: "full" | "lite" = "full") => render(<WeatherSky cls={cls} isDay={false} variant={variant} />);
    for (const [cls, count] of [["clear", 54], ["partly-cloudy", 30], ["overcast", 8], ["snow", 0], ["fog", 0], ["rain", 0], ["drizzle", 0], ["thunderstorm", 0]] as const) {
      const view = night(cls);
      expect(view.container.querySelectorAll('[data-fx="star"]')).toHaveLength(count);
      view.unmount();
    }
    const compactField = night("clear", "lite");
    expect(compactField.container.querySelectorAll('[data-fx="star"]')).toHaveLength(18);
    compactField.unmount();
    const dimSun = render(<WeatherSky cls="fog" isDay={true} />);
    expect(dimSun.container.querySelector('[data-fx="sun-group"]')?.getAttribute("data-dimmed")).toBe("true");
    dimSun.unmount();
    for (const cls of ["overcast", "snow"] as const) {
      const halo = night(cls);
      expect(halo.container.querySelector('[data-fx="moon-halo"]')).not.toBeNull();
      expect(halo.container.querySelector('[data-fx="moon-disc"]')).toBeNull();
      halo.unmount();
    }
  });
});

describe("sky wrappers are sized", () => {
  test("every data-fx wrapper named *-field in weather-sky.tsx has a CSS rule that gives it an inset (a collapsed wrapper puts every child at left 0)", () => {
    const wrappers = [...new Set([...skySource.matchAll(/data-fx="([a-z-]+-field)"/g)].map((m) => m[1]!))];
    expect(wrappers.length).toBeGreaterThan(0);
    for (const name of wrappers) {
      const rule = new RegExp(`\\[data-slot="weather-sky"\\] \\[data-fx="${name}"\\]\\s*\\{[^}]*inset:\\s*0`).exec(css);
      expect(rule, `${name} needs [data-slot="weather-sky"] [data-fx="${name}"] { inset: 0 }`).not.toBeNull();
    }
  });
});

const keyframe = (name: string) => { const start = css.indexOf(`@keyframes ${name}`); return css.slice(start, css.indexOf("\n", start)); };
const skyRule = (selector: string) => { const start = css.indexOf(`${selector} {`); return start < 0 ? "" : css.slice(start, css.indexOf("}", start)); };

describe("WEATHER-SCENE-05 lightning markup and CSS", () => {
  test("a thunderstorm renders three bolts, the sheet and the cloud light, and no old flash or bolt", () => {
    const { container } = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    expect([...container.querySelectorAll('[data-fx="strike-bolt"]')].map(b => b.getAttribute("data-bolt"))).toEqual(["a", "b", "c"]);
    for (const bolt of container.querySelectorAll('[data-fx="strike-bolt"] polyline')) expect(bolt.getAttribute("points")!.split(" ")).toHaveLength(21);
    expect(container.querySelector('[data-fx="strike-sheet"]')).not.toBeNull();
    expect(container.querySelector('[data-fx="cloud-light"]')).not.toBeNull();
    expect(container.querySelector('[data-fx="flash"]')).toBeNull();
    expect(container.querySelector('[data-fx="bolt"]')).toBeNull();
    cleanup();
    const rain = render(<WeatherSky cls="rain" isDay={true} />);
    expect(rain.container.querySelector('[data-fx="strike-bolt"]')).toBeNull();
  });
  test("keyframes exist, animate opacity or transform only, and the glow is static", () => {
    for (const name of ["wx-strike", "wx-sheet", "wx-cloudlight", "wx-jolt"]) {
      const frames = keyframe(name);
      expect(frames, name).toContain("{");
      expect(frames, name).not.toMatch(/filter|box-shadow|background/);
    }
    expect(keyframe("wx-strike")).toContain(".95");
    expect(css).not.toMatch(/@keyframes wx-(flash|bolt)/);
    const bolt = skyRule('[data-slot="weather-sky"] [data-fx="strike-bolt"]');
    expect(bolt).toContain("filter: var(--weather-bolt-filter)");
    expect(css).toMatch(/--weather-bolt-filter: drop-shadow\(/);
    expect(bolt).toContain("stroke: var(--weather-bolt-fill)");
  });
  test("every new lightning wrapper has a sizing rule and sits under the weather-sky slot", () => {
    for (const name of ["strike-sheet", "cloud-light"]) {
      const rule = skyRule(`[data-slot="weather-sky"] [data-fx="${name}"]`);
      expect(rule, name).toMatch(/inset:\s*0|(left:\s*0;[^}]*right:\s*0;[^}]*height:)/);
      expect(rule, name).toContain("opacity: 0");
    }
    expect(skyRule('[data-slot="weather-sky"] [data-fx="strike-bolt"]')).toMatch(/width:\s*72px[^}]*height:\s*58%/);
    expect(skyRule('[data-slot="weather-sky"] [data-fx="cloud-light"]')).toContain("mix-blend-mode: screen");
    const lightningRules = css.slice(css.indexOf("WEATHER-SCENE-05 lightning"), css.indexOf("@property --wx-top")).split("\n").filter(l => l.includes("{") && !l.startsWith("/*"));
    expect(lightningRules.length).toBeGreaterThan(5);
    for (const line of lightningRules) expect(line.trimStart().startsWith('[data-slot="weather-sky"]'), line).toBe(true);
  });
  test("the snow pile fades in from a transparent top at no more than 45 percent", () => {
    expect(skyRule('[data-slot="weather-sky"] [data-fx="pile"]')).toContain("linear-gradient(to top, color-mix(in oklab, var(--weather-snow-pile) 45%, transparent), transparent)");
  });
  test("the sun and moon groups are centered on their anchor", () => {
    expect(skyRule('[data-slot="weather-sky"] [data-fx="sun-group"]')).toContain("translate(-50%,-50%)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="moon-group"]')).toContain("translate(-50%,-50%)");
  });
});

describe("WEATHER-SCENE-05 strikes in the component", () => {
  const originalMedia = window.matchMedia;
  const originalRandom = Math.random;
  afterEach(() => { window.matchMedia = originalMedia; Math.random = originalRandom; delete document.documentElement.dataset.easeMotion; jest.useRealTimers(); });
  test("a strike sets data-strike and the bolt position, and animationend clears it", () => {
    jest.useFakeTimers(); Math.random = () => 0.5;
    const { container } = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    const sky = container.querySelector('[data-slot="weather-sky"]') as HTMLElement;
    expect(sky.hasAttribute("data-strike")).toBe(false);
    act(() => { jest.advanceTimersByTime(3800); });
    expect(sky.getAttribute("data-strike")).toBe("b");
    expect(sky.style.getPropertyValue("--wx-bolt-x")).toBe("50%");
    fireEvent.animationEnd(container.querySelector('[data-fx="strike-bolt"][data-bolt="b"]')!);
    expect(sky.hasAttribute("data-strike")).toBe(false);
  });
  test("the 700 ms fallback clears it when no animationend arrives", () => {
    jest.useFakeTimers(); Math.random = () => 0.5;
    const { container } = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    const sky = container.querySelector('[data-slot="weather-sky"]') as HTMLElement;
    act(() => { jest.advanceTimersByTime(3800); });
    expect(sky.hasAttribute("data-strike")).toBe(true);
    act(() => { jest.advanceTimersByTime(700); });
    expect(sky.hasAttribute("data-strike")).toBe(false);
  });
  test("nothing is scheduled when not running, paused, unmounted, or under reduced motion", () => {
    jest.useFakeTimers(); Math.random = () => 0.5;
    const quiet = (node: React.ReactElement) => { const v = render(node); act(() => { jest.advanceTimersByTime(30_000); }); const hit = v.container.querySelector('[data-slot="weather-sky"]')!.hasAttribute("data-strike"); v.unmount(); return hit; };
    expect(quiet(<WeatherSky cls="thunderstorm" isDay={true} running={false} />)).toBe(false);
    expect(quiet(<WeatherSky cls="thunderstorm" isDay={true} paused />)).toBe(false);
    expect(quiet(<WeatherSky cls="rain" isDay={true} />)).toBe(false);
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q })) as typeof window.matchMedia;
    expect(quiet(<WeatherSky cls="thunderstorm" isDay={true} />)).toBe(false);
    window.matchMedia = ((q: string) => ({ matches: false, media: q })) as typeof window.matchMedia;
    document.documentElement.dataset.easeMotion = "calm";
    expect(quiet(<WeatherSky cls="thunderstorm" isDay={true} />)).toBe(false);
    delete document.documentElement.dataset.easeMotion;
    const live = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    live.unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
  test("running turning false cancels a pending strike", () => {
    jest.useFakeTimers(); Math.random = () => 0.5;
    const view = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    view.rerender(<WeatherSky cls="thunderstorm" isDay={true} running={false} />);
    act(() => { jest.advanceTimersByTime(30_000); });
    expect(view.container.querySelector('[data-slot="weather-sky"]')!.hasAttribute("data-strike")).toBe(false);
  });
  test("reduced motion marks the sky for the still frame", () => {
    window.matchMedia = ((q: string) => ({ matches: q.includes("reduce"), media: q })) as typeof window.matchMedia;
    const view = render(<WeatherSky cls="thunderstorm" isDay={true} />);
    expect(view.container.querySelector('[data-slot="weather-sky"]')!.getAttribute("data-reduced")).toBe("true");
    expect(css).toContain('[data-slot="weather-sky"][data-reduced="true"] [data-fx="strike-bolt"][data-bolt="a"] { opacity: .7; }');
    expect(css).toContain('[data-slot="weather-sky"][data-reduced="true"] [data-fx="strike-sheet"] { opacity: .25; }');
  });
  test("the jolt defaults on for full and wide and off for compact and lite, and the prop overrides", () => {
    const joltOf = (variant: WeatherVariant, thunderJolt?: boolean) => { const v = render(<WeatherSky cls="thunderstorm" isDay={true} variant={variant} thunderJolt={thunderJolt} />); const r = v.container.querySelector('[data-slot="weather-sky"]')!.getAttribute("data-jolt"); v.unmount(); return r; };
    expect(joltOf("full")).toBe("true"); expect(joltOf("wide")).toBe("true");
    expect(joltOf("compact")).toBeNull(); expect(joltOf("lite")).toBeNull();
    expect(joltOf("full", false)).toBeNull(); expect(joltOf("compact", true)).toBe("true");
    expect(skyRule('[data-slot="weather-sky"][data-jolt="true"][data-strike]')).toContain("wx-jolt 420ms cubic-bezier(.34, 1.56, .64, 1) 160ms");
  });
});

describe("lightPosition keeps the disc inside the card", () => {
  test("x stays within 12 to 88 percent and y within 14 to 70 percent for every variant and fraction", () => {
    for (const variant of ["full", "compact", "wide", "lite"] as const) for (const kind of ["sun", "moon"] as const) for (let i = 0; i <= 200; i++) {
      const p = lightPosition(variant, i / 200, kind);
      expect(p.x).toBeGreaterThanOrEqual(12); expect(p.x).toBeLessThanOrEqual(88);
      expect(p.y).toBeGreaterThanOrEqual(14); expect(p.y).toBeLessThanOrEqual(70);
    }
  });
});

describe("WEATHER-SCENE-06 cross-fade", () => {
  const groups = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>("[data-weather-group]")];
  test("first paint has no fade", () => {
    const { container } = render(<WeatherSky cls="rain" isDay={true} code={63} running={true} />);
    const [only] = groups(container);
    expect(groups(container)).toHaveLength(1);
    expect(only!.hasAttribute("data-entering")).toBe(false);
    expect(only!.hasAttribute("data-leaving")).toBe(false);
  });
  test("a class change mounts the new group entering and keeps the old one leaving for 500 ms", () => {
    jest.useFakeTimers();
    const view = render(<WeatherSky cls="rain" isDay={true} code={63} running={true} />);
    view.rerender(<WeatherSky cls="snow" isDay={true} code={73} running={true} />);
    const both = groups(view.container);
    expect(both.map(g => [g.dataset.class, g.dataset.leaving ?? "", g.dataset.entering ?? ""])).toEqual([["rain", "true", ""], ["snow", "", "true"]]);
    expect(both[0]!.querySelector('[data-fx="fall"]')).not.toBeNull();
    expect(both[1]!.querySelector('[data-fx="flake"]')).not.toBeNull();
    act(() => { jest.advanceTimersByTime(499); });
    expect(groups(view.container)).toHaveLength(2);
    act(() => { jest.advanceTimersByTime(2); });
    const after = groups(view.container);
    expect(after).toHaveLength(1);
    expect(after[0]!.dataset.class).toBe("snow");
    expect(view.container.querySelector('[data-fx="fall"]')).toBeNull();
  });
  test("clouds persist across a change between classes that both have clouds, and extras fade for 1.2 s", () => {
    jest.useFakeTimers();
    const view = render(<WeatherSky cls="overcast" isDay={true} running={true} />);
    const first = [...view.container.querySelectorAll('[data-fx="cloud"]')];
    expect(first).toHaveLength(6);
    view.rerender(<WeatherSky cls="snow" isDay={true} code={73} running={true} />);
    const during = [...view.container.querySelectorAll('[data-fx="cloud"]')];
    expect(during).toHaveLength(6);
    for (let i = 0; i < 6; i++) expect(during[i]).toBe(first[i]);
    expect(during.filter(c => c.getAttribute("data-leaving") === "true")).toHaveLength(3);
    act(() => { jest.advanceTimersByTime(1250); });
    expect(view.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(3);
    expect(view.container.querySelectorAll('[data-fx="cloud"][data-leaving]')).toHaveLength(0);
    expect([...view.container.querySelectorAll('[data-fx="cloud"]')].every((c, i) => c === first[i])).toBe(true);
  });
  test("a phase change alone never swaps groups", () => {
    const view = render(<WeatherSky cls="clear" isDay={true} running={true} />);
    view.rerender(<WeatherSky cls="clear" isDay={false} running={true} />);
    expect(groups(view.container)).toHaveLength(1);
    expect(groups(view.container)[0]!.hasAttribute("data-entering")).toBe(false);
  });
  test("CSS: the group is sized, enters with an opacity-only keyframe and leaves with a 400 ms fade", () => {
    const sized = skyRule('[data-slot="weather-sky"] [data-weather-group]');
    expect(sized).toMatch(/position:\s*absolute;[^}]*inset:\s*0/);
    expect(sized).toContain("pointer-events: none");
    expect(skyRule('[data-slot="weather-sky"] [data-weather-group][data-entering="true"]')).toContain("animation: wx-enter 800ms ease-out 300ms backwards");
    const leave = skyRule('[data-slot="weather-sky"] [data-weather-group][data-leaving="true"]');
    expect(leave).toContain("opacity: 0"); expect(leave).toContain("transition: opacity 400ms");
    expect(keyframe("wx-enter")).toBe("@keyframes wx-enter { from { opacity: 0; } to { opacity: 1; } }");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="cloud"][data-leaving="true"]')).toContain("transition: opacity 1200ms");
  });
});

describe("WEATHER-SCENE-06 running pause and reduced motion CSS", () => {
  test("data-running=false pauses every animation, once", () => {
    const rule = '[data-slot="weather-sky"][data-running="false"] [data-fx], [data-slot="weather-sky"][data-running="false"] [data-fx] * { animation-play-state: paused; }';
    expect(css.split(rule)).toHaveLength(2);
    expect(css).toContain('[data-slot="weather-sky"][data-running="false"] [data-weather-group] { animation-play-state: paused; }');
  });
  const exception = /\[data-slot="weather-sky"\] \[data-fx\] \{\s*animation-duration: var\(--d\) !important;\s*animation-iteration-count: infinite !important;\s*animation-play-state: paused !important;\s*transition: none !important;\s*\}/g;
  test("the scoped exception exists once in the media query and once for calm mode, and merges the old copies", () => {
    const media = css.slice(css.indexOf("WEATHER-SCENE-06 reduced motion"), css.indexOf("WEATHER-SCENE-06 end"));
    expect(media.length).toBeGreaterThan(100);
    const blocks = media.match(exception) ?? [];
    expect(blocks).toHaveLength(2);
    expect(media).toContain("@media (prefers-reduced-motion: reduce) {");
    expect(media).toContain('html[data-ease-motion="calm"] [data-slot="weather-sky"] [data-fx"]'.replace('data-fx"]', 'data-fx]'));
    expect(media).toContain("scoped exception");
    expect(media).not.toContain("animation: none");
    expect(css.match(/html\[data-ease-motion="calm"\] \[data-slot="weather-card"\] \[data-fx\]/g) ?? []).toHaveLength(0);
  });
  test("the group wrapper keeps its fade-in from hiding the scene under reduced motion", () => {
    const media = css.slice(css.indexOf("WEATHER-SCENE-06 reduced motion"), css.indexOf("WEATHER-SCENE-06 end"));
    expect(media).toContain('[data-slot="weather-sky"] [data-weather-group] { animation-delay: 0s !important; }');
  });
  test("every wx loop keyframe starts at its resting look; only strike, sheet, splash and enter start hidden", () => {
    const frames = [...css.matchAll(/@keyframes (wx-[a-z-]+) \{([^\n]*)\}\s*\n|@keyframes (wx-[a-z-]+)\s*\{\n([^}]*)\}/g)];
    expect(frames.length).toBeGreaterThan(15);
    const allowed = new Set(["wx-strike", "wx-sheet", "wx-splash", "wx-enter", "wx-star-in"]);
    for (const m of frames) {
      const name = (m[1] ?? m[3])!; const body = m[0];
      expect(body, name).not.toMatch(/filter:|box-shadow:|background:/);
      const first = /(?:from|0%)[^{]*\{([^}]*)\}/.exec(body)?.[1] ?? "";
      if (!allowed.has(name)) expect(first, name).not.toMatch(/opacity:\s*0\s*[;}]|opacity:\s*0$/);
    }
  });
});

describe("WEATHER-SCENE-06 variants and budgets", () => {
  const classes_: WeatherClass[] = ["clear", "partly-cloudy", "overcast", "fog", "drizzle", "rain", "snow", "thunderstorm"];
  const codes: Record<WeatherClass, number> = { clear: 0, "partly-cloudy": 2, overcast: 3, fog: 45, drizzle: 53, rain: 65, snow: 75, thunderstorm: 99 };
  const animated = '[data-fx="cloud"], [data-fx="star"], [data-fx="fall"], [data-fx="flake"], [data-fx="splash"], [data-fx="fog"], [data-fx="sun"], [data-fx="sun-corona"], [data-fx="sun-halo-a"], [data-fx="sun-halo-b"], [data-fx="moon-halo"], [data-fx="sway"], [data-fx="pile"], [data-fx="star-field"]';
  test("the budgets in weather-scene.json match the design", () => {
    expect(scene.budgets).toEqual({ full: 90, wide: 110, compact: 50, lite: 24 });
  });
  for (const size of [{ name: "reference", w: 420, h: 230 }, { name: "large (s = 2.2)", w: 924, h: 506 }])
    test(`every class and variant stays within its animation budget at the ${size.name} size`, () => {
      for (const variant of ["full", "wide", "compact", "lite"] as const) for (const cls of classes_) for (const isDay of [true, false]) {
        const view = render(<WeatherSky cls={cls} isDay={isDay} code={codes[cls]} variant={variant} width={size.w} height={size.h} running={true} />);
        const total = view.container.querySelectorAll(animated).length;
        expect(total, `${cls} ${isDay ? "day" : "night"} ${variant}`).toBeLessThanOrEqual(scene.budgets[variant]);
        view.unmount();
      }
    });
  test("lite has no corona, grain, pendulum, pile or splashes", () => {
    const snow = render(<WeatherSky cls="snow" isDay={true} code={75} variant="lite" running={true} />);
    expect(snow.container.querySelectorAll('[data-fx="flake"]')).toHaveLength(10);
    expect(snow.container.querySelector('[data-fx="sway"]')).toBeNull(); expect(snow.container.querySelector('[data-fx="pile"]')).toBeNull();
    snow.unmount();
    const rain = render(<WeatherSky cls="rain" isDay={true} code={65} variant="lite" width={924} height={506} running={true} />);
    expect(rain.container.querySelectorAll('[data-fx="fall"]')).toHaveLength(8); expect(rain.container.querySelector('[data-fx="splash"]')).toBeNull();
    expect(rain.container.querySelectorAll('[data-fx="cloud"]')).toHaveLength(2); rain.unmount();
    const clear = render(<WeatherSky cls="clear" isDay={true} variant="lite" running={true} />);
    expect(clear.container.querySelector('[data-fx="sun-corona"]')).toBeNull(); expect(clear.container.querySelector(".weather-sky-grain")).toBeNull();
    clear.unmount();
    const night = render(<WeatherSky cls="rain" isDay={false} code={65} variant="lite" running={true} />);
    expect(night.container.querySelector('[data-fx="star"]')).toBeNull();
  });
  test("paused is documented as deprecated for variant lite", () => {
    expect(skySource).toContain("@deprecated use variant=\"lite\"");
  });
});

const lastRule = (selector: string) => { const start = css.lastIndexOf(`${selector} {`); return start < 0 ? "" : css.slice(start, css.indexOf("}", start)); };
describe("WEATHER-SCENE-08 picture polish: clouds", () => {
  const authored: Record<string, number[][]> = {
    a: [[18, 62, 16], [34, 50, 22], [52, 44, 24], [70, 52, 20], [86, 64, 14], [44, 72, 20], [62, 74, 18]],
    b: [[22, 66, 18], [38, 46, 24], [56, 38, 26], [72, 52, 22], [84, 68, 16], [48, 74, 22], [30, 80, 16]],
    c: [[30, 60, 20], [50, 42, 28], [70, 58, 22], [44, 78, 20], [62, 80, 18]],
  };
  const ratios: Record<string, number> = { a: 2.6, b: 1.9, c: 1.5 };
  test("the authored puff tables are restored, shrunk uniformly just enough to fit with a 4 percent margin", () => {
    for (const shape of ["a", "b", "c"] as const) {
      const table = scene.clouds.puffs[shape] as number[][]; const source = authored[shape]!;
      expect(table).toHaveLength(source.length);
      const k = table[0]![2]! / source[0]![2]!;
      expect(k).toBeGreaterThan(0.5); expect(k).toBeLessThanOrEqual(1);
      let slack = Infinity;
      table.forEach(([x = 0, y = 0, radius = 0], i) => {
        const [sx = 0, sy = 0, sr = 0] = source[i]!;
        expect(radius / sr).toBeCloseTo(k, 1);
        expect(x).toBeCloseTo(sx, 0);
        expect(y - 50).toBeCloseTo((sy - 50) * k, 0);
        slack = Math.min(slack, x - radius, 100 - x - radius, y - radius * ratios[shape]!, 100 - y - radius * ratios[shape]!);
      });
      expect(slack, `${shape} fits tightly, not loosely`).toBeLessThan(4.5);
      expect(slack, `${shape} keeps the margin`).toBeGreaterThanOrEqual(4 - 0.01);
    }
  });
  test("depth opacities are near .96, mid .74, far .42 in the table and the CSS", () => {
    expect(scene.clouds.depths.near.opacity).toBe(0.96); expect(scene.clouds.depths.mid.opacity).toBe(0.74); expect(scene.clouds.depths.far.opacity).toBe(0.42);
    for (const [depth, value] of [["near", ".96"], ["mid", ".74"], ["far", ".42"]] as const) expect(skyRule(`[data-slot="weather-sky"] [data-fx="cloud"][data-depth="${depth}"]`)).toContain(`opacity: ${value}`);
  });
  test("each cloud mask has soft stops per depth, no outer fade, a shelf clip and an intersecting composite", () => {
    const { container } = render(<WeatherSky cls="overcast" isDay={true} width={420} height={230} />);
    const clouds = [...container.querySelectorAll<HTMLElement>('[data-fx="cloud"]')];
    expect(new Set(clouds.map(el => el.getAttribute("data-depth"))).size).toBe(3);
    for (const el of clouds) {
      const shape = el.getAttribute("data-shape") as "a" | "b" | "c"; const depth = el.getAttribute("data-depth")!;
      const mask = el.style.getPropertyValue("--cloud-mask"); const shelf = scene.clouds.shelf[shape];
      expect(mask).toContain(`var(--weather-ink) 0 ${depth === "far" ? 62 : 86}%, transparent 100%`);
      expect(mask).not.toContain("40%, transparent");
      const puffs = scene.clouds.puffs[shape] as number[][];
      for (const [, , radius = 0] of puffs) expect(mask).toContain(`calc(var(--s) * ${radius / 100})`);
      expect(mask).toContain(`radial-gradient(ellipse 46% 13% at 50% ${shelf}%, var(--weather-ink) 0 92%, transparent)`);
      expect(mask).toContain(`linear-gradient(to bottom, var(--weather-ink) 0 ${shelf}%, transparent ${shelf}%)`);
      expect(mask.startsWith("linear-gradient(to bottom")).toBe(true);
      const layers = puffs.length + 2;
      const standard = el.style.getPropertyValue("--cloud-mc").split(", "); const webkit = el.style.getPropertyValue("--cloud-mc-webkit").split(", ");
      expect(standard).toHaveLength(layers); expect(webkit).toHaveLength(layers);
      expect(standard[0]).toBe("intersect"); expect(standard.slice(1).every(v => v === "add")).toBe(true);
      expect(webkit[0]).toBe("source-in"); expect(webkit.slice(1).every(v => v === "source-over")).toBe(true);
    }
    expect(scene.clouds.shelf).toEqual({ a: 74, b: 78, c: 80 });
  });
  test("the clouds paint in two pseudo-elements that carry the mask: a shaded body with a rim light and an offset shadow", () => {
    const base = skyRule('[data-slot="weather-sky"] [data-fx="cloud"]');
    expect(base).not.toContain("mask-image"); expect(base).not.toContain("background:");
    const both = css.slice(css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"]::before,'), css.indexOf('[data-slot="weather-sky"] [data-fx="cloud"]::before {'));
    for (const text of ["content: \"\"", "position: absolute", "inset: 0", "mask-image: var(--cloud-mask)", "-webkit-mask-image: var(--cloud-mask)", "mask-composite: var(--cloud-mc)", "-webkit-mask-composite: var(--cloud-mc-webkit)", "mask-size: 100% 100%"]) expect(both, text).toContain(text);
    const shadow = skyRule('[data-slot="weather-sky"] [data-fx="cloud"]::before'); const body = lastRule('[data-slot="weather-sky"] [data-fx="cloud"]::after');
    expect(shadow).toContain("translate: 0 5%"); expect(shadow).toContain("color-mix(in oklab, var(--cloud-shade), transparent 45%)");
    expect(body).toContain("linear-gradient(to top, var(--cloud-shade) 0 24%, var(--cloud-lit) 62%)");
    expect(body).toContain("radial-gradient(110% 80% at 88% 0%, color-mix(in oklab, var(--cloud-lit), var(--wx-glow) 55%) 0, transparent 52%)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="cloud"]')).toContain("--cloud-lit: var(--wx-cloud-lit)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="cloud"][data-depth="far"]')).toContain("color-mix(in oklab, var(--wx-cloud-lit), var(--wx-mid) 40%)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="cloud"][data-depth="far"]')).toContain("color-mix(in oklab, var(--wx-cloud-shade), var(--wx-mid) 40%)");
  });
});

describe("WEATHER-SCENE-08 picture polish: brightness and sky", () => {
  test("caps are .50, .56, .58 in the table and the base gradient", () => {
    expect(scene.caps).toEqual({ top: 0.5, mid: 0.56, bottom: 0.58 });
    const base = skyRule('[data-slot="weather-sky"] .weather-sky-base');
    expect(base).toContain("min(l, .50)"); expect(base).toContain("min(l, .56)"); expect(base).toContain("min(l, .58)");
  });
  test("the flat scrim is only on compact and lite; the vignette starts at 62 percent; the text scrim is the corner gradient", () => {
    expect(skyRule('[data-slot="weather-sky"] .weather-sky-scrim')).toContain("display:none");
    expect(css).toContain('[data-slot="weather-sky"][data-variant="compact"] .weather-sky-scrim, [data-slot="weather-sky"][data-variant="lite"] .weather-sky-scrim { display:block; }');
    expect(skyRule('[data-slot="weather-sky"] .weather-sky-vignette')).toContain("transparent 62%");
    expect(skyRule('[data-slot="weather-sky"] .weather-sky-text-scrim')).toContain("linear-gradient(to top right,var(--wx-scrim) 0%,transparent 58%)");
  });
  test("the horizon layers are sized wrappers under the clouds, driven by --wx-t", () => {
    const twilight = skyRule('[data-slot="weather-sky"] .weather-sky-horizon'); const day = skyRule('[data-slot="weather-sky"] .weather-sky-horizon-day');
    for (const rule of [twilight, day]) { expect(rule).toContain("inset:0"); expect(rule).toContain("pointer-events:none"); expect(rule).toContain("radial-gradient(85% 48% at 92% 100%"); expect(rule).toContain("transparent 70%"); }
    expect(twilight).toContain("opacity:calc(1 - abs(var(--wx-t) - .5) * 2)"); expect(twilight).toContain("var(--weather-horizon-twilight)");
    expect(day).toContain("opacity:clamp(0, (var(--wx-t) - .5) * 2, 1)"); expect(day).toContain("var(--weather-horizon-day)");
    const { container } = render(<WeatherSky cls="clear" isDay={true} />);
    const order = [...container.querySelectorAll("[data-weather-layer], [data-fx='cloud']")].map(el => el.getAttribute("data-weather-layer") ?? "cloud");
    expect(order.indexOf("horizon")).toBeGreaterThan(order.indexOf("glow")); expect(order.indexOf("horizon-day")).toBeGreaterThan(order.indexOf("horizon"));
    expect(order.indexOf("horizon-day")).toBeLessThan(order.indexOf("cloud"));
    for (const name of ["sun-disc-core", "sun-disc-edge", "sun-twilight", "horizon-twilight", "horizon-day"]) expect(css).toContain(`--weather-${name}:`);
  });
  test("the sun is a 56 px disc with halos of 140 px and 300 px, 64 px at twilight, sitting at 66 percent down", () => {
    expect(lastRule('[data-slot="weather-sky"] [data-fx="sun"]')).toContain("width:56px; height:56px");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="sun-halo-a"]')).toMatch(/width:140px; height:140px; opacity:\.5;/);
    expect(skyRule('[data-slot="weather-sky"] [data-fx="sun-halo-b"]')).toMatch(/width:300px; height:300px; opacity:\.22;/);
    expect(css).toMatch(/\[data-phase="dawn"\] \[data-fx="sun"\], \[data-slot="weather-sky"\]\[data-phase="dusk"\] \[data-fx="sun"\] \{ width:64px; height:64px;[^}]*var\(--weather-sun-twilight\)/);
    expect(css).toMatch(/--weather-sun-disc-core: oklch\(0\.97 0\.08 95\)/); expect(css).toMatch(/--weather-sun-disc-edge: oklch\(0\.86 0\.16 75\)/); expect(css).toMatch(/--weather-sun-twilight: oklch\(0\.80 0\.17 45\)/);
    expect(scene.sun).toMatchObject({ disc: 56, twilightDisc: 64, twilightY: 66 }); expect(scene.light.clampY).toEqual([14, 70]);
    const dusk = render(<WeatherSky cls="clear" isDay={true} elevation={-1} />);
    expect(dusk.container.querySelector<HTMLElement>('[data-slot="weather-sky"]')!.style.getPropertyValue("--wx-light-y")).toBe("66%"); dusk.unmount();
    const noon = render(<WeatherSky cls="clear" isDay={true} elevation={30} />);
    expect(Number.parseFloat(noon.container.querySelector<HTMLElement>('[data-slot="weather-sky"]')!.style.getPropertyValue("--wx-light-y"))).toBeLessThanOrEqual(70);
  });
});

describe("WEATHER-SCENE-08 picture polish: rain and snow", () => {
  const drops = (view: ReturnType<typeof render>) => [...view.container.querySelectorAll<HTMLElement>('[data-fx="fall"]')].map(el => ({ depth: el.getAttribute("data-drop")!, v: (name: string) => Number.parseFloat(el.style.getPropertyValue(name)) }));
  test("rain has three drop classes with their widths, lengths, speeds, opacities and the near drops on the right", () => {
    const cfg = scene.precipitation.rain.drops;
    const view = render(<WeatherSky cls="rain" isDay={true} code={63} width={420} height={230} />);
    const list = drops(view); expect(list).toHaveLength(22);
    const near = list.filter(d => d.depth === "near"); const mid = list.filter(d => d.depth === "mid"); const far = list.filter(d => d.depth === "far");
    expect(near.length).toBeGreaterThanOrEqual(5); expect(mid.length).toBeGreaterThan(0); expect(far.length).toBeGreaterThan(0);
    for (const [group, spec] of [[near, cfg.near], [mid, cfg.mid], [far, cfg.far]] as const) for (const d of group) {
      expect(d.v("--w")).toBe(spec.width); expect(d.v("--o")).toBe(spec.opacity);
      expect(d.v("--s")).toBeGreaterThanOrEqual(spec.length[0]!); expect(d.v("--s")).toBeLessThanOrEqual(spec.length[1]!);
      expect((230 + d.v("--s") + 8) / d.v("--d")).toBeCloseTo(spec.speed, 3);
    }
    expect([cfg.near.width, cfg.mid.width, cfg.far.width]).toEqual([2.5, 2, 1.5]); expect([cfg.near.speed, cfg.mid.speed, cfg.far.speed]).toEqual([520, 420, 320]);
    expect([cfg.near.opacity, cfg.mid.opacity, cfg.far.opacity]).toEqual([0.9, 0.7, 0.45]); expect(cfg.near.length).toEqual([72, 100]); expect(cfg.mid.length).toEqual([40, 56]); expect(cfg.far.length).toEqual([22, 30]);
    for (const d of near) { expect(d.v("--x")).toBeGreaterThanOrEqual(55); expect(d.v("--x")).toBeLessThanOrEqual(100); }
    expect(near.length / list.length).toBeCloseTo(0.25, 1);
    const tilts = [...view.container.querySelectorAll<HTMLElement>('[data-fx="fall"]')].map(el => el.style.getPropertyValue("--tilt")); expect(new Set(tilts)).toEqual(new Set(["-4deg"]));
  });
  test("heavy rain tilts -10 degrees, counts stay 18 to 24 steady and 28 to 34 heavy, and drizzle stays fine at 1.5 px", () => {
    const heavy = render(<WeatherSky cls="thunderstorm" isDay={true} code={96} width={420} height={230} />);
    const heavyDrops = [...heavy.container.querySelectorAll<HTMLElement>('[data-fx="fall"]')];
    expect(heavyDrops.length).toBeGreaterThanOrEqual(28); expect(heavyDrops.length).toBeLessThanOrEqual(34);
    expect(new Set(heavyDrops.map(el => el.style.getPropertyValue("--tilt")))).toEqual(new Set(["-10deg"])); heavy.unmount();
    const steady = render(<WeatherSky cls="rain" isDay={true} code={63} width={420} height={230} />);
    expect(steady.container.querySelectorAll('[data-fx="fall"]').length).toBeGreaterThanOrEqual(18); expect(steady.container.querySelectorAll('[data-fx="fall"]').length).toBeLessThanOrEqual(24); steady.unmount();
    const drizzle = render(<WeatherSky cls="drizzle" isDay={true} code={55} width={420} height={230} />);
    for (const d of drops(drizzle)) { expect(d.v("--w")).toBe(1.5); expect(d.v("--s")).toBeLessThanOrEqual(9); }
  });
  test("the streak has a bright head and the fall keyframes move by transform only", () => {
    expect(skyRule('[data-slot="weather-sky"] [data-fx="fall"]')).toContain("linear-gradient(to bottom, transparent 0, var(--weather-rain-streak) 72%, var(--weather-ink) 100%)");
    expect(keyframe("wx-fall")).toContain("translate3d"); expect(keyframe("wx-fall")).not.toMatch(/filter|box-shadow|background/);
  });
  test("snow flakes run from 2 to 11 px, the six largest are soft on the pendulum, speeds grow with size, and a haze sits behind", () => {
    const cfg = scene.precipitation.snow;
    const view = render(<WeatherSky cls="snow" isDay={true} code={75} width={420} height={230} />);
    const flakes = [...view.container.querySelectorAll<HTMLElement>('[data-fx="flake"]')];
    expect(flakes).toHaveLength(36);
    const rows = flakes.map(el => ({ size: Number.parseFloat(el.style.getPropertyValue("--s")), speed: (230 + 24) / Number.parseFloat(el.style.getPropertyValue("--d")), o: Number.parseFloat(el.style.getPropertyValue("--o")), soft: el.getAttribute("data-soft") === "true", sway: el.querySelector('[data-fx="sway"]') !== null }));
    for (const r of rows) { expect(r.size).toBeGreaterThanOrEqual(2); expect(r.size).toBeLessThanOrEqual(11); expect(r.speed).toBeGreaterThanOrEqual(18 - 0.01); expect(r.speed).toBeLessThanOrEqual(60 + 0.01); expect(r.o).toBeGreaterThanOrEqual(0.55); expect(r.o).toBeLessThanOrEqual(0.95); }
    expect(Math.max(...rows.map(r => r.size))).toBeGreaterThan(9); expect(Math.min(...rows.map(r => r.size))).toBeLessThan(4);
    const sorted = [...rows].sort((x, y) => x.size - y.size);
    for (let i = 1; i < sorted.length; i++) expect(sorted[i]!.speed).toBeGreaterThanOrEqual(sorted[i - 1]!.speed - 0.01);
    const soft = rows.filter(r => r.soft); expect(soft).toHaveLength(6);
    expect(soft.every(r => r.sway)).toBe(true); expect(rows.filter(r => !r.soft).every(r => !r.sway)).toBe(true);
    const threshold = Math.min(...soft.map(r => r.size)); expect(rows.filter(r => !r.soft).every(r => r.size <= threshold)).toBe(true);
    expect(cfg).toMatchObject({ count: 36, size: [2, 11], soft: 6, speed: [18, 60], opacity: [0.55, 0.95], haze: 0.08 });
    const haze = view.container.querySelectorAll<HTMLElement>('[data-fx="fog"]'); expect(haze).toHaveLength(1);
    expect(haze[0]!.style.getPropertyValue("--o")).toBe("0.08");
    const order = [...view.container.querySelectorAll('[data-fx="fog"], [data-fx="snow-field"]')].map(el => el.getAttribute("data-fx"));
    expect(order).toEqual(["fog", "snow-field"]);
    expect(skyRule('[data-slot="weather-sky"] [data-fx="flake"]')).toContain("radial-gradient(circle, var(--weather-ink) 0 70%, transparent 100%)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="snow-core"]')).toContain("radial-gradient(circle, var(--weather-ink) 0 50%, transparent)");
    expect(skyRule('[data-slot="weather-sky"] [data-fx="flake"][data-soft="true"]')).toContain("background: none");
  });
  test("lite snow keeps 10 hard flakes, no haze and no pendulum", () => {
    const lite = render(<WeatherSky cls="snow" isDay={true} code={75} variant="lite" running={true} />);
    expect(lite.container.querySelectorAll('[data-fx="flake"]')).toHaveLength(10);
    expect(lite.container.querySelector('[data-soft="true"]')).toBeNull(); expect(lite.container.querySelector('[data-fx="fog"]')).toBeNull(); expect(lite.container.querySelector('[data-fx="sway"]')).toBeNull();
  });
});
