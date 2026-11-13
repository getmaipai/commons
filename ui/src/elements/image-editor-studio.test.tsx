// IMG-STUDIO-01: the Studio additions to ImageEditor: Crop, Adjust, Compare, the Comment brush and reference, the host's operations list.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor, within } from "@testing-library/react";
import {
  ImageEditor,
  type ImageEditorCommentRequest,
  type ImageEditorOperation,
  type ImageEditorPending,
  type ImageEditorProps,
  type ImageEditorRunControl,
  type ImageEditorVersion,
} from "./image-editor";

const versions: ImageEditorVersion[] = [
  { id: "v1", url: "https://example.test/v1.png", label: "Original", width: 1200, height: 800 },
  { id: "v2", url: "https://example.test/v2.png", label: "Edited", width: 1200, height: 800 },
];
const legacyTools = Object.fromEntries((["markup", "comment", "remove_background", "erase", "resize"] as const).map((k) => [k, { enabled: true }])) as ImageEditorProps["tools"];
const studioTools = { ...legacyTools, crop: { enabled: true }, adjust: { enabled: true } } as ImageEditorProps["tools"];
const pendingResult: ImageEditorPending = { token: "t1", previewUrl: "https://example.test/pending.png", width: 600, height: 400 };

function setup(overrides: Partial<ImageEditorProps> = {}) {
  const props = {
    title: "Sunset",
    versions,
    currentVersionId: "v2",
    onSelectVersion: mock((_id: string) => {}),
    tools: studioTools,
    onRunOperation: mock(async (_op: ImageEditorOperation, _ctl: ImageEditorRunControl) => pendingResult),
    onApplyPending: mock(async (_p: ImageEditorPending, _label: string) => ({ id: "v3", url: "https://example.test/v3.png", label: "New" })),
    onSaveMarkup: mock(async (_png: Blob) => ({ id: "v5", url: "https://example.test/v5.png", label: "Markup" })),
    onComment: mock(async (_r: ImageEditorCommentRequest) => ({ message: "Done." })),
    onClose: mock(() => {}),
    ...overrides,
  } as ImageEditorProps & { onRunOperation: ReturnType<typeof mock>; onComment: ReturnType<typeof mock>; onApplyPending: ReturnType<typeof mock> };
  const view = render(<ImageEditor {...props} />);
  return { props, container: view.container, ...within(view.container) };
}

const original = {
  getContext: HTMLCanvasElement.prototype.getContext,
  toBlob: HTMLCanvasElement.prototype.toBlob,
  rect: HTMLElement.prototype.getBoundingClientRect,
  Image: globalThis.Image,
};
beforeEach(() => {
  const ctx = new Proxy({}, { get: () => () => {}, set: () => true }) as unknown as CanvasRenderingContext2D;
  HTMLCanvasElement.prototype.getContext = (() => ctx) as never;
  HTMLCanvasElement.prototype.toBlob = ((cb: (b: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" }))) as never;
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
  globalThis.Image = original.Image;
});

const tool = (v: ReturnType<typeof setup>, name: string) => v.getByRole("radio", { name });
function layOut(w = 120, h = 80) {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const sized = this instanceof HTMLCanvasElement || this.dataset.slot === "image-editor-picture" || ["image-editor-compare", "image-editor-crop"].includes(this.dataset.slot ?? "");
    const width = sized ? w : 0;
    const height = sized ? h : 0;
    return { left: 0, top: 0, width, height, right: width, bottom: height, x: 0, y: 0, toJSON() {} } as DOMRect;
  };
}
function drag(el: Element, from: [number, number], to: [number, number], pointerId = 1) {
  fireEvent.pointerDown(el, { clientX: from[0], clientY: from[1], pointerId, button: 0 });
  fireEvent.pointerMove(el, { clientX: to[0], clientY: to[1], pointerId });
  fireEvent.pointerUp(el, { clientX: to[0], clientY: to[1], pointerId });
}
const lastOp = (v: ReturnType<typeof setup>) => v.props.onRunOperation.mock.calls.at(-1)![0] as ImageEditorOperation;

describe("the chat editor is unchanged", () => {
  test("without crop, adjust, operations or the new flags, none of the new controls is drawn", () => {
    const v = setup({ tools: legacyTools });
    expect(v.queryByRole("radio", { name: "Crop" })).toBeNull();
    expect(v.queryByRole("radio", { name: "Adjust" })).toBeNull();
    expect(v.queryByRole("radio", { name: "More" })).toBeNull();
    expect(v.queryByRole("button", { name: "Compare" })).toBeNull();
    fireEvent.click(tool(v, "Comment"));
    expect(v.queryByRole("radio", { name: "Brush" })).toBeNull();
  });
});

describe("crop", () => {
  test("the crop frame, the aspect presets and the turn and flip buttons are named", () => {
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    expect(v.getByRole("group", { name: /Crop frame/ })).toBeTruthy();
    for (const name of ["Free", "Original", "1:1", "4:5", "16:9", "9:16"]) expect(v.getByRole("radio", { name })).toBeTruthy();
    for (const name of ["Rotate left", "Rotate right", "Flip horizontal", "Flip vertical"]) expect(v.getByRole("button", { name })).toBeTruthy();
    expect(v.getByRole("button", { name: "Preview" })).toBeDisabled();
  });

  test("an aspect preset, a turn and a flip go out as one crop request, and the result is a preview to Apply", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    fireEvent.click(v.getByRole("radio", { name: "1:1" }));
    fireEvent.click(v.getByRole("button", { name: "Flip horizontal" }));
    fireEvent.click(v.getByRole("button", { name: "Rotate right" }));
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    const op = lastOp(v);
    expect(op.operation).toBe("crop");
    if (op.operation === "crop") {
      expect(op.rotate).toBe(90);
      expect(op.flipHorizontal).toBe(true);
      expect(op.flipVertical).toBe(false);
      expect(op.aspect).toBe("1:1");
      // the square is re-fitted to the turned 800 x 1200 frame
      expect(op.x).toBe(0);
      expect(op.y).toBeCloseTo(1 / 6);
      expect(op.width).toBe(1);
      expect(op.height).toBeCloseTo(2 / 3);
    }
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    expect(v.queryByRole("group", { name: /Crop frame/ })).toBeNull();
    fireEvent.click(v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(v.props.onApplyPending.mock.calls[0]![1]).toBe("Cropped to 800 x 800"));
  });

  test("a 1:1 preset on a 1200 x 800 picture is a centred two thirds square", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    fireEvent.click(v.getByRole("radio", { name: "1:1" }));
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    const op = lastOp(v);
    if (op.operation !== "crop") throw new Error("expected crop");
    expect(op.width).toBeCloseTo(800 / 1200);
    expect(op.height).toBe(1);
    expect(op.x).toBeCloseTo(1 / 6);
  });

  test("dragging a handle changes the rectangle that is sent", async () => {
    layOut();
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    const handle = v.container.querySelector("[data-handle=se]")!;
    drag(handle, [120, 80], [60, 40]);
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    const op = lastOp(v);
    if (op.operation !== "crop") throw new Error("expected crop");
    expect(op.width).toBeCloseTo(0.5);
    expect(op.height).toBeCloseTo(0.5);
  });

  test("arrow keys move the frame and [ ] turn the picture", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    const frame = v.getByRole("group", { name: /Crop frame/ });
    fireEvent.keyDown(frame, { key: "ArrowRight", shiftKey: true });
    expect(v.getByRole("button", { name: "Preview" })).toBeDisabled(); // at the limit already: nothing moved
    fireEvent.keyDown(frame, { key: "ArrowLeft", shiftKey: true });
    expect(v.getByRole("button", { name: "Preview" })).not.toBeDisabled();
    fireEvent.keyDown(v.container.querySelector("[data-slot=image-editor-stage]")!, { key: "]" });
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    const op = lastOp(v);
    if (op.operation !== "crop") throw new Error("expected crop");
    expect(op.rotate).toBe(90);
  });

  test("the rotate tooltips name their keys", () => {
    const v = setup();
    fireEvent.click(tool(v, "Crop"));
    expect(v.getByRole("button", { name: "Rotate left" }).getAttribute("aria-keyshortcuts")).toBe("[");
    expect(v.getByRole("button", { name: "Rotate right" }).getAttribute("aria-keyshortcuts")).toBe("]");
  });

  test("a disabled Crop stays and says why", () => {
    const v = setup({ tools: { ...studioTools, crop: { enabled: false, reason: "Crop is for your own pictures." } } });
    fireEvent.click(tool(v, "Crop"));
    expect(v.getByRole("status")).toBeTruthy();
    expect(v.getByText("Crop is for your own pictures.")).toBeTruthy();
    expect(v.queryByRole("group", { name: /Crop frame/ })).toBeNull();
  });
});

describe("adjust", () => {
  test("Auto sends auto tone with the four values at zero", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Adjust"));
    fireEvent.click(v.getByRole("button", { name: "Auto" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(lastOp(v)).toEqual({ operation: "adjust", brightness: 0, contrast: 0, saturation: 0, warmth: 0, auto: true });
  });

  test("a slider moves the live preview filter, Preview sends the values, Reset puts them back", async () => {
    const v = setup();
    fireEvent.click(tool(v, "Adjust"));
    expect(v.getByRole("button", { name: "Preview" })).toBeDisabled();
    const brightness = v.getByRole("slider", { name: "Brightness" });
    for (let i = 0; i < 5; i += 1) fireEvent.keyDown(brightness, { key: "ArrowRight" });
    expect(v.container.querySelector("[data-slot=image-editor-adjust-brightness]")!.textContent).toBe("5");
    const picture = v.container.querySelector("[data-slot=image-editor-picture] img") as HTMLImageElement;
    expect(picture.style.filter).toContain("brightness(1.05");
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(lastOp(v)).toEqual({ operation: "adjust", brightness: 5, contrast: 0, saturation: 0, warmth: 0, auto: false });
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.click(v.getByRole("button", { name: "Undo preview" }));
    // Discarding the preview brings the sliders' preview back; Reset zeroes them.
    fireEvent.click(v.getByRole("button", { name: "Reset" }));
    expect(v.container.querySelector("[data-slot=image-editor-adjust-brightness]")!.textContent).toBe("0");
  });

  test("the four sliders are brightness, contrast, saturation and warmth", () => {
    const v = setup();
    fireEvent.click(tool(v, "Adjust"));
    for (const name of ["Brightness", "Contrast", "Saturation", "Warmth"]) expect(v.getByRole("slider", { name })).toBeTruthy();
  });
});

describe("compare", () => {
  test("it is disabled on the original and says why, and a later version opens the divider", () => {
    const first = setup({ compare: true, currentVersionId: "v1" });
    expect(first.getByRole("button", { name: "Compare" })).toBeDisabled();
    cleanup();
    const v = setup({ compare: true });
    const toggle = v.getByRole("button", { name: "Compare" });
    expect(toggle).not.toBeDisabled();
    fireEvent.click(toggle);
    const slider = v.getByRole("slider", { name: "Before and after divider" });
    expect(slider.getAttribute("aria-valuenow")).toBe("50");
    const images = Array.from(v.container.querySelectorAll("[data-slot=image-editor-compare] img")).map((i) => i.getAttribute("src"));
    expect(images).toEqual(["https://example.test/v1.png", "https://example.test/v2.png"]);
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider.getAttribute("aria-valuenow")).toBe("52");
    fireEvent.keyDown(slider, { key: "End" });
    expect(slider.getAttribute("aria-valuenow")).toBe("100");
    fireEvent.keyDown(slider, { key: "Home" });
    expect(slider.getAttribute("aria-valuenow")).toBe("0");
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(toggle);
    expect(v.queryByRole("slider", { name: "Before and after divider" })).toBeNull();
  });

  test("dragging the divider places it where the pointer is", () => {
    layOut();
    const v = setup({ compare: true });
    fireEvent.click(v.getByRole("button", { name: "Compare" }));
    drag(v.container.querySelector("[data-slot=image-editor-compare]")!, [30, 10], [90, 10]);
    expect(v.getByRole("slider", { name: "Before and after divider" }).getAttribute("aria-valuenow")).toBe("75");
  });

  test("it compares a pending preview with the original, C toggles it from the stage, Escape closes it", async () => {
    const v = setup({ compare: true, currentVersionId: "v1" });
    fireEvent.click(tool(v, "Remove BG"));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    const stage = v.container.querySelector("[data-slot=image-editor-stage]")!;
    // a pending preview is something to compare with, even on the first version
    fireEvent.keyDown(stage, { key: "c" });
    expect(v.getByRole("slider", { name: "Before and after divider" })).toBeTruthy();
    fireEvent.keyDown(v.container.querySelector("[data-slot=image-editor]")!, { key: "Escape" });
    expect(v.queryByRole("slider", { name: "Before and after divider" })).toBeNull();
  });
});

describe("comment brush and reference", () => {
  test("Brush paints a mask, and the request carries the PNG mask and the reference picture", async () => {
    layOut();
    const pick = mock(async () => ({ id: "lib-9", label: "Beach.png" }));
    const v = setup({ commentBrush: true, onPickReference: pick });
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("radio", { name: "Brush" }));
    expect(v.getByRole("slider", { name: "Brush size" })).toBeTruthy();
    drag(v.container.querySelector("canvas")!, [30, 20], [60, 40]);
    const words = v.getByRole("textbox", { name: "Describe the change" });
    fireEvent.change(words, { target: { value: "Make it a beach" } });
    fireEvent.click(v.getByRole("button", { name: "Add a reference picture" }));
    await waitFor(() => v.getByText("Beach.png"));
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(v.props.onComment).toHaveBeenCalledTimes(1));
    const request = v.props.onComment.mock.calls[0]![0] as ImageEditorCommentRequest;
    expect(request.prompt).toBe("Make it a beach");
    expect(request.region).toBeNull();
    expect(request.mask).toBeInstanceOf(Blob);
    expect(request.mask!.type).toBe("image/png");
    expect(request.reference).toEqual({ id: "lib-9", label: "Beach.png" });
  });

  test("point mode still sends a region and no mask", async () => {
    layOut();
    const v = setup({ commentBrush: true });
    fireEvent.click(tool(v, "Comment"));
    drag(v.container.querySelector("canvas")!, [30, 20], [90, 60]);
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "Brighter sky" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => expect(v.props.onComment).toHaveBeenCalledTimes(1));
    const request = v.props.onComment.mock.calls[0]![0] as ImageEditorCommentRequest;
    expect(request.region).not.toBeNull();
    expect(request.mask).toBeUndefined();
    expect(request.reference).toBeUndefined();
  });

  test("a comment that returns a preview shows Apply, as before", async () => {
    const v = setup({ commentBrush: true, onComment: mock(async () => ({ message: "Done.", pending: pendingResult })) as never });
    fireEvent.click(tool(v, "Comment"));
    fireEvent.click(v.getByRole("button", { name: "Whole picture" }));
    fireEvent.change(v.getByRole("textbox", { name: "Describe the change" }), { target: { value: "Warmer" } });
    fireEvent.click(v.getByRole("button", { name: "Send" }));
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
  });
});

describe("the host's operations", () => {
  const operations = [
    { id: "blur_background", label: "Blur background", summary: "Blur everything behind the person.", controls: [{ kind: "number" as const, name: "radius", label: "Blur", min: 1, max: 40, default: 12 }], enabled: true },
    { id: "sharpen", label: "Sharpen", enabled: true },
    { id: "outpaint", label: "Expand canvas", enabled: false, reason: "Not available for this picture yet." },
  ];

  test("they are listed under More and nothing in the kit names them", () => {
    const v = setup({ operations });
    fireEvent.click(tool(v, "More"));
    for (const o of operations) expect(v.getByRole("button", { name: o.label })).toBeTruthy();
  });

  test("a one click operation runs as a custom operation by id", async () => {
    const v = setup({ operations });
    fireEvent.click(tool(v, "More"));
    fireEvent.click(v.getByRole("button", { name: "Sharpen" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(lastOp(v)).toEqual({ operation: "custom", id: "sharpen", args: {} });
    await waitFor(() => v.getByRole("button", { name: "Apply" }));
    fireEvent.click(v.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(v.props.onApplyPending.mock.calls[0]![1]).toBe("Sharpen"));
  });

  test("an operation with controls shows them first and sends their values", async () => {
    const v = setup({ operations });
    fireEvent.click(tool(v, "More"));
    fireEvent.click(v.getByRole("button", { name: "Blur background" }));
    expect(v.getByText("Blur everything behind the person.")).toBeTruthy();
    const blur = v.getByRole("slider", { name: "Blur" });
    expect(blur.getAttribute("aria-valuenow")).toBe("12");
    fireEvent.keyDown(blur, { key: "ArrowRight" });
    expect(v.props.onRunOperation).not.toHaveBeenCalled();
    fireEvent.click(v.getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(v.props.onRunOperation).toHaveBeenCalledTimes(1));
    expect(lastOp(v)).toEqual({ operation: "custom", id: "blur_background", args: { radius: 13 } });
  });

  test("a disabled operation stays, is marked disabled, says why, and does nothing", () => {
    const v = setup({ operations });
    fireEvent.click(tool(v, "More"));
    const button = v.getByRole("button", { name: "Expand canvas" });
    expect(button.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(button);
    expect(v.getByText("Not available for this picture yet.")).toBeTruthy();
    expect(v.props.onRunOperation).not.toHaveBeenCalled();
  });
});

describe("keyboard and tool opening", () => {
  test("Undo, Redo, Close and Zoom name their keys", () => {
    const v = setup();
    expect(v.getByRole("button", { name: "Undo" }).getAttribute("aria-keyshortcuts")).toBe("Control+Z");
    expect(v.getByRole("button", { name: "Redo" }).getAttribute("aria-keyshortcuts")).toBe("Control+Shift+Z");
    expect(v.getByRole("button", { name: "Close editor" }).getAttribute("aria-keyshortcuts")).toBe("Esc");
    expect(v.getByRole("button", { name: "Zoom in" }).getAttribute("aria-keyshortcuts")).toBe("+");
    expect(v.getByRole("button", { name: "Zoom out" }).getAttribute("aria-keyshortcuts")).toBe("-");
  });

  test("initialTool opens that tool, and ignores a disabled one", () => {
    const a = setup({ initialTool: "adjust" });
    expect(a.getByRole("slider", { name: "Brightness" })).toBeTruthy();
    cleanup();
    const b = setup({ initialTool: "crop", tools: { ...studioTools, crop: { enabled: false, reason: "no" } } });
    expect(b.queryByRole("group", { name: /Crop frame/ })).toBeNull();
  });
});
