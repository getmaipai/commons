import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import {
  ImageEditor,
  type ImageEditorOperation,
  type ImageEditorPending,
  type ImageEditorProps,
  type ImageEditorRunControl,
  type ImageEditorToolKey,
  type ImageEditorVersion,
} from "./image-editor";

const versions: ImageEditorVersion[] = [
  { id: "v1", url: "https://example.test/v1.png", label: "Original", createdAt: "2026-10-01T10:00:00Z", width: 1200, height: 800 },
  { id: "v2", url: "https://example.test/v2.png", label: "Background removed", width: 1200, height: 800 },
  { id: "v3", url: "https://example.test/v3.png", label: "Object erased", width: 1200, height: 800 },
];

const allEnabled = Object.fromEntries(
  (["markup", "comment", "remove_background", "erase", "resize"] as const).map((k) => [k, { enabled: true }]),
) as Record<ImageEditorToolKey, { enabled: boolean; reason?: string }>;

const pendingResult: ImageEditorPending = { token: "t1", previewUrl: "https://example.test/pending.png", width: 1200, height: 800, transparent: true };

function setup(overrides: Partial<ImageEditorProps> = {}) {
  const props = {
    title: "Sunset",
    versions,
    currentVersionId: "v2",
    onSelectVersion: mock((_id: string) => {}),
    tools: allEnabled,
    onRunOperation: mock(async (_op: ImageEditorOperation, _ctl: ImageEditorRunControl) => pendingResult),
    onApplyPending: mock(async (_p: ImageEditorPending, _label: string) => ({ id: "v4", url: "https://example.test/v4.png", label: "New" })),
    onSaveMarkup: mock(async (_png: Blob) => ({ id: "v5", url: "https://example.test/v5.png", label: "Markup" })),
    onComment: mock(async (_r: { prompt: string; region: unknown }) => ({ message: "I can do that." })),
    onClose: mock(() => {}),
    ...overrides,
  } as ImageEditorProps & {
    onSelectVersion: ReturnType<typeof mock>;
    onRunOperation: ReturnType<typeof mock>;
    onApplyPending: ReturnType<typeof mock>;
    onSaveMarkup: ReturnType<typeof mock>;
    onComment: ReturnType<typeof mock>;
    onClose: ReturnType<typeof mock>;
  };
  const view = render(<ImageEditor {...props} />);
  return { props, view, container: view.container, ...within(view.container) };
}

const original = {
  getContext: HTMLCanvasElement.prototype.getContext,
  toBlob: HTMLCanvasElement.prototype.toBlob,
  rect: HTMLElement.prototype.getBoundingClientRect,
  Image: globalThis.Image,
  click: HTMLAnchorElement.prototype.click,
};
let downloads: Array<{ href: string; download: string }> = [];

beforeEach(() => {
  downloads = [];
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
  HTMLCanvasElement.prototype.toBlob = ((cb: (b: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" }))) as never;
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
    downloads.push({ href: this.href, download: this.download });
  };
  class FakeImage {
    crossOrigin = "";
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 1200;
    naturalHeight = 800;
    set src(_v: string) {
      queueMicrotask(() => this.onload?.());
    }
  }
  globalThis.Image = FakeImage as never;
});

afterEach(() => {
  cleanup();
  HTMLCanvasElement.prototype.getContext = original.getContext;
  HTMLCanvasElement.prototype.toBlob = original.toBlob;
  HTMLElement.prototype.getBoundingClientRect = original.rect;
  HTMLAnchorElement.prototype.click = original.click;
  globalThis.Image = original.Image;
});

const tool = (view: ReturnType<typeof setup>, name: string) => view.getByRole("radio", { name });

/** Lay the canvas out as 120 x 80 CSS px so pointer positions map to picture pixels. */
function layOutCanvas() {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const isCanvas = this instanceof HTMLCanvasElement;
    const width = isCanvas ? 120 : 0;
    const height = isCanvas ? 80 : 0;
    return { left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
}

function drag(canvas: Element, from: [number, number], to: [number, number], pointerId = 1) {
  fireEvent.pointerDown(canvas, { clientX: from[0], clientY: from[1], pointerId, button: 0 });
  fireEvent.pointerMove(canvas, { clientX: to[0], clientY: to[1], pointerId });
  fireEvent.pointerUp(canvas, { clientX: to[0], clientY: to[1], pointerId });
}

describe("layout and names", () => {
  test("toolbar, tools, stage image alt, zoom and header controls are named", () => {
    const v = setup({ onShare: () => {} });
    const toolbar = v.getByRole("toolbar", { name: "Picture editing tools" });
    expect(within(toolbar).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Markup",
      "Comment",
      "Remove BG",
      "Erase",
      "Resize",
    ]);
    expect(within(toolbar).getByText("Remove BG")).toBeTruthy();
    expect(v.getByRole("img", { name: "Sunset" }).getAttribute("src")).toBe("https://example.test/v2.png");
    expect(v.getByRole("region", { name: "Picture stage" })).toBeTruthy();
    for (const name of ["Close editor", "Versions", "Download", "Share", "Undo", "Redo", "Zoom out", "Zoom in", "Fit"]) {
      expect(v.getByRole("button", { name })).toBeTruthy();
    }
    expect(v.getByRole("heading", { name: "Sunset" })).toBeTruthy();
    expect(v.container.querySelector('[data-slot="image-editor-zoom"]')!.textContent).toBe("100%");
  });

  test("the picture sits on a token-coloured checkerboard", () => {
    const v = setup();
    const box = v.container.querySelector<HTMLElement>('[data-slot="image-editor-picture"]')!;
    expect(box.style.backgroundImage).toContain("var(--border)");
    expect(box.style.backgroundColor).toBe("var(--card)");
    expect(box.style.width).toBe("1200px");
  });

  test("Share is hidden without onShare and calls it with the current version", () => {
    const first = setup();
    expect(first.queryByRole("button", { name: "Share" })).toBeNull();
    cleanup();
    const onShare = mock((_v: ImageEditorVersion) => {});
    const v = setup({ onShare });
    fireEvent.click(v.getByRole("button", { name: "Share" }));
    expect(onShare).toHaveBeenCalledTimes(1);
    expect(onShare.mock.calls[0]![0]).toEqual(versions[1]!);
  });

  test("Download triggers an anchor download of the current version", () => {
    const v = setup({ downloadName: "sunset.png" });
    fireEvent.click(v.getByRole("button", { name: "Download" }));
    expect(downloads).toEqual([{ href: "https://example.test/v2.png", download: "sunset.png" }]);
    expect(document.querySelector("a[download]")).toBeNull();
  });

  test("Download falls back to the title", () => {
    const v = setup();
    fireEvent.click(v.getByRole("button", { name: "Download" }));
    expect(downloads[0]!.download).toBe("Sunset");
  });

  test("screen variant is the phone layout: fixed, toolbar below the stage, undo in the header", () => {
    const v = setup({ variant: "screen" });
    const root = v.container.querySelector<HTMLElement>('[data-slot="image-editor"]')!;
    expect(root.dataset.layout).toBe("compact");
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    const header = v.container.querySelector<HTMLElement>('[data-slot="image-editor-header"]')!;
    expect(within(header).getByRole("button", { name: "Undo" })).toBeTruthy();
    const stage = v.getByRole("region", { name: "Picture stage" });
    const toolbar = v.getByRole("toolbar");
    expect(stage.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("pane variant puts the toolbar above the stage and undo in the footer", () => {
    const v = setup();
    const stage = v.getByRole("region", { name: "Picture stage" });
    const toolbar = v.getByRole("toolbar");
    expect(stage.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
    const footer = v.container.querySelector<HTMLElement>('[data-slot="image-editor-footer"]')!;
    expect(within(footer).getByRole("button", { name: "Undo" })).toBeTruthy();
  });

  test("statusNote and errorMessage are shown", () => {
    const v = setup({ statusNote: "Getting the editing tools ready", errorMessage: "The editor could not start." });
    expect(v.getByRole("status", { name: "" }).textContent).toContain("Getting the editing tools ready");
    expect(v.getByText("The editor could not start.")).toBeTruthy();
  });
});

describe("zoom", () => {
  test("plus, minus and Fit move the label through the steps", () => {
    const v = setup();
    const label = () => v.container.querySelector('[data-slot="image-editor-zoom"]')!.textContent;
    fireEvent.click(v.getByRole("button", { name: "Zoom in" }));
    expect(label()).toBe("110%");
    fireEvent.click(v.getByRole("button", { name: "Zoom out" }));
    fireEvent.click(v.getByRole("button", { name: "Zoom out" }));
    expect(label()).toBe("90%");
    fireEvent.click(v.getByRole("button", { name: "Fit" }));
    expect(label()).toBe("100%");
  });

  test("keyboard + - 0 work with the stage focused and ignore other focus", () => {
    const v = setup();
    const stage = v.getByRole("region", { name: "Picture stage" });
    const label = () => v.container.querySelector('[data-slot="image-editor-zoom"]')!.textContent;
    fireEvent.keyDown(stage, { key: "+" });
    expect(label()).toBe("110%");
    fireEvent.keyDown(stage, { key: "-" });
    fireEvent.keyDown(stage, { key: "-" });
    expect(label()).toBe("90%");
    fireEvent.keyDown(stage, { key: "0" });
    expect(label()).toBe("100%");
    fireEvent.keyDown(v.getByRole("button", { name: "Fit" }), { key: "+" });
    expect(label()).toBe("100%");
  });

  test("Ctrl+wheel zooms and a plain wheel does not", () => {
    const v = setup();
    const stage = v.getByRole("region", { name: "Picture stage" });
    const label = () => v.container.querySelector('[data-slot="image-editor-zoom"]')!.textContent;
    // happy-dom's WheelEvent drops the modifier flags, so set them on the event.
    const wheel = (deltaY: number, flag?: "ctrlKey" | "metaKey") => {
      const event = new WheelEvent("wheel", { deltaY, bubbles: true, cancelable: true });
      if (flag) Object.defineProperty(event, flag, { value: true });
      act(() => {
        stage.dispatchEvent(event);
      });
      return event;
    };
    expect(wheel(-100).defaultPrevented).toBe(false);
    expect(label()).toBe("100%");
    expect(wheel(-100, "ctrlKey").defaultPrevented).toBe(true);
    expect(label()).toBe("110%");
    wheel(100, "metaKey");
    expect(label()).toBe("100%");
  });
});

describe("tools", () => {
  test("a disabled tool stays focusable, does not activate, and says why", () => {
    const v = setup({ tools: { ...allEnabled, erase: { enabled: false, reason: "The erase tool is still downloading." } } });
    const erase = tool(v, "Erase");
    expect(erase.getAttribute("aria-disabled")).toBe("true");
    expect((erase as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(erase);
    expect(erase.getAttribute("aria-checked")).toBe("false");
    expect(v.getByText("The erase tool is still downloading.")).toBeTruthy();
    expect(v.queryByRole("slider", { name: "Brush size" })).toBeNull();
  });

  test("an enabled tool opens its sub-bar and a second press leaves it", () => {
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    expect(tool(v, "Markup").getAttribute("aria-checked")).toBe("true");
    expect(v.getByRole("radio", { name: "Highlighter" })).toBeTruthy();
    expect(v.getByRole("slider", { name: "Stroke size" })).toBeTruthy();
    fireEvent.click(tool(v, "Markup"));
    expect(v.queryByRole("slider", { name: "Stroke size" })).toBeNull();
  });

  test("markup sub-bar offers six tools and eight colours", () => {
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    const group = v.getByLabelText("Markup tool");
    expect(within(group).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Pen",
      "Highlighter",
      "Arrow",
      "Rectangle",
      "Ellipse",
      "Text",
    ]);
    fireEvent.click(v.getByRole("button", { name: "Color: Red" }));
    const colors = within(document.body).getByRole("group", { name: "Colors" });
    expect(within(colors).getAllByRole("button")).toHaveLength(8);
    fireEvent.click(within(colors).getByRole("button", { name: "Violet" }));
    expect(v.getByRole("button", { name: "Color: Violet" })).toBeTruthy();
  });

  test("a pen stroke enables Undo stroke, Clear and Save; Undo stroke removes it", () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    const canvas = v.container.querySelector("canvas")!;
    const save = v.getByRole("button", { name: "Save" });
    expect(save).toBeDisabled();
    drag(canvas, [10, 10], [60, 40]);
    expect(save).not.toBeDisabled();
    expect(v.getByRole("button", { name: "Undo stroke" })).not.toBeDisabled();
    fireEvent.click(v.getByRole("button", { name: "Undo stroke" }));
    expect(save).toBeDisabled();
    expect(v.getByRole("button", { name: "Redo stroke" })).not.toBeDisabled();
    fireEvent.click(v.getByRole("button", { name: "Redo stroke" }));
    expect(save).not.toBeDisabled();
    fireEvent.click(v.getByRole("button", { name: "Clear" }));
    expect(save).toBeDisabled();
  });

  test("Save flattens the markup, saves a new version and selects it", async () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    drag(v.container.querySelector("canvas")!, [10, 10], [60, 40]);
    fireEvent.click(v.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(v.props.onSaveMarkup).toHaveBeenCalledTimes(1));
    const blob = v.props.onSaveMarkup.mock.calls[0]![0] as Blob;
    expect(blob).toBeInstanceOf(Blob);
    await waitFor(() => expect(v.props.onSelectVersion).toHaveBeenCalledWith("v5"));
  });

  test("the text tool places an input and Enter commits a stroke", () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    fireEvent.click(v.getByRole("radio", { name: "Text" }));
    const canvas = v.container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 20, pointerId: 1, button: 0 });
    const input = v.getByRole("textbox", { name: "Text to add" });
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(v.queryByRole("textbox", { name: "Text to add" })).toBeNull();
    expect(v.getByRole("button", { name: "Save" })).not.toBeDisabled();
  });
});

describe("remove background", () => {
  test("runs, shows progress and Cancel, then previews with Apply and Undo", async () => {
    let ctl!: ImageEditorRunControl;
    let finish!: (p: ImageEditorPending) => void;
    const onRunOperation = mock(
      (_op: ImageEditorOperation, c: ImageEditorRunControl) =>
        new Promise<ImageEditorPending>((resolve) => {
          ctl = c;
          finish = resolve;
        }),
    );
    const v = setup({ onRunOperation });
    fireEvent.click(tool(v, "Remove BG"));
    expect(onRunOperation).toHaveBeenCalledTimes(1);
    expect(onRunOperation.mock.calls[0]![0]).toEqual({ operation: "remove_background" });
    const busy = () => v.container.querySelector<HTMLElement>('[data-slot="image-editor-busy"]');
    expect(busy()).not.toBeNull();
    expect(busy()!.getAttribute("role")).toBe("status");
    expect(within(busy()!).getByRole("progressbar").getAttribute("aria-valuenow")).toBeNull();
    act(() => ctl.onProgress({ percent: 40, label: "Cutting out the subject" }));
    expect(busy()!.textContent).toContain("Cutting out the subject 40%");
    expect(within(busy()!).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("40");
    await act(async () => finish(pendingResult));
    await waitFor(() => expect(v.getByRole("button", { name: "Apply" })).toBeTruthy());
    expect(v.getByRole("img", { name: "Sunset" }).getAttribute("src")).toBe(pendingResult.previewUrl);
    expect(busy()).toBeNull();
  });

  test("Cancel aborts the signal and changes nothing", async () => {
    let ctl!: ImageEditorRunControl;
    const onRunOperation = mock(
      (_op: ImageEditorOperation, c: ImageEditorRunControl) =>
        new Promise<ImageEditorPending>((_resolve, reject) => {
          ctl = c;
          c.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const v = setup({ onRunOperation });
    fireEvent.click(tool(v, "Remove BG"));
    fireEvent.click(v.getByRole("button", { name: "Cancel" }));
    expect(ctl.signal.aborted).toBe(true);
    await waitFor(() => expect(v.container.querySelector('[data-slot="image-editor-busy"]')).toBeNull());
    expect(v.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(v.queryByRole("alert")).toBeNull();
    expect(v.getByRole("img", { name: "Sunset" }).getAttribute("src")).toBe("https://example.test/v2.png");
  });

  test("Apply saves a NEW version, then selects it", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.click(v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(v.props.onApplyPending).toHaveBeenCalledTimes(1));
    expect(v.props.onApplyPending.mock.calls[0]).toEqual([pendingResult, "Background removed"]);
    await waitFor(() => expect(v.props.onSelectVersion).toHaveBeenCalledWith("v4"));
    expect(v.queryByRole("button", { name: "Apply" })).toBeNull();
  });

  test("Undo discards the preview and shows the picture again", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.click(v.getByRole("button", { name: "Undo preview" }));
    expect(v.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(v.getByRole("img", { name: "Sunset" }).getAttribute("src")).toBe("https://example.test/v2.png");
    expect(v.props.onApplyPending).not.toHaveBeenCalled();
  });

  test("a failure shows the message in an Alert with Try again, never throws", async () => {
    const onRunOperation = mock(async () => {
      throw new Error("The background tool is busy. Try again in a minute.");
    });
    const v = setup({ onRunOperation: onRunOperation as never });
    fireEvent.click(tool(v, "Remove BG"));
    const alert = await v.findByRole("alert");
    expect(alert.textContent).toContain("The background tool is busy. Try again in a minute.");
    fireEvent.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(onRunOperation).toHaveBeenCalledTimes(2));
  });

  test("a non-Error rejection still gets a plain message", async () => {
    const onRunOperation = mock(async () => {
      throw "boom";
    });
    const v = setup({ onRunOperation: onRunOperation as never });
    fireEvent.click(tool(v, "Remove BG"));
    expect((await v.findByRole("alert")).textContent).toContain("Something went wrong. Try again.");
  });

  test("the sub-bar button runs it again", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Undo preview" }));
    fireEvent.click(v.getByRole("button", { name: "Undo preview" }));
    fireEvent.click(v.getByRole("button", { name: "Remove background" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(2));
  });
});

describe("erase", () => {
  test("Erase is disabled until a stroke exists, then sends a PNG mask and previews", async () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Erase"));
    const erase = v.getByRole("button", { name: "Erase" });
    expect(erase).toBeDisabled();
    drag(v.container.querySelector("canvas")!, [30, 20], [60, 40]);
    expect(erase).not.toBeDisabled();
    fireEvent.click(erase);
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    const op = v.props.onRunOperation.mock.calls[0]![0] as ImageEditorOperation;
    expect(op.operation).toBe("erase");
    if (op.operation === "erase") {
      expect(op.mask).toBeInstanceOf(Blob);
      expect(op.mask.type).toBe("image/png");
    }
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    expect(v.getByText(/Preview: Object erased/)).toBeTruthy();
    fireEvent.click(v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(v.props.onApplyPending.mock.calls[0]![1]).toBe("Object erased"));
  });

  test("the painted area is not drawn over the preview, and comes back when the preview is undone", async () => {
    layOutCanvas();
    const drawn: string[] = [];
    const ctx = new Proxy({}, { get: (_t, name) => (...args: unknown[]) => { if (name === "clearRect") drawn.length = 0; else drawn.push(String(name)); return args[0]; }, set: () => true }) as unknown as CanvasRenderingContext2D;
    HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
    const paintCalls = () => drawn.filter((call) => ["fill", "stroke", "arc", "lineTo", "quadraticCurveTo"].includes(call)).length;
    const v = setup();
    fireEvent.click(tool(v, "Erase"));
    drag(v.container.querySelector("canvas")!, [30, 20], [60, 40]);
    await waitFor(() => expect(paintCalls()).toBeGreaterThan(0));
    fireEvent.click(v.getByRole("button", { name: "Erase" }));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(paintCalls()).toBe(0));
    fireEvent.click(v.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(paintCalls()).toBeGreaterThan(0));
  });

  test("[ and ] change the brush by 10 percent and the slider follows", () => {
    const v = setup();
    fireEvent.click(tool(v, "Erase"));
    const size = () => v.container.querySelector('[data-slot="image-editor-brush-size"]')!.textContent;
    expect(size()).toBe("40 px");
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "]" });
    expect(size()).toBe("44 px");
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "[" });
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "[" });
    expect(size()).toBe("36 px");
    expect(v.getByRole("slider", { name: "Brush size" }).getAttribute("aria-valuenow")).toBe("36");
  });

  test("[ and ] do nothing outside the erase tool", () => {
    const v = setup();
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "]" });
    expect(v.container.querySelector('[data-slot="image-editor-brush-size"]')).toBeNull();
  });
});

describe("resize", () => {
  const openResize = () => {
    const v = setup();
    fireEvent.click(tool(v, "Resize"));
    return v;
  };

  test("starts at the picture's size; the lock links the other side", () => {
    const v = openResize();
    const w = v.getByLabelText("Width") as HTMLInputElement;
    const h = v.getByLabelText("Height") as HTMLInputElement;
    expect([w.value, h.value]).toEqual(["1200", "800"]);
    fireEvent.change(w, { target: { value: "600" } });
    expect(h.value).toBe("400");
    fireEvent.click(v.getByRole("button", { name: "Keep proportions" }));
    fireEvent.change(w, { target: { value: "300" } });
    expect(h.value).toBe("400");
  });

  test("Resize runs the resize op with the label", async () => {
    const v = openResize();
    fireEvent.change(v.getByLabelText("Width"), { target: { value: "600" } });
    fireEvent.click(v.getByRole("button", { name: "Resize" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(v.props.onRunOperation.mock.calls[0]![0]).toEqual({ operation: "resize", width: 600, height: 400 });
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.click(v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(v.props.onApplyPending.mock.calls[0]![1]).toBe("Resized to 600 x 400"));
  });

  test("percent mode converts and runs in pixels", async () => {
    const v = openResize();
    fireEvent.click(v.getByRole("radio", { name: "Percent" }));
    expect((v.getByLabelText("Width") as HTMLInputElement).value).toBe("100");
    fireEvent.change(v.getByLabelText("Width"), { target: { value: "50" } });
    expect((v.getByLabelText("Height") as HTMLInputElement).value).toBe("50");
    fireEvent.click(v.getByRole("button", { name: "Resize" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(v.props.onRunOperation.mock.calls[0]![0]).toEqual({ operation: "resize", width: 600, height: 400 });
  });

  test("invalid sizes show a plain error and disable Resize", () => {
    const v = openResize();
    const resize = v.getByRole("button", { name: "Resize" });
    expect(resize).toBeDisabled();
    fireEvent.click(v.getByRole("button", { name: "Keep proportions" }));
    fireEvent.change(v.getByLabelText("Width"), { target: { value: "9000" } });
    expect(v.getByText("Each side can be at most 8000 pixels.")).toBeTruthy();
    expect(resize).toBeDisabled();
    fireEvent.change(v.getByLabelText("Width"), { target: { value: "1.5" } });
    expect(v.getByText("Width and height must be whole numbers above zero.")).toBeTruthy();
    fireEvent.change(v.getByLabelText("Width"), { target: { value: "" } });
    expect(resize).toBeDisabled();
  });

  test("Upscale 2x and 4x run the upscale op and show the hint", async () => {
    const v = openResize();
    expect(v.getByText("Upscaling adds detail the picture did not have; faces may change.")).toBeTruthy();
    fireEvent.click(v.getByRole("button", { name: "Upscale 4x" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(v.props.onRunOperation.mock.calls[0]![0]).toEqual({ operation: "upscale", scale: 4 });
    await waitFor(() => v.getByRole("button", { name: "Undo preview" }));
    expect(v.getByText(/Preview: Upscaled 4x/)).toBeTruthy();
  });
});

describe("comment", () => {
  test("a click on the picture opens the box, Send calls onComment and the reply stays in an Alert", async () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Comment"));
    const canvas = v.container.querySelector("canvas")!;
    drag(canvas, [60, 40], [60, 40]);
    const box = v.getByRole("textbox", { name: "Describe the change" });
    const send = v.getByRole("button", { name: "Send" });
    expect(send).toBeDisabled();
    fireEvent.change(box, { target: { value: "Make the sky pinker" } });
    fireEvent.click(send);
    await waitFor(() => expect(v.props.onComment).toHaveBeenCalledTimes(1));
    expect(v.props.onComment.mock.calls[0]![0]).toEqual({
      prompt: "Make the sky pinker",
      region: { x: 0.5, y: 0.5, width: 0, height: 0 },
    });
    expect((await v.findByText("I can do that.")).closest('[data-slot="alert"]')).not.toBeNull();
    expect(v.container.querySelectorAll('[data-slot="badge"]').length).toBeGreaterThan(0);
  });

  test("a dragged box sends a normalised rectangle", async () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Comment"));
    drag(v.container.querySelector("canvas")!, [30, 20], [90, 60]);
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "Remove this" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(v.props.onComment).toHaveBeenCalledTimes(1));
    expect(v.props.onComment.mock.calls[0]![0]).toEqual({
      prompt: "Remove this",
      region: { x: 0.25, y: 0.25, width: 0.5, height: 0.5 },
    });
  });

  test("Whole picture comments with a null region", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("button", { name: "Whole picture" }));
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "Warmer colours" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(v.props.onComment).toHaveBeenCalledTimes(1));
    expect(v.props.onComment.mock.calls[0]![0]).toEqual({ prompt: "Warmer colours", region: null });
  });

  test("a comment that returns a picture shows it as a preview with Apply, and the run reports progress", async () => {
    const onComment = mock(async (_request: unknown, ctl: { onProgress: (p: { percent: number | null; label: string }) => void }) => {
      ctl.onProgress({ percent: 40, label: "Drawing" });
      return { message: "Here is the change.", pending: { token: "t1", previewUrl: "data:image/png;base64,iVBORw0KGgo=", width: 200, height: 120 } };
    });
    const v = setup({ onComment: onComment as never });
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("button", { name: "Whole picture" }));
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "Make it evening" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(v.getByRole("button", { name: "Apply" })).toBeTruthy());
    expect(v.getByText(/Preview: Changed as described/)).toBeTruthy();
    expect(onComment.mock.calls[0]![1]).toBeDefined();
  });

  test("Esc cancels the box, then leaves the tool", () => {
    const v = setup();
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("button", { name: "Whole picture" }));
    const stage = v.getByRole("region", { name: "Picture stage" });
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(v.queryByRole("textbox", { name: "Describe the change" })).toBeNull();
    expect(tool(v, "Comment").getAttribute("aria-checked")).toBe("true");
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(tool(v, "Comment").getAttribute("aria-checked")).toBe("false");
    expect(v.props.onClose).not.toHaveBeenCalled();
  });

  test("a failed comment shows the error with Try again", async () => {
    const onComment = mock(async () => {
      throw new Error("Could not reach the assistant.");
    });
    const v = setup({ onComment: onComment as never });
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("button", { name: "Whole picture" }));
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "x" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    expect((await v.findByRole("alert")).textContent).toContain("Could not reach the assistant.");
  });
});

describe("history and keys", () => {
  test("Undo and Redo step through versions in array order and stop at the ends", () => {
    const v = setup();
    fireEvent.click(v.getByRole("button", { name: "Undo" }));
    expect(v.props.onSelectVersion).toHaveBeenLastCalledWith("v1");
    fireEvent.click(v.getByRole("button", { name: "Redo" }));
    expect(v.props.onSelectVersion).toHaveBeenLastCalledWith("v3");
  });

  test("Undo is disabled on the first version, Redo on the last", () => {
    const first = setup({ currentVersionId: "v1" });
    expect(first.getByRole("button", { name: "Undo" })).toBeDisabled();
    expect(first.getByRole("button", { name: "Redo" })).not.toBeDisabled();
    cleanup();
    const last = setup({ currentVersionId: "v3" });
    expect(last.getByRole("button", { name: "Redo" })).toBeDisabled();
    expect(last.getByRole("button", { name: "Undo" })).not.toBeDisabled();
  });

  test("Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z and Ctrl+Y follow the same rules", () => {
    const v = setup();
    const stage = v.getByRole("region", { name: "Picture stage" });
    fireEvent.keyDown(stage, { key: "z", metaKey: true });
    expect(v.props.onSelectVersion).toHaveBeenLastCalledWith("v1");
    fireEvent.keyDown(stage, { key: "z", ctrlKey: true, shiftKey: true });
    expect(v.props.onSelectVersion).toHaveBeenLastCalledWith("v3");
    fireEvent.keyDown(stage, { key: "y", ctrlKey: true });
    expect(v.props.onSelectVersion).toHaveBeenCalledTimes(2 + 1);
  });

  test("inside a tool with strokes, Undo takes the stroke first and versions stay put", () => {
    layOutCanvas();
    const v = setup();
    fireEvent.click(tool(v, "Markup"));
    drag(v.container.querySelector("canvas")!, [10, 10], [50, 30]);
    fireEvent.click(v.getByRole("button", { name: "Undo" }));
    expect(v.props.onSelectVersion).not.toHaveBeenCalled();
    expect(v.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "z", metaKey: true, shiftKey: true });
    expect(v.getByRole("button", { name: "Save" })).not.toBeDisabled();
    expect(v.props.onSelectVersion).not.toHaveBeenCalled();
  });

  test("typing in a field leaves Cmd+Z to the field", () => {
    const v = setup();
    fireEvent.click(tool(v, "Resize"));
    fireEvent.keyDown(v.getByLabelText("Width"), { key: "z", metaKey: true });
    expect(v.props.onSelectVersion).not.toHaveBeenCalled();
  });

  test("Esc leaves the tool first, then closes", () => {
    const v = setup();
    const stage = v.getByRole("region", { name: "Picture stage" });
    fireEvent.click(tool(v, "Erase"));
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(tool(v, "Erase").getAttribute("aria-checked")).toBe("false");
    expect(v.props.onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(stage, { key: "Escape" });
    expect(v.props.onClose).toHaveBeenCalledTimes(1);
  });

  test("Esc discards a preview before leaving the tool", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.keyDown(v.getByRole("region", { name: "Picture stage" }), { key: "Escape" });
    await waitFor(() => expect(v.queryByRole("button", { name: "Apply" })).toBeNull());
    expect(tool(v, "Remove BG").getAttribute("aria-checked")).toBe("true");
  });

  test("Close editor calls onClose", () => {
    const v = setup();
    fireEvent.click(v.getByRole("button", { name: "Close editor" }));
    expect(v.props.onClose).toHaveBeenCalledTimes(1);
  });

  test("a different current version clears pending work", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    v.view.rerender(<ImageEditor {...v.props} currentVersionId="v3" />);
    expect(v.queryByRole("button", { name: "Apply" })).toBeNull();
    expect(v.getByRole("img", { name: "Sunset" }).getAttribute("src")).toBe("https://example.test/v3.png");
  });
});

describe("versions popover", () => {
  test("lists every version and selects one", () => {
    const v = setup();
    fireEvent.click(v.getByRole("button", { name: "Versions" }));
    const list = within(document.body).getByRole("list", { name: "Versions" });
    const items = within(list).getAllByRole("button");
    expect(items).toHaveLength(3);
    expect(items[0]!.textContent).toContain("Original");
    expect(items[1]!.getAttribute("aria-current")).toBe("true");
    expect(items[0]!.querySelector("img")!.getAttribute("src")).toBe("https://example.test/v1.png");
    fireEvent.click(items[2]!);
    expect(v.props.onSelectVersion).toHaveBeenCalledWith("v3");
  });
});
