import { useEffect, useRef, useState, type RefObject } from "react";

export const STACKED_ALPHA_FRAGMENT_SHADER = `precision mediump float;
uniform sampler2D frame;
varying vec2 uv;
void main() {
  vec4 color = texture2D(frame, vec2(uv.x, (1.0 - uv.y) * 0.5));
  float alpha = texture2D(frame, vec2(uv.x, 0.5 + (1.0 - uv.y) * 0.5)).r;
  gl_FragColor = vec4(color.rgb / max(alpha, 0.001), alpha);
}`;

export function unpremultiply(r: number, g: number, b: number, a: number): [number, number, number, number] {
  const alpha = Math.max(a, 0.001);
  return [r / alpha, g / alpha, b / alpha, a];
}

type Props = { src: string; loop?: boolean; paused?: boolean; onEnded?(): void; onError?(): void; onFrame?(): void; label: string; className?: string; videoRef?: RefObject<HTMLVideoElement | null> };

export function StackedAlphaVideo({ src, loop = true, paused = false, onEnded, onError, onFrame, label, className, videoRef: externalVideoRef }: Props) {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  const [failed, setFailed] = useState(false);

  useEffect(() => { setFailed(false); }, [src]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.loop = loop;
    if (video.getAttribute("src") !== src) { video.src = src; video.load(); }
  }, [src, loop, videoRef]);
  useEffect(() => {
    const update = () => setDocumentVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setVisible(!!entry?.isIntersecting));
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !visible || !documentVisible || paused || failed) return;
    let gl: WebGLRenderingContext | null = null;
    try { gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false }); } catch { gl = null; }
    const fail = () => { setFailed(true); onError?.(); };
    if (!gl) { fail(); return; }
    const compile = (type: number, source: string) => {
      const shader = gl!.createShader(type);
      if (!shader) return null;
      gl!.shaderSource(shader, source); gl!.compileShader(shader);
      return gl!.getShaderParameter(shader, gl!.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 position; varying vec2 uv; void main(){ uv=(position+1.0)*0.5; gl_Position=vec4(position,0.0,1.0); }");
    const fragment = compile(gl.FRAGMENT_SHADER, STACKED_ALPHA_FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) { fail(); return; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { fail(); return; }
    gl.useProgram(program); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position"); gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.disable(gl.BLEND);
    let frame = 0; let raf = 0; let alive = true;
    const draw = () => {
      if (!alive || video.readyState < 2) return;
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight / 2) { canvas.width = video.videoWidth; canvas.height = video.videoHeight / 2; }
      gl!.viewport(0, 0, canvas.width, canvas.height); gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, video); gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4); onFrame?.();
    };
    const next = () => { if (!alive) return; draw(); if ("requestVideoFrameCallback" in video) frame = video.requestVideoFrameCallback(next); else raf = requestAnimationFrame(next); };
    const start = () => {
      if (paused || document.hidden) return;
      void video.play().catch((error: unknown) => { if ((error as { name?: string } | null)?.name !== "AbortError") fail(); });
      if ("requestVideoFrameCallback" in video) frame = video.requestVideoFrameCallback(next); else raf = requestAnimationFrame(next);
    };
    const stop = () => { video.pause(); cancelAnimationFrame(raf); if ("cancelVideoFrameCallback" in video && frame) video.cancelVideoFrameCallback(frame); };
    const ended = () => onEnded?.();
    const errored = () => fail();
    video.addEventListener("loadeddata", next); video.addEventListener("ended", ended); video.addEventListener("error", errored);
    start();
    return () => {
      alive = false; stop(); video.removeEventListener("loadeddata", next); video.removeEventListener("ended", ended); video.removeEventListener("error", errored);
      gl!.deleteTexture(texture); gl!.deleteBuffer(buffer); gl!.deleteProgram(program); gl!.deleteShader(vertex); gl!.deleteShader(fragment);
    };
  }, [visible, documentVisible, paused, failed, onEnded, onError, onFrame, videoRef]);

  useEffect(() => { const video = videoRef.current; if (!video) return; if (paused || !documentVisible || !visible) video.pause(); }, [paused, documentVisible, visible, videoRef]);
  return <div ref={hostRef} className={className}>
    <video ref={videoRef} aria-hidden="true" muted playsInline preload="auto" className="hidden" />
    <canvas ref={canvasRef} role="img" aria-label={label} className="size-full" />
  </div>;
}
