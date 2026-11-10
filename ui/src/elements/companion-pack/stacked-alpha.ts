export type StackedAlphaRenderer = {
  draw(video: HTMLVideoElement): void;
  dispose(): void;
  gl?: WebGLRenderingContext;
};

export type StackedAlphaFactory = (canvas: HTMLCanvasElement, stillUrl?: string) => StackedAlphaRenderer;
export let stackedAlphaRendererFactory: StackedAlphaFactory = createStackedAlphaRenderer;
export function setStackedAlphaRendererFactory(factory: StackedAlphaFactory): () => void {
  const previous = stackedAlphaRendererFactory;
  stackedAlphaRendererFactory = factory;
  return () => { stackedAlphaRendererFactory = previous; };
}

export function createStillRenderer(canvas: HTMLCanvasElement, stillUrl?: string): StackedAlphaRenderer {
  const ctx = canvas.getContext("2d");
  const still = new Image();
  if (stillUrl) still.src = stillUrl;
  const drawStill = () => {
    if (ctx && still.complete) ctx.drawImage(still, 0, 0, canvas.width, canvas.height);
  };
  still.addEventListener("load", drawStill);
  return { draw: drawStill, dispose: () => still.removeEventListener("load", drawStill) };
}

export const stackedAlphaShaderSources = {
  vertex: "attribute vec2 p; varying vec2 u; void main(){u=vec2(p.x*.5+.5,.5-p.y*.5);gl_Position=vec4(p,0.,1.);}",
  fragment: "precision mediump float;uniform sampler2D t;varying vec2 u;void main(){vec3 c=texture2D(t,vec2(u.x,u.y*.5)).rgb;float a=texture2D(t,vec2(u.x,.5+u.y*.5)).r;gl_FragColor=vec4(min(c,vec3(a)),a);}",
};

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Unable to create shader");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Unable to compile shader");
  return shader;
}

export function createStackedAlphaRenderer(
  canvas: HTMLCanvasElement,
  stillUrl?: string,
): StackedAlphaRenderer {
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;
  let texture: WebGLTexture | null = null;
  let lost = false;
  let still: HTMLImageElement | null = null;
  const fallback = () => {
    const ctx = canvas.getContext("2d");
    if (!ctx || !still?.complete) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(still, 0, 0, canvas.width, canvas.height);
  };
  const makeGl = () => {
    try {
      gl = canvas.getContext("webgl", {
        premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: false,
      });
      if (!gl) return false;
      program = gl.createProgram();
      if (!program) return false;
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, stackedAlphaShaderSources.vertex));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, stackedAlphaShaderSources.fragment));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
      texture = gl.createTexture();
      if (!texture) return false;
      gl.useProgram(program);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const location = gl.getAttribLocation(program, "p");
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      // The stacked video is 480x960 (not a power of two): WebGL 1 needs clamped wrapping or the texture is incomplete and draws nothing.
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, "t"), 0);
      return true;
    } catch {
      gl = null;
      return false;
    }
  };
  if (stillUrl) {
    still = new Image();
    still.src = stillUrl;
    still.onload = fallback;
  }
  makeGl();
  if (!gl || !program || !texture) return createStillRenderer(canvas, stillUrl);
  const onLost = (event: Event) => { event.preventDefault(); lost = true; };
  const onRestored = () => { lost = false; if (!makeGl()) fallback(); };
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);
  return {
    get gl() { return gl ?? undefined; },
    draw(video) {
      if (!gl || !program || !texture || lost) { fallback(); return; }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.useProgram(program);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);   // the vertex shader flips; flipping here too would swap the colour and matte halves
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (gl && texture) gl.deleteTexture(texture);
      if (gl && program) gl.deleteProgram(program);
      still = null;
      gl = null;
      program = null;
      texture = null;
    },
  };
}
