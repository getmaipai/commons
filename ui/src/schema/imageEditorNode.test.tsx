// IMG-STUDIO-01: the image_editor node. Reads one picture row (and its versions), a locked row is one tile with nothing else read, the Element's
// requests become handler calls with the documented argument names, Apply writes a new version, and the operations list comes from a binding.
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithQueryClient } from "../../tests/renderWithQueryClient";
import { stubMatchMedia } from "../../tests/stubMatchMedia";
import { NodeRenderer } from "@/kit/schema/NodeRenderer";
import { PackageScopeContext } from "@/kit/schema/packageScope";
import { MediaHostContext, type MediaHost } from "@/kit/schema/mediaHost";
import { fitHeightOf } from "@/kit/schema/ImageEditorNodeView";
import { ImageEditorNodeSchema, type UiNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;
let calls: { url: string; body: Row }[] = [];
let picture: Row;
let applyLocked = false;
const originalFetch = globalThis.fetch;
const realMatchMedia = window.matchMedia;
const originalCanvas = { getContext: HTMLCanvasElement.prototype.getContext, toBlob: HTMLCanvasElement.prototype.toBlob, Image: globalThis.Image };

const pictureRow = (extra: Row = {}): Row => ({
  id: "lib-1", title: "Beach.png", url: "/files/lib-1.png", width: 1200, height: 800, locked: false,
  versions: [{ id: "lib-1", url: "/files/lib-1.png", label: "Original", width: 1200, height: 800 }, { id: "lib-2", url: "/files/lib-2.png", label: "Cropped", width: 600, height: 400 }],
  ...extra,
});

beforeEach(() => {
  stubMatchMedia({});
  calls = [];
  picture = pictureRow();
  applyLocked = false;
  HTMLCanvasElement.prototype.getContext = (() => new Proxy({}, { get: () => () => {}, set: () => true })) as never;
  HTMLCanvasElement.prototype.toBlob = ((cb: (b: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" }))) as never;
  globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const body = init?.body ? (JSON.parse(String(init.body)) as Row) : {};
    calls.push({ url, body });
    const json = (value: unknown) => Promise.resolve(new Response(JSON.stringify(value), { status: 200 }));
    if (url.endsWith("/data/picture")) return json([picture]);
    if (url.endsWith("/data/operations")) return json([{ id: "blur_background", label: "Blur background", summary: "Blur the background.", controls: [{ kind: "number", name: "radius", label: "Blur", min: 1, max: 40, default: 12 }], enabled: true }, { id: "expand", label: "Expand canvas", enabled: false, reason: "Not ready yet." }, { id: "clearer", label: "Make clearer", summary: "Make it clearer.", controls: [{ kind: "choice", name: "level", label: "Level", options: ["quick", "best"] }], levels: [{ id: "quick", label: "Quick", summary: "Fast.", eta: "seconds", enabled: true }, { id: "best", label: "Best", summary: "Careful.", eta: "minutes", enabled: false, reason: "Needs an extra download." }], enabled: true }]);
    if (url.endsWith("/actions/run")) return json({ token: "tok-1", preview_url: "/files/preview.png", width: 600, height: 400 });
    if (url.endsWith("/actions/apply") && applyLocked) return json({ id: "lib-3", url: "/files/lib-3.png", label: body.label, width: 600, height: 400, locked: true });
    if (url.endsWith("/actions/apply")) return json({ id: "lib-3", url: "/files/lib-3.png", label: body.label, width: 600, height: 400 });
    return Promise.resolve(new Response("{}", { status: 200 }));
  }) as unknown as typeof fetch;
});
afterEach(() => {
  cleanup();
  globalThis.fetch = originalFetch;
  window.matchMedia = realMatchMedia;
  HTMLCanvasElement.prototype.getContext = originalCanvas.getContext;
  HTMLCanvasElement.prototype.toBlob = originalCanvas.toBlob;
});

const node = ImageEditorNodeSchema.parse({
  type: "image_editor",
  bind: { source: "package", path: "picture", params: { id: "$state.file" } },
  operations: { bind: { source: "package", path: "operations" } },
  handlers: { run: { call: { target: "/api/plugins/images/actions/run", args: { file: "{file}", operation: "{operation}", args: "{args}" } } }, apply: { call: { target: "/api/plugins/images/actions/apply", args: { file: "{file}", token: "{token}", label: "{label}" } } } },
  tool_reasons: { erase: "Erase is not ready yet." },
}) as unknown as UiNode;

function Harness({ n = node, host = null, file = "lib-1" }: { n?: UiNode; host?: Partial<MediaHost> | null; file?: string }) {
  const page = (
    <PackageScopeContext.Provider value={{ packageId: "images" }}>
      <NodeRenderer node={n} state={{ file }} />
    </PackageScopeContext.Provider>
  );
  return <MemoryRouter>{host ? <MediaHostContext.Provider value={host as MediaHost}>{page}</MediaHostContext.Provider> : page}</MemoryRouter>;
}

describe("image_editor node", () => {
  test("reads the picture by the Library file id in page state and opens the newest version", async () => {
    const { container, findByRole } = renderWithQueryClient(<Harness />);
    await findByRole("region", { name: "Picture stage" });
    expect(calls.find((c) => c.url.endsWith("/data/picture"))!.body).toEqual({ id: "lib-1" });
    expect(container.querySelector("[data-slot=image-editor-picture] img")!.getAttribute("src")).toBe("/files/lib-2.png");
  });

  test("the schema is strict and its defaults are on", () => {
    const parsed = ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "p" } });
    expect(parsed.compare).toBe(true);
    expect(parsed.comment_brush).toBe(true);
    expect(() => ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "p" }, initial_tool: "draw" })).toThrow();
    expect(() => ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "p" }, handlers: { delete: { call: { target: "/x" } } } })).toThrow();
  });

  test("a locked row is ONE lock tile and no picture is requested", async () => {
    picture = pictureRow({ locked: true, title: "Zorblax Nightshade", url: "/zorblax.png" });
    const { container, findByRole } = renderWithQueryClient(<Harness />);
    expect(await findByRole("button", { name: "Locked items. Press to enter your passcode." })).toBeTruthy();
    expect(container.textContent).toBe("Locked items");
    expect(document.body.innerHTML).not.toContain("Zorblax");
    expect(container.querySelector("img")).toBeNull();
  });

  test("a tool with a reason is disabled and a tool with no handler says so; the tool stays", async () => {
    const { findByRole, getByText } = renderWithQueryClient(<Harness />);
    const erase = await findByRole("radio", { name: "Erase" });
    expect(erase.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(erase);
    expect(getByText("Erase is not ready yet.")).toBeTruthy();
    const markup = await findByRole("radio", { name: "Markup" });
    fireEvent.click(markup);
    expect(getByText("Not set up yet.")).toBeTruthy();
  });

  test("a crop request becomes a run call with the documented names, and Apply writes a new version that is then shown", async () => {
    const { container, findByRole, getByRole } = renderWithQueryClient(<Harness />);
    fireEvent.click(await findByRole("radio", { name: "Crop" }));
    fireEvent.click(getByRole("radio", { name: "1:1" }));
    fireEvent.click(getByRole("button", { name: "Flip vertical" }));
    fireEvent.click(getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/run"))).toBe(true));
    const run = calls.find((c) => c.url.endsWith("/actions/run"))!.body;
    expect(run.file).toBe("lib-2");
    expect(run.operation).toBe("crop");
    expect(run.args).toMatchObject({ aspect: "1:1", rotate: 0, flip_horizontal: false, flip_vertical: true, height: 1 });
    await waitFor(() => getByRole("button", { name: "Apply" }));
    fireEvent.click(getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/apply"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/apply"))!.body).toMatchObject({ file: "lib-1", token: "tok-1" });
    await waitFor(() => expect(container.querySelector("[data-slot=image-editor-picture] img")!.getAttribute("src")).toBe("/files/lib-3.png"));
  });

  test("the operations list comes from its binding, runs by id and keeps a disabled row with its reason", async () => {
    const { findByRole, getByRole, getByText } = renderWithQueryClient(<Harness />);
    fireEvent.click(await findByRole("radio", { name: "More" }));
    fireEvent.click(getByRole("button", { name: "Expand canvas" }));
    expect(getByText("Not ready yet.")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Blur background" }));
    fireEvent.click(getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/run"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/run"))!.body).toMatchObject({ operation: "blur_background", args: { radius: 12 } });
  });

  test("a row with levels reaches the editor: each level is drawn, an off one with its reason, and the run carries the chosen level (MAKE-CLEARER-01)", async () => {
    const { findByRole } = renderWithQueryClient(<Harness />);
    const getByRole = within(document.body).getByRole;
    fireEvent.click(await findByRole("radio", { name: "More" }));
    fireEvent.click(getByRole("button", { name: "Make clearer" }));
    expect(document.querySelector("[data-level=best]")!.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(document.querySelector("[data-level=best]")!);
    expect(document.querySelector("[data-slot=image-editor-level-line]")!.textContent).toBe("Needs an extra download.");
    fireEvent.click(document.querySelector("[data-level=quick]")!);
    fireEvent.click(getByRole("button", { name: "Preview" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/run"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/run"))!.body).toMatchObject({ operation: "clearer", args: { level: "quick" } });
  });

  test("a node with no operations binding draws no More tool, and tools can be limited", async () => {
    const limited = ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "picture" }, tools: ["crop", "resize"], handlers: { run: { call: { target: "/api/plugins/images/actions/run" } } } }) as unknown as UiNode;
    const { findByRole, queryByRole } = renderWithQueryClient(<Harness n={limited} />);
    await findByRole("radio", { name: "Crop" });
    expect(queryByRole("radio", { name: "Adjust" })).toBeNull();
    expect(queryByRole("radio", { name: "More" })).toBeNull();
    expect((await findByRole("radio", { name: "Markup" })).getAttribute("aria-disabled")).toBe("true");
  });

  test("initial_tool opens that tool", async () => {
    const adjust = ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "picture" }, initial_tool: "adjust", handlers: { run: { call: { target: "/api/plugins/images/actions/run" } } } }) as unknown as UiNode;
    const { findByRole } = renderWithQueryClient(<Harness n={adjust} />);
    expect(await findByRole("slider", { name: "Brightness" })).toBeTruthy();
  });

  test("an Apply saved behind the person's lock keeps the picture on screen, says so in one line, and never shows the locked version", async () => {
    applyLocked = true;
    const { container, findByRole, getByRole, getByText } = renderWithQueryClient(<Harness />);
    fireEvent.click(await findByRole("radio", { name: "Crop" }));
    fireEvent.click(getByRole("radio", { name: "1:1" }));
    fireEvent.click(getByRole("button", { name: "Preview" }));
    await waitFor(() => getByRole("button", { name: "Apply" }));
    fireEvent.click(getByRole("button", { name: "Apply" }));
    await waitFor(() => getByText("Saved to your Library behind your Adult lock. Unlock it there to keep editing it."));
    expect(container.querySelector("[data-slot=image-editor-picture] img")!.getAttribute("src")).toBe("/files/lib-2.png");
    expect(container.innerHTML).not.toContain("lib-3.png");
  });

  test("a placeholder row draws the page's empty state with both actions, and no picture", async () => {
    const empty = ImageEditorNodeSchema.parse({
      type: "image_editor",
      bind: { source: "package", path: "picture" },
      hide_when_empty: true,
      empty_state: { type: "empty_state", icon: "image", text: "No pictures yet.", action: { navigate: { to: "/create" } }, action_label: "Make a picture", secondary_action: { navigate: { to: "/files" } }, secondary_action_label: "Upload a picture" },
    }) as unknown as UiNode;
    picture = { id: "", empty: true };
    const { container, findByRole, getByText } = renderWithQueryClient(<Harness n={empty} />);
    expect(await findByRole("button", { name: "Make a picture" })).toBeTruthy();
    expect(getByText("No pictures yet.")).toBeTruthy();
    expect(await findByRole("button", { name: "Upload a picture" })).toBeTruthy();
    expect(container.querySelector("[data-slot=image-editor]")).toBeNull();
  });

  test("hide_when_empty draws nothing when the bound data has no row, and the default line otherwise", async () => {
    const hidden = ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "picture" }, hide_when_empty: true }) as unknown as UiNode;
    const shown = ImageEditorNodeSchema.parse({ type: "image_editor", bind: { source: "package", path: "picture" } }) as unknown as UiNode;
    const orig = globalThis.fetch;
    globalThis.fetch = mock(() => Promise.resolve(new Response("[]", { status: 200 }))) as unknown as typeof fetch;
    const first = renderWithQueryClient(<Harness n={hidden} />);
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 30));
    expect(first.container.textContent).toBe("");
    cleanup();
    const second = renderWithQueryClient(<Harness n={shown} />);
    await waitFor(() => expect(second.container.textContent).toContain("Pick a picture to open it in the Studio."));
    globalThis.fetch = orig;
  });
});

describe("image_editor node: Add a picture, reference picture, tools not ready (Studio gaps)", () => {
  const addNode = (extra: Row = {}) => ImageEditorNodeSchema.parse({
    type: "image_editor",
    bind: { source: "package", path: "picture", params: { id: "$state.file" } },
    hide_when_empty: true,
    add_picture: { action: { call: { target: "/api/plugins/images/actions/opened", args: { picked: "{id}" } } } },
    empty_state: { type: "empty_state", icon: "image", text: "No pictures yet.", action: { navigate: { to: "/create" } }, action_label: "Make a picture" },
    ...extra,
  }) as unknown as UiNode;

  /** The page's picker has pictures and none is open: the bound data has no row. */
  const noRow = () => {
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, body: init?.body ? (JSON.parse(String(init.body)) as Row) : {} });
      return Promise.resolve(new Response(url.endsWith("/data/picture") ? "[]" : "{}", { status: 200 }));
    }) as unknown as typeof fetch;
  };

  test("with pictures to pick from, Add a picture sits under the picker, opens the host's picker and hands the chosen id to the page's action", async () => {
    noRow();
    const pickMedia = mock(() => Promise.resolve({ id: "up-9" }));
    const { findByRole } = renderWithQueryClient(<Harness n={addNode()} host={{ pickMedia }} />);
    fireEvent.click(await findByRole("button", { name: "Add a picture" }));
    expect(pickMedia).toHaveBeenCalledWith("picture");
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/opened"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/opened"))!.body).toMatchObject({ picked: "up-9" });
  });

  test("a closed picker starts nothing; a host with no picker draws the control disabled with its reason", async () => {
    noRow();
    const pickMedia = mock(() => Promise.resolve(null));
    const first = renderWithQueryClient(<Harness n={addNode()} host={{ pickMedia }} />);
    fireEvent.click(await first.findByRole("button", { name: "Add a picture" }));
    await new Promise((r) => setTimeout(r, 20));
    expect(calls.some((c) => c.url.endsWith("/actions/opened"))).toBe(false);
    cleanup();
    const second = renderWithQueryClient(<Harness n={addNode()} />);
    const button = await second.findByRole("button", { name: "Add a picture" });
    expect(button.hasAttribute("disabled")).toBe(true);
    expect(second.getByText("Adding a picture is not available on this screen.")).toBeTruthy();
  });

  test("the empty state's main action is Add a picture and the page's own action is second", async () => {
    picture = { id: "", empty: true };
    const { findByRole } = renderWithQueryClient(<Harness n={addNode()} host={{ pickMedia: () => Promise.resolve(null) }} />);
    expect(await findByRole("button", { name: "Add a picture" })).toBeTruthy();
    expect(await findByRole("button", { name: "Make a picture" })).toBeTruthy();
  });

  test("Add a reference picture opens the host's picker, then asks pick_reference with the file and the chosen id, and the answer rides on the comment", async () => {
    const n = ImageEditorNodeSchema.parse({
      type: "image_editor",
      bind: { source: "package", path: "picture", params: { id: "$state.file" } },
      handlers: {
        comment: { call: { target: "/api/plugins/images/actions/comment", args: { file: "{file}", prompt: "{prompt}", reference: "{reference}" } } },
        pick_reference: { call: { target: "/api/plugins/images/actions/ref", args: { file: "{file}", ref: "{ref}" } } },
      },
    }) as unknown as UiNode;
    const baseFetch = globalThis.fetch;
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/actions/ref")) { calls.push({ url, body: JSON.parse(String(init?.body)) as Row }); return Promise.resolve(new Response(JSON.stringify({ id: "lib-7", label: "Dog.png" }), { status: 200 })); }
      if (url.endsWith("/actions/comment")) { calls.push({ url, body: JSON.parse(String(init?.body)) as Row }); return Promise.resolve(new Response(JSON.stringify({ message: "Here is the change." }), { status: 200 })); }
      return baseFetch(input, init);
    }) as unknown as typeof fetch;
    const pickMedia = mock(() => Promise.resolve({ id: "lib-7" }));
    const { findByRole, getByRole, getByLabelText, getByText } = renderWithQueryClient(<Harness n={n} host={{ pickMedia }} />);
    fireEvent.click(await findByRole("radio", { name: "Comment" }));
    fireEvent.click(getByRole("button", { name: "Whole picture" }));
    fireEvent.click(getByRole("button", { name: "Add a reference picture" }));
    await waitFor(() => expect(getByText("Dog.png")).toBeTruthy());
    expect(pickMedia).toHaveBeenCalledWith("picture");
    expect(calls.find((c) => c.url.endsWith("/actions/ref"))!.body).toMatchObject({ file: "lib-2", ref: "lib-7" });
    fireEvent.change(getByLabelText("Describe the change", { selector: "textarea" }), { target: { value: "Add the dog" } });
    fireEvent.click(getByRole("button", { name: "Send" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/comment"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/comment"))!.body).toMatchObject({ reference: { id: "lib-7", label: "Dog.png" } });
  });

  test("a hand-off runs its action with the version on screen as {file}, and nothing else", async () => {
    const n = ImageEditorNodeSchema.parse({
      type: "image_editor",
      bind: { source: "package", path: "picture", params: { id: "$state.file" } },
      actions: [{ label: "Make a video from this", action: { call: { target: "/api/plugins/images/actions/handoff", args: { picture: "{file}" } } } }],
    }) as unknown as UiNode;
    const { findByRole } = renderWithQueryClient(<Harness n={n} />);
    fireEvent.click(await findByRole("button", { name: "Make a video from this" }));
    await waitFor(() => expect(calls.some((c) => c.url.endsWith("/actions/handoff"))).toBe(true));
    expect(calls.find((c) => c.url.endsWith("/actions/handoff"))!.body).toMatchObject({ picture: "lib-2" });
    expect(calls.filter((c) => c.url.includes("/actions/")).length).toBe(1);
  });

  test("a hand_off goes through the host with the version on screen; with no host hand-off the button stays, looks off and says why", async () => {
    const n = ImageEditorNodeSchema.parse({
      type: "image_editor",
      bind: { source: "package", path: "picture", params: { id: "$state.file" } },
      actions: [{ label: "Make a video from this", hand_off: "video_create" }],
    }) as unknown as UiNode;
    const handOff = mock((_to: string, _item: { file: string }) => {});
    const first = renderWithQueryClient(<Harness n={n} host={{ handOff }} />);
    fireEvent.click(await first.findByRole("button", { name: "Make a video from this" }));
    expect(handOff).toHaveBeenCalledWith("video_create", { file: "lib-2" });
    expect(calls.filter((c) => c.url.includes("/actions/")).length).toBe(0);
    cleanup();
    const second = renderWithQueryClient(<Harness n={n} />);
    const off = await second.findByRole("button", { name: "Make a video from this" });
    expect(off.getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(off);
    expect(second.getByText("That is not available on this screen.")).toBeTruthy();
  });

  test("a row with a tool says that tool is not ready: it is drawn disabled before any click with one line of why, and it is not listed under More", async () => {
    const baseFetch = globalThis.fetch;
    globalThis.fetch = mock((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).endsWith("/data/operations")) return Promise.resolve(new Response(JSON.stringify([
        { id: "picture.remove_background", tool: "remove_background", enabled: false, reason: "Pictures are not ready yet. Try again in a minute." },
        { id: "picture.erase", tool: "erase", enabled: false, reason: "Pictures are not ready yet. Try again in a minute." },
        { id: "picture.crop", tool: "crop", enabled: true },
      ]), { status: 200 }));
      return baseFetch(input, init);
    }) as unknown as typeof fetch;
    const { findByRole, getByText, queryByRole } = renderWithQueryClient(<Harness />);
    const remove = await findByRole("radio", { name: "Remove BG" });
    await waitFor(() => expect(remove.getAttribute("aria-disabled")).toBe("true"));
    expect(getByText("Pictures are not ready yet. Try again in a minute.")).toBeTruthy();
    expect((await findByRole("radio", { name: "Crop" })).getAttribute("aria-disabled")).toBeNull();
    // Only rows with no `tool` are operations: with none left there is no More tool.
    expect(queryByRole("radio", { name: "More" })).toBeNull();
  });
});

describe("fitHeightOf: the editor fits the room its page gives it", () => {
  test("it is the scrolling area's height less the editor's top and the bottom padding kept for fixed bars", () => {
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    const inner = document.createElement("div");
    inner.style.paddingBottom = "86px";
    const el = document.createElement("div");
    inner.appendChild(el);
    scroller.appendChild(inner);
    document.body.appendChild(scroller);
    Object.defineProperty(scroller, "clientHeight", { value: 756, configurable: true });
    scroller.getBoundingClientRect = () => ({ top: 56, bottom: 812, left: 0, right: 375, width: 375, height: 756, x: 0, y: 56, toJSON() {} }) as DOMRect;
    el.getBoundingClientRect = () => ({ top: 70, bottom: 70, left: 0, right: 0, width: 0, height: 0, x: 0, y: 70, toJSON() {} }) as DOMRect;
    // 756 - (70 - 56) - 86 - 8 (kept free under the editor) = 648
    expect(fitHeightOf(el)).toBe(648);
    // Scrolling moves the editor up and the area's scrollTop down by the same amount: the answer does not change.
    scroller.scrollTop = 20;
    el.getBoundingClientRect = () => ({ top: 50, bottom: 50, left: 0, right: 0, width: 0, height: 0, x: 0, y: 50, toJSON() {} }) as DOMRect;
    expect(fitHeightOf(el)).toBe(648);
    // A tall screen is capped, and no room at all leaves the CSS height alone.
    Object.defineProperty(scroller, "clientHeight", { value: 2000, configurable: true });
    expect(fitHeightOf(el)).toBe(832);
    Object.defineProperty(scroller, "clientHeight", { value: 100, configurable: true });
    expect(fitHeightOf(el)).toBeNull();
    scroller.remove();
  });
});
