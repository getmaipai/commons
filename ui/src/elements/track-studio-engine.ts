// VIDEO-STUDIO-04 (K3, home design section 5.2): the preview engine. One <video> element is the clock and the monitor; each voice or music
// piece is an <audio> element (at most four); Web Audio gains carry lane level, mute, solo, piece level, fades and the sound of a crossfade.
// Nothing is rendered: the preview cuts where the export dissolves. The engine owns every media element it makes and `dispose()` leaves
// none with a `src` (the relock path, K4).

import { LANE_IDS, gainAt, laneGain, laneOf, layoutLane, pieceEnvelope, previewEnd, type LaneId, type StudioPiece, type StudioState } from "./track-studio-model";

/** An audio element is corrected when it drifts from the clock by more than this (the design's proposal, measured in VIDEO-STUDIO-04). */
export const DRIFT_LIMIT_S = 0.12;
/** How often the audio elements are compared with the clock. */
export const SYNC_INTERVAL_MS = 250;
/** How often the engine looks for the end of a piece. */
export const TICK_MS = 25;
export const MAX_AUDIO_ELEMENTS = 4;

export interface EngineStats {
  /** Absolute drift, in milliseconds, of every audio element at every sync check (before correction). */
  driftsMs: number[];
  corrections: number;
  /** For each cut between two video pieces that needed a new source or a seek: milliseconds the picture waited. */
  seamsMs: number[];
}

export interface EngineOptions {
  /** Where the engine puts its one <video> (the monitor). It makes the element itself, so a dispose removes it from the page. Null: no picture (an audio-only studio). */
  videoHost: HTMLElement | null;
  poster?: string;
  videoLabel?: string;
  videoClass?: string;
  /** Where audio elements are put (hidden), so a test or a person can see that relock removed them. */
  host: HTMLElement | null;
  onTime: (t: number) => void;
  onPlaying: (playing: boolean) => void;
  onError: (line: string) => void;
  createAudio?: () => HTMLAudioElement;
  /** Returns null when Web Audio is unavailable; the engine then sets `element.volume` instead. */
  audioContext?: () => AudioContext | null;
  now?: () => number;
}

interface AudioSlot {
  pieceId: string;
  lane: LaneId;
  el: HTMLAudioElement;
  src: string;
  node?: MediaElementAudioSourceNode;
  gain?: GainNode;
  active: boolean;
  lastCorrectionMs: number;
}

export const PLAY_FAILED_LINE = "The preview could not start. Press Play again.";
export const MEDIA_FAILED_LINE = "One of the files could not be played. The rest still can.";

function whenEvent(el: HTMLMediaElement, names: string[], timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; for (const n of names) el.removeEventListener(n, finish); clearTimeout(timer); resolve(); };
    const timer = setTimeout(finish, timeoutMs);
    for (const n of names) el.addEventListener(n, finish, { once: true });
  });
}

export class PreviewEngine {
  readonly stats: EngineStats = { driftsMs: [], corrections: 0, seamsMs: [] };
  private o: EngineOptions;
  private state: StudioState;
  private solo: LaneId | null = null;
  private loop = false;
  private t = 0;
  private playing = false;
  private disposed = false;
  private token = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastSync = 0;
  private vIndex = -1;
  private vSrc = "";
  private seamBusy = false;
  private wallAnchor = { ms: 0, t: 0 };
  private slots = new Map<string, AudioSlot>();
  private ctx: AudioContext | null = null;
  private ctxTried = false;
  private master: GainNode | null = null;
  private laneNodes = new Map<LaneId, GainNode>();
  private vNode: MediaElementAudioSourceNode | null = null;
  private vPieceGain: GainNode | null = null;

  private video: HTMLVideoElement | null = null;

  constructor(state: StudioState, options: EngineOptions) {
    this.state = state;
    this.o = options;
    if (options.videoHost) {
      const v = document.createElement("video");
      v.playsInline = true;
      v.disablePictureInPicture = true;
      v.disableRemotePlayback = true;
      v.preload = "auto";
      v.setAttribute("controlsList", "nodownload noremoteplayback");
      if (options.videoLabel) v.setAttribute("aria-label", options.videoLabel);
      if (options.poster) v.poster = options.poster;
      if (options.videoClass) v.className = options.videoClass;
      v.setAttribute("data-studio-video", "");
      options.videoHost.appendChild(v);
      this.video = v;
    }
  }

  /** The monitor's element (for the Element to show or hide it). */
  get videoElement(): HTMLVideoElement | null { return this.video; }

  // -- public ----------------------------------------------------------------------------------------------------------

  get time(): number { return this.t; }
  get isPlaying(): boolean { return this.playing; }
  /** Every media element the engine holds, for tests and for the relock proof. */
  elements(): HTMLMediaElement[] { return [...(this.video ? [this.video] : []), ...[...this.slots.values()].map((s) => s.el)]; }

  setState(state: StudioState): void {
    if (this.disposed) return;
    this.state = state;
    this.reconcileSlots();
    // An edit may have moved the piece under the playhead: re-find it.
    if (this.playing) this.rescheduleAll();
    else this.applyLaneGains();
  }
  setSolo(solo: LaneId | null): void { this.solo = solo; this.applyLaneGains(); }
  setLoop(loop: boolean): void { this.loop = loop; }

  async play(): Promise<void> {
    if (this.disposed || this.playing) return;
    const my = ++this.token;
    this.reconcileSlots();
    this.ensureContext();
    try { await this.ctx?.resume(); } catch { /* a suspended context stays silent; the picture still plays */ }
    const end = this.filmEnd();
    if (this.t >= end - 0.05) this.t = 0;
    const ok = await this.startVideoAt(this.t, my);
    if (!ok || my !== this.token || this.disposed) return;
    this.playing = true;
    this.wallAnchor = { ms: this.now(), t: this.t };
    this.lastSync = 0;
    this.o.onPlaying(true);
    this.rescheduleAll();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  pause(): void {
    this.token++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.playing) this.t = this.clockT();
    this.playing = false;
    this.video?.pause();
    for (const s of this.slots.values()) { s.el.pause(); s.active = false; this.holdGain(s.gain); }
    this.holdGain(this.vPieceGain);
    this.o.onPlaying(false);
    this.o.onTime(this.t);
  }

  async seek(t: number): Promise<void> {
    if (this.disposed) return;
    const was = this.playing;
    const end = this.filmEnd();
    this.t = Math.min(Math.max(0, t), end);
    if (was) { this.pause(); }
    this.o.onTime(this.t); // the playhead moves at once; the picture follows when the frame is ready
    const my = ++this.token;
    await this.showFrameAt(this.t, my);
    this.o.onTime(this.t);
    if (was && my === this.token) await this.play();
  }

  /** Stop everything, remove every `src`, release the audio graph. Safe to call twice. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.token++;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
    for (const s of this.slots.values()) this.destroySlot(s);
    this.slots.clear();
    const v = this.video;
    if (v) { try { v.pause(); } catch { /* already gone */ } v.removeAttribute("src"); v.removeAttribute("poster"); try { v.load(); } catch { /* jsdom */ } v.remove(); }
    this.video = null;
    try { this.vNode?.disconnect(); this.vPieceGain?.disconnect(); this.master?.disconnect(); for (const n of this.laneNodes.values()) n.disconnect(); } catch { /* graph already closed */ }
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
    this.vNode = null; this.vPieceGain = null; this.master = null; this.laneNodes.clear();
    this.vSrc = ""; this.vIndex = -1;
  }

  // -- clock -----------------------------------------------------------------------------------------------------------

  private now(): number { return this.o.now ? this.o.now() : performance.now(); }
  private videoLane() { return laneOf(this.state, "video"); }
  private filmEnd(): number {
    let end = 0;
    for (const id of LANE_IDS) for (const p of layoutLane(laneOf(this.state, id))) end = Math.max(end, p.end);
    const v = layoutLane(this.videoLane());
    return v.length > 0 ? v[v.length - 1]!.end : end;
  }
  /** The timeline time now: from the video element while it plays a piece, from the wall clock when there is no picture. */
  private clockT(): number {
    const lane = this.videoLane();
    if (this.vIndex >= 0 && this.vIndex < lane.pieces.length && this.video) {
      const placed = layoutLane(lane)[this.vIndex]!;
      return placed.start + (this.video.currentTime - placed.piece.in_s);
    }
    return this.wallAnchor.t + (this.now() - this.wallAnchor.ms) / 1000;
  }

  // -- video -----------------------------------------------------------------------------------------------------------

  private videoIndexAt(t: number): number {
    const placed = layoutLane(this.videoLane());
    for (let i = placed.length - 1; i >= 0; i--) if (t >= placed[i]!.start - 1e-6) return t < placed[i]!.end - 1e-6 ? i : -1;
    return placed.length > 0 ? 0 : -1;
  }

  /** Put the right source and time on the video element. Resolves false when the film has no picture or the load was superseded. */
  private async loadVideoPiece(index: number, t: number, my: number): Promise<boolean> {
    const v = this.video;
    const lane = this.videoLane();
    const placed = layoutLane(lane)[index];
    if (!v || !placed) return false;
    const local = placed.piece.in_s + Math.max(0, t - placed.start);
    if (this.vSrc !== placed.piece.src) {
      this.vSrc = placed.piece.src;
      v.src = placed.piece.src;
      if (placed.piece.poster) v.poster = placed.piece.poster;
      v.load();
      await whenEvent(v, ["loadedmetadata", "error"], 4000);
      if (my !== this.token || this.disposed) return false;
      if (v.error) { this.o.onError(MEDIA_FAILED_LINE); return false; }
    }
    this.vIndex = index;
    if (Math.abs(v.currentTime - local) > 0.03) {
      v.currentTime = local;
      await whenEvent(v, ["seeked", "error"], 1500);
      if (my !== this.token || this.disposed) return false;
    }
    return true;
  }

  private async startVideoAt(t: number, my: number): Promise<boolean> {
    const index = this.videoIndexAt(t);
    if (index < 0) return true; // no picture: the wall clock runs the audio lanes
    if (!(await this.loadVideoPiece(index, t, my))) return false;
    try {
      await this.video!.play();
    } catch {
      this.o.onError(PLAY_FAILED_LINE);
      return false;
    }
    return my === this.token && !this.disposed;
  }

  private async showFrameAt(t: number, my: number): Promise<void> {
    const index = this.videoIndexAt(t);
    if (index >= 0) await this.loadVideoPiece(index, t, my);
    for (const s of this.slots.values()) { s.el.pause(); s.active = false; }
  }

  // -- tick ------------------------------------------------------------------------------------------------------------

  private tick(): void {
    if (!this.playing || this.disposed) return;
    const t = this.clockT();
    this.t = t;
    const lane = this.videoLane();
    const end = this.filmEnd();
    if (this.vIndex >= 0 && !this.seamBusy) {
      const stop = previewEnd(lane, this.vIndex);
      if (t >= stop - 0.02 || this.video?.ended) {
        void this.advance(this.vIndex + 1, stop);
        return;
      }
    } else if (this.vIndex < 0 && t >= end - 0.02) {
      this.finish();
      return;
    }
    if (this.seamBusy) return;
    const nowMs = this.now();
    if (nowMs - this.lastSync >= SYNC_INTERVAL_MS) { this.lastSync = nowMs; this.syncAudio(t, true); } else this.syncAudio(t, false);
    this.o.onTime(t);
    if (!this.ctx) this.applyFallbackVolume(t);
  }

  private finish(): void {
    if (this.loop) { void this.seek(0); return; }
    const end = this.filmEnd();
    this.pause();
    this.t = end;
    this.o.onTime(end);
  }

  /** The video lane's next piece starts: change source or seek only when the next piece is not a continuation of this one. */
  private async advance(next: number, at: number): Promise<void> {
    const lane = this.videoLane();
    if (next >= lane.pieces.length) {
      if (this.loop) { await this.seek(0); return; }
      this.finish();
      return;
    }
    const v = this.video!;
    const placed = layoutLane(lane)[next]!;
    const cur = lane.pieces[this.vIndex]!;
    const continuation = placed.piece.src === cur.src && Math.abs(placed.piece.in_s - v.currentTime) < 0.1;
    const my = this.token;
    if (continuation) {
      this.vIndex = next;
    } else {
      this.seamBusy = true;
      const started = this.now();
      const ok = await this.loadVideoPiece(next, at, my);
      if (!ok || my !== this.token) { this.seamBusy = false; return; }
      if (v.paused) { try { await v.play(); } catch { this.o.onError(PLAY_FAILED_LINE); this.seamBusy = false; this.pause(); return; } }
      this.stats.seamsMs.push(Math.round(this.now() - started));
      this.seamBusy = false;
    }
    this.scheduleVideoEnvelope(next, at);
  }

  // -- audio elements --------------------------------------------------------------------------------------------------

  private ensureContext(): void {
    if (this.ctx || this.ctxTried) return;
    this.ctxTried = true;
    let ctx: AudioContext | null = null;
    try {
      ctx = this.o.audioContext ? this.o.audioContext() : typeof AudioContext !== "undefined" ? new AudioContext() : null;
    } catch { ctx = null; }
    if (!ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    for (const id of LANE_IDS) { const g = ctx.createGain(); g.connect(this.master); this.laneNodes.set(id, g); }
    const v = this.video;
    if (v) {
      try {
        this.vNode = ctx.createMediaElementSource(v);
        this.vPieceGain = ctx.createGain();
        this.vNode.connect(this.vPieceGain);
        this.vPieceGain.connect(this.laneNodes.get("video")!);
      } catch { this.vNode = null; this.vPieceGain = null; }
    }
    for (const s of this.slots.values()) this.wireSlot(s);
    this.applyLaneGains();
  }

  private wireSlot(s: AudioSlot): void {
    if (!this.ctx || s.node) return;
    try {
      s.node = this.ctx.createMediaElementSource(s.el);
      s.gain = this.ctx.createGain();
      s.node.connect(s.gain);
      s.gain.connect(this.laneNodes.get(s.lane)!);
    } catch { s.node = undefined; s.gain = undefined; }
  }

  private destroySlot(s: AudioSlot): void {
    try { s.el.pause(); } catch { /* gone */ }
    s.el.removeAttribute("src");
    try { s.el.load(); } catch { /* jsdom */ }
    try { s.node?.disconnect(); s.gain?.disconnect(); } catch { /* closed */ }
    s.el.remove();
  }

  private reconcileSlots(): void {
    const wanted = new Map<string, { piece: StudioPiece; lane: LaneId }>();
    for (const id of ["voice", "music"] as const) for (const p of laneOf(this.state, id).pieces) wanted.set(p.id, { piece: p, lane: id });
    for (const [id, slot] of [...this.slots]) {
      const w = wanted.get(id);
      if (!w || w.piece.src !== slot.src) { this.destroySlot(slot); this.slots.delete(id); }
    }
    for (const [id, w] of wanted) {
      if (this.slots.has(id) || this.slots.size >= MAX_AUDIO_ELEMENTS) continue;
      const el = this.o.createAudio ? this.o.createAudio() : document.createElement("audio");
      el.preload = "auto";
      el.disableRemotePlayback = true;
      el.setAttribute("controlsList", "nodownload noremoteplayback");
      el.hidden = true;
      el.setAttribute("data-studio-media", w.lane);
      el.src = w.piece.src;
      el.addEventListener("error", () => this.o.onError(MEDIA_FAILED_LINE));
      this.o.host?.appendChild(el);
      const slot: AudioSlot = { pieceId: id, lane: w.lane, el, src: w.piece.src, active: false, lastCorrectionMs: 0 };
      this.slots.set(id, slot);
      this.wireSlot(slot);
    }
  }

  /** Which audio pieces should sound at timeline time `t`, start or stop their elements, and correct drift. */
  private syncAudio(t: number, measure: boolean): void {
    this.reconcileSlots();
    for (const id of ["voice", "music"] as const) {
      const lane = laneOf(this.state, id);
      const placed = layoutLane(lane);
      lane.pieces.forEach((piece, i) => {
        const slot = this.slots.get(piece.id);
        if (!slot) return;
        const { start, end } = placed[i]!;
        const inside = t >= start - 1e-6 && t < end - 1e-6;
        const desired = piece.in_s + (t - start);
        if (inside && !slot.active) {
          slot.active = true;
          try { slot.el.currentTime = desired; } catch { /* not ready yet */ }
          void slot.el.play()?.catch(() => this.o.onError(MEDIA_FAILED_LINE));
          this.scheduleEnvelope(slot.gain, pieceEnvelope(lane, i), t - start);
        } else if (!inside && slot.active) {
          slot.active = false;
          slot.el.pause();
          this.holdGain(slot.gain);
        } else if (inside && measure) {
          const drift = slot.el.currentTime - desired;
          this.stats.driftsMs.push(Math.round(Math.abs(drift) * 1000));
          if (Math.abs(drift) > DRIFT_LIMIT_S && this.now() - slot.lastCorrectionMs > 500) {
            slot.lastCorrectionMs = this.now();
            this.stats.corrections++;
            try { slot.el.currentTime = desired; } catch { /* not ready yet */ }
          }
        }
      });
    }
  }

  // -- gains -----------------------------------------------------------------------------------------------------------

  private holdGain(g: GainNode | null | undefined): void {
    if (!g || !this.ctx) return;
    try { const now = this.ctx.currentTime; const cur = g.gain.value; g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(cur, now); } catch { /* closed */ }
  }

  private scheduleEnvelope(g: GainNode | null | undefined, points: { t: number; g: number }[], local: number): void {
    if (!g || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(gainAt(points, local), now);
      for (const p of points) if (p.t > local + 1e-6) g.gain.linearRampToValueAtTime(p.g, now + (p.t - local));
    } catch { /* closed */ }
  }

  private scheduleVideoEnvelope(index: number, t: number): void {
    const lane = this.videoLane();
    const placed = layoutLane(lane)[index];
    if (!placed) return;
    this.scheduleEnvelope(this.vPieceGain, pieceEnvelope(lane, index), Math.max(0, t - placed.start));
  }

  private applyLaneGains(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const id of LANE_IDS) {
      const node = this.laneNodes.get(id);
      if (!node) continue;
      try { node.gain.setTargetAtTime(laneGain(laneOf(this.state, id), this.solo), now, 0.01); } catch { /* closed */ }
    }
  }

  /** After an edit during playback: restart each active audio piece's ramp and the video piece's ramp from where they are. */
  private rescheduleAll(): void {
    const t = this.playing ? this.clockT() : this.t;
    this.applyLaneGains();
    const lane = this.videoLane();
    const index = this.vIndex >= 0 && this.vIndex < lane.pieces.length ? this.vIndex : this.videoIndexAt(t);
    if (index >= 0) this.scheduleVideoEnvelope(index, t);
    for (const s of this.slots.values()) s.active = false; // syncAudio restarts what is inside the new layout
  }

  /** No Web Audio: set `element.volume` from the same curves (1 at most; a gain above 0 dB cannot be made louder than the file). */
  private applyFallbackVolume(t: number): void {
    const solo = this.solo;
    const vol = (laneId: LaneId, points: { t: number; g: number }[], local: number) => {
      const lane = laneOf(this.state, laneId);
      return Math.min(1, Math.max(0, laneGain(lane, solo) * gainAt(points, local)));
    };
    const vl = this.videoLane();
    if (this.video && this.vIndex >= 0 && vl.pieces[this.vIndex]) {
      const placed = layoutLane(vl)[this.vIndex]!;
      this.video.volume = vol("video", pieceEnvelope(vl, this.vIndex), t - placed.start);
    }
    for (const id of ["voice", "music"] as const) {
      const lane = laneOf(this.state, id);
      const placed = layoutLane(lane);
      lane.pieces.forEach((piece, i) => {
        const slot = this.slots.get(piece.id);
        if (slot) slot.el.volume = vol(id, pieceEnvelope(lane, i), t - placed[i]!.start);
      });
    }
  }
}
