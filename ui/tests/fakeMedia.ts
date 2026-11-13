// A fake HTMLMediaElement for tests under happy-dom: `load()` fires `loadedmetadata`, setting `currentTime` fires `seeked`, `play()` and `pause()`
// flip `paused`, and a test moves the clock by hand with `advance(el, seconds)`. Also a recording fake AudioContext. Both are installed on the
// prototype and removed again by the returned function.
export interface FakeGainCall { type: "set" | "ramp" | "cancel" | "target"; value?: number; at: number }
export class FakeParam {
  value = 1;
  calls: FakeGainCall[] = [];
  setValueAtTime(value: number, at: number) { this.value = value; this.calls.push({ type: "set", value, at }); return this; }
  linearRampToValueAtTime(value: number, at: number) { this.calls.push({ type: "ramp", value, at }); return this; }
  cancelScheduledValues(at: number) { this.calls.push({ type: "cancel", at }); return this; }
  setTargetAtTime(value: number, at: number) { this.value = value; this.calls.push({ type: "target", value, at }); return this; }
}
export class FakeGain { gain = new FakeParam(); connected: unknown[] = []; connect(n: unknown) { this.connected.push(n); return n; } disconnect() { this.connected = []; } }
export class FakeNode { connected: unknown[] = []; connect(n: unknown) { this.connected.push(n); return n; } disconnect() { this.connected = []; } }
export class FakeFilter extends FakeNode { type = ""; frequency = new FakeParam(); Q = new FakeParam(); gain = new FakeParam(); }
export class FakeCompressor extends FakeNode { threshold = new FakeParam(); ratio = new FakeParam(); attack = new FakeParam(); release = new FakeParam(); }
export class FakeSource { connected: unknown[] = []; constructor(public el: HTMLMediaElement) {} connect(n: unknown) { this.connected.push(n); return n; } disconnect() { this.connected = []; } }
export class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  closed = false;
  resumed = 0;
  filters: FakeFilter[] = [];
  compressors: FakeCompressor[] = [];
  createBiquadFilter() { const f = new FakeFilter(); this.filters.push(f); return f as unknown as BiquadFilterNode; }
  createDynamicsCompressor() { const c = new FakeCompressor(); this.compressors.push(c); return c as unknown as DynamicsCompressorNode; }
  createGain() { const g = new FakeGain(); this.gains.push(g); return g as unknown as GainNode; }
  createMediaElementSource(el: HTMLMediaElement) {
    if (this.sources.some((s) => s.el === el)) throw new Error("InvalidStateError");
    const s = new FakeSource(el);
    this.sources.push(s);
    return s as unknown as MediaElementAudioSourceNode;
  }
  async resume() { this.resumed++; }
  async close() { this.closed = true; }
}

const time = new WeakMap<HTMLMediaElement, number>();
const paused = new WeakMap<HTMLMediaElement, boolean>();
export const playLog: HTMLMediaElement[] = [];

export function installFakeMedia(): () => void {
  const proto = HTMLMediaElement.prototype as unknown as Record<string, unknown>;
  const saved: Record<string, PropertyDescriptor | undefined> = {};
  for (const k of ["currentTime", "paused", "play", "pause", "load", "duration", "ended", "error", "readyState", "videoWidth", "videoHeight"]) saved[k] = Object.getOwnPropertyDescriptor(proto, k);
  Object.defineProperty(proto, "currentTime", {
    configurable: true,
    get(this: HTMLMediaElement) { return time.get(this) ?? 0; },
    set(this: HTMLMediaElement, v: number) { time.set(this, v); queueMicrotask(() => this.dispatchEvent(new Event("seeked"))); },
  });
  Object.defineProperty(proto, "paused", { configurable: true, get(this: HTMLMediaElement) { return paused.get(this) ?? true; } });
  Object.defineProperty(proto, "ended", { configurable: true, get() { return false; } });
  Object.defineProperty(proto, "error", { configurable: true, get() { return null; } });
  Object.defineProperty(proto, "duration", { configurable: true, get() { return 10; } });
  Object.defineProperty(proto, "readyState", { configurable: true, get() { return 4; } });
  Object.defineProperty(proto, "videoWidth", { configurable: true, get() { return 320; } });
  Object.defineProperty(proto, "videoHeight", { configurable: true, get() { return 180; } });
  proto.play = function (this: HTMLMediaElement) { paused.set(this, false); playLog.push(this); return Promise.resolve(); };
  proto.pause = function (this: HTMLMediaElement) { paused.set(this, true); };
  proto.load = function (this: HTMLMediaElement) { queueMicrotask(() => this.dispatchEvent(new Event("loadedmetadata"))); };
  return () => { for (const [k, d] of Object.entries(saved)) { if (d) Object.defineProperty(proto, k, d); else delete proto[k]; } playLog.length = 0; };
}

/** Move a fake element's clock forward as if it had played for `seconds`. */
export function advance(el: HTMLMediaElement, seconds: number) { time.set(el, (time.get(el) ?? 0) + seconds); }
export function setClock(el: HTMLMediaElement, seconds: number) { time.set(el, seconds); }
export const clockOf = (el: HTMLMediaElement) => time.get(el) ?? 0;
export const flush = () => new Promise<void>((r) => setTimeout(r, 0));
