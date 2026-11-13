import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { i18n } from "@/kit/i18n";
import { AsyncState } from "@/kit/primitives/AsyncState";
import { LockTile } from "@/kit/elements/adult-lock";
import { EmptyState } from "@/kit/primitives/EmptyState";
import {
  ImageEditor,
  type ImageEditorCommentRequest,
  type ImageEditorExtraOperation,
  type ImageEditorOperation,
  type ImageEditorPending,
  type ImageEditorProps,
  type ImageEditorReference,
  type ImageEditorToolState,
  type ImageEditorVersion,
} from "@/kit/elements/image-editor";
import { useBinding } from "@/kit/schema/binding";
import { useDispatchAction } from "@/kit/schema/actions";
import { readField } from "@/kit/schema/fieldPath";
import type { Action, FeedHandler, ImageEditorNode } from "@/kit/schema/types";

type Row = Record<string, unknown>;

const str = (v: unknown): string | undefined => (typeof v === "string" && v !== "" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : undefined);
const isRow = (v: unknown): v is Row => typeof v === "object" && v !== null && !Array.isArray(v);

const FIT_MAX_PX = 832;
/** Left free under the editor so its tool pill never touches a bar fixed to the bottom of the screen. */
const FIT_GAP_PX = 8;

/**
 * The height a page gives the editor: from where the editor starts to the bottom of the nearest scrolling area, less that area's (and its
 * inner boxes') bottom padding, which is where a page keeps room for fixed bars such as a phone's bottom navigation. Null until measured, or
 * when nothing can be measured (the CSS height then stands). Measured in the scrolling area's own coordinates so scrolling does not change it.
 */
export function fitHeightOf(el: HTMLElement): number | null {
  let pad = 0;
  let scroller: HTMLElement | null = null;
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    pad += Number.parseFloat(style.paddingBottom) || 0;
    if (/(auto|scroll)/.test(style.overflowY) && node.clientHeight > 0) {
      scroller = node;
      break;
    }
  }
  const rect = el.getBoundingClientRect();
  let space: number;
  if (scroller) space = scroller.clientHeight - (rect.top - scroller.getBoundingClientRect().top + scroller.scrollTop) - pad;
  else space = window.innerHeight - (rect.top + window.scrollY) - pad;
  space -= FIT_GAP_PX;
  if (!Number.isFinite(space) || space <= 0) return null;
  return Math.floor(Math.min(FIT_MAX_PX, space));
}

/** Keeps `ref`'s element at the height its page gives it (see `fitHeightOf`), re-measured when the window or the scrolling area changes size. */
function useFitHeight(ref: React.RefObject<HTMLElement | null>): number | null {
  const [height, setHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const next = fitHeightOf(el);
      setHeight((was) => (was === next ? was : next));
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    for (let node = el.parentElement; node && observer; node = node.parentElement) {
      if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) {
        observer.observe(node);
        break;
      }
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, [ref]);
  return height;
}

function handlerAction(handler: FeedHandler): Action {
  const action: Record<string, unknown> = { ...handler };
  delete action.starts;
  return action as Action;
}

/** A PNG the editor made, as a data URL for a JSON call (the Element never uploads by itself). */
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(i18n._({ id: "ui.The picture could not be prepared. Try again.", message: "The picture could not be prepared. Try again." })));
    reader.readAsDataURL(blob);
  });
}

function toPending(reply: unknown): ImageEditorPending {
  const r = isRow(reply) ? reply : {};
  const previewUrl = str(r.preview_url);
  const token = str(r.token);
  const width = num(r.width);
  const height = num(r.height);
  if (!previewUrl || !token || width === undefined || height === undefined) {
    throw new Error(i18n._({ id: "ui.That change did not come back. Try again.", message: "That change did not come back. Try again." }));
  }
  return { token, previewUrl, width, height, transparent: r.transparent === true };
}

function toVersion(reply: unknown): ImageEditorVersion {
  const r = isRow(reply) ? reply : {};
  const id = str(r.id) ?? (typeof r.id === "number" ? String(r.id) : undefined);
  const url = str(r.url);
  if (!id || !url) throw new Error(i18n._({ id: "ui.The new version could not be saved. Try again.", message: "The new version could not be saved. Try again." }));
  return { id, url, label: str(r.label) ?? "", width: num(r.width), height: num(r.height), createdAt: str(r.created_at) };
}

/** A reply that saved the new version behind the person's lock: the picture cannot be shown to them, so the editor keeps the one it had. */
function lockedNote(reply: unknown): string | null {
  const r = isRow(reply) ? reply : {};
  if (r.locked !== true) return null;
  return str(r.note) ?? i18n._({ id: "ui.Saved to your Library behind your Adult lock. Unlock it there to keep editing it.", message: "Saved to your Library behind your Adult lock. Unlock it there to keep editing it." });
}

function toVersions(row: Row, f: NonNullable<ImageEditorNode["fields"]>): ImageEditorVersion[] {
  const raw = readField(row, f.versions ?? "versions");
  const listed = Array.isArray(raw)
    ? raw.filter(isRow).map((v): ImageEditorVersion => ({ id: String(v.id ?? ""), url: str(v.url) ?? "", label: str(v.label) ?? "", createdAt: str(v.created_at), width: num(v.width), height: num(v.height) }))
    : [];
  if (listed.length > 0) return listed;
  const url = str(readField(row, f.url ?? "url")) ?? "";
  return [{ id: String(readField(row, f.key ?? "id") ?? "picture"), url, label: i18n._({ id: "ui.Original", message: "Original" }), width: num(readField(row, f.width ?? "width")), height: num(readField(row, f.height ?? "height")) }];
}

/** IMG-STUDIO-01: `image_editor`. Reads one picture row and its versions, hands the Element the tool states the handlers allow, and maps
 * the Element's requests onto `handlers`. A locked row is set aside first: one lock tile and nothing else is read. */
export function ImageEditorNodeView({ node, state }: { node: ImageEditorNode; state: Row }) {
  const query = useBinding<Row | Row[]>(node.bind, state);
  const row = Array.isArray(query.data) ? query.data[0] : query.data;
  // A page with its own picker draws nothing here until a picture is open.
  if (node.hide_when_empty && query.data && !query.isError && !row) return null;
  return (
    <AsyncState data={query.data} error={query.isError} isFetching={query.isFetching} onRetry={() => query.refetch()} errorMessage={i18n._({ id: "ui.Could not open this picture.", message: "Could not open this picture." })} isEmpty={() => !row} emptyIcon="image" emptyText={i18n._({ id: "ui.Pick a picture to open it in the Studio.", message: "Pick a picture to open it in the Studio." })}>
      {() => (row ? <EditorRow node={node} state={state} row={row} /> : null)}
    </AsyncState>
  );
}

function EditorRow({ node, state, row }: { node: ImageEditorNode; state: Row; row: Row }) {
  const f = node.fields ?? {};
  if (readField(row, f.locked ?? "locked") === true) return <LockTile making={readField(row, "making") === true} shape="card" />;
  if (readField(row, f.empty ?? "empty") === true) return <EmptyPlaceholder node={node} />;
  return node.operations ? <WithOperations node={node} state={state} row={row} /> : <EditorOpen node={node} row={row} operations={undefined} />;
}

/** The page's own words and actions for "no pictures at all" (a placeholder row), instead of the default line. */
function EmptyPlaceholder({ node }: { node: ImageEditorNode }) {
  const { dispatch } = useDispatchAction();
  const empty = node.empty_state;
  if (!empty) return <EmptyState icon="image" text={i18n._({ id: "ui.Pick a picture to open it in the Studio.", message: "Pick a picture to open it in the Studio." })} />;
  const label = (action: Action, own: string | undefined) => own ?? ("navigate" in action ? i18n._({ id: "ui.Go", message: "Go" }) : i18n._({ id: "ui.Continue", message: "Continue" }));
  return (
    <EmptyState
      icon={empty.icon}
      text={empty.text}
      actionLabel={empty.action ? label(empty.action, empty.action_label) : undefined}
      onAction={empty.action ? () => dispatch(empty.action!) : undefined}
      secondaryLabel={empty.action && empty.secondary_action ? label(empty.secondary_action, empty.secondary_action_label) : undefined}
      onSecondary={empty.action && empty.secondary_action ? () => dispatch(empty.secondary_action!) : undefined}
    />
  );
}

function WithOperations({ node, state, row }: { node: ImageEditorNode; state: Row; row: Row }) {
  const query = useBinding<Row[]>(node.operations!.bind, state);
  const operations = useMemo<ImageEditorExtraOperation[]>(() => {
    const rows = Array.isArray(query.data) ? query.data : [];
    return rows.filter(isRow).flatMap((r) => {
      const id = str(r.id);
      const label = str(r.label);
      if (!id || !label) return [];
      return [{ id, label, summary: str(r.summary), controls: Array.isArray(r.controls) ? (r.controls as ImageEditorExtraOperation["controls"]) : undefined, enabled: r.enabled !== false, reason: str(r.reason) }];
    });
  }, [query.data]);
  return <EditorOpen node={node} row={row} operations={operations} />;
}

function EditorOpen({ node, row, operations }: { node: ImageEditorNode; row: Row; operations: ImageEditorExtraOperation[] | undefined }) {
  const f = node.fields ?? {};
  const { dispatch, lastError } = useDispatchAction();
  const file = String(readField(row, f.key ?? "id") ?? "");
  const title = str(readField(row, f.title ?? "title")) ?? i18n._({ id: "ui.Picture", message: "Picture" });
  const rowVersions = toVersions(row, f);
  const [added, setAdded] = useState<ImageEditorVersion[]>([]);
  const versions = useMemo(() => [...rowVersions, ...added.filter((a) => !rowVersions.some((v) => v.id === a.id))], [rowVersions, added]);
  const [lockNote, setLockNote] = useState<string | null>(null);
  const lockedIds = useRef(new Set<string>());
  const [currentId, setCurrentId] = useState<string>(() => versions[versions.length - 1]?.id ?? "");
  const handlers = node.handlers ?? {};
  const frameRef = useRef<HTMLDivElement | null>(null);
  const fitted = useFitHeight(frameRef);

  const call = useCallback(
    (handler: FeedHandler, item: Row): Promise<unknown> =>
      new Promise((resolve, reject) => {
        dispatch(handlerAction(handler), [item], undefined, { typedArgs: true, onReply: (reply) => resolve(reply), onError: (message) => reject(new Error(message)) });
      }),
    [dispatch],
  );

  const tools = useMemo(() => {
    const listed = node.tools;
    const reasons = node.tool_reasons ?? {};
    const need = { markup: handlers.markup, comment: handlers.comment, remove_background: handlers.run, erase: handlers.run, resize: handlers.run, crop: handlers.run, adjust: handlers.run } as const;
    const state = (key: keyof typeof need): ImageEditorToolState => {
      if (listed && !listed.includes(key)) return { enabled: false, reason: i18n._({ id: "ui.Not offered here.", message: "Not offered here." }) };
      if (reasons[key]) return { enabled: false, reason: reasons[key] };
      if (!need[key]) return { enabled: false, reason: i18n._({ id: "ui.Not set up yet.", message: "Not set up yet." }) };
      return { enabled: true };
    };
    const out: ImageEditorProps["tools"] = {
      markup: state("markup"),
      comment: state("comment"),
      remove_background: state("remove_background"),
      erase: state("erase"),
      resize: state("resize"),
    };
    if (!listed || listed.includes("crop")) out.crop = state("crop");
    if (!listed || listed.includes("adjust")) out.adjust = state("adjust");
    return out;
  }, [node.tools, node.tool_reasons, handlers.markup, handlers.comment, handlers.run]);

  const shownOperations = !node.tools || node.tools.includes("more") ? operations : undefined;

  const onRunOperation = useCallback(
    async (op: ImageEditorOperation): Promise<ImageEditorPending> => {
      if (!handlers.run) throw new Error(i18n._({ id: "ui.Not set up yet.", message: "Not set up yet." }));
      let operation: string = op.operation;
      let args: Row = {};
      switch (op.operation) {
        case "erase":
          args = { mask: await dataUrl(op.mask) };
          break;
        case "upscale":
          args = { scale: op.scale };
          break;
        case "resize":
          args = { width: op.width, height: op.height };
          break;
        case "crop":
          args = { x: op.x, y: op.y, width: op.width, height: op.height, aspect: op.aspect, rotate: op.rotate, flip_horizontal: op.flipHorizontal, flip_vertical: op.flipVertical };
          break;
        case "adjust":
          args = { brightness: op.brightness, contrast: op.contrast, saturation: op.saturation, warmth: op.warmth, auto: op.auto };
          break;
        case "custom":
          operation = op.id;
          args = { ...op.args };
          break;
        default:
          break;
      }
      return toPending(await call(handlers.run, { file: currentId || file, operation, args }));
    },
    [handlers.run, call, currentId, file],
  );

  const onApplyPending = useCallback(
    async (pending: ImageEditorPending, label: string): Promise<ImageEditorVersion> => {
      if (!handlers.apply) throw new Error(i18n._({ id: "ui.Not set up yet.", message: "Not set up yet." }));
      const reply = await call(handlers.apply, { file, token: pending.token, label });
      const version = toVersion(reply);
      const note = lockedNote(reply);
      setLockNote(note);
      if (note) lockedIds.current.add(version.id);
      else setAdded((list) => [...list, version]);
      return version;
    },
    [handlers.apply, call, file],
  );

  const onSaveMarkup = useCallback(
    async (png: Blob): Promise<ImageEditorVersion> => {
      if (!handlers.markup) throw new Error(i18n._({ id: "ui.Not set up yet.", message: "Not set up yet." }));
      const reply = await call(handlers.markup, { file, png: await dataUrl(png) });
      const version = toVersion(reply);
      const note = lockedNote(reply);
      setLockNote(note);
      if (note) lockedIds.current.add(version.id);
      else setAdded((list) => [...list, version]);
      return version;
    },
    [handlers.markup, call, file],
  );

  const onComment = useCallback(
    async (request: ImageEditorCommentRequest): Promise<{ message: string; pending?: ImageEditorPending }> => {
      if (!handlers.comment) throw new Error(i18n._({ id: "ui.Not set up yet.", message: "Not set up yet." }));
      const reply = await call(handlers.comment, { file: currentId || file, prompt: request.prompt, region: request.region, mask: request.mask ? await dataUrl(request.mask) : null, reference: request.reference ?? null });
      const r = isRow(reply) ? reply : {};
      return { message: str(r.message) ?? "", ...(r.preview ? { pending: toPending(r.preview) } : {}) };
    },
    [handlers.comment, call, currentId, file],
  );

  const onPickReference = useMemo(() => {
    const pick = handlers.pick_reference;
    if (!pick) return undefined;
    return async (): Promise<ImageEditorReference | null> => {
      const reply = await call(pick, { file });
      return isRow(reply) && str(reply.id) ? { id: String(reply.id), label: str(reply.label) ?? String(reply.id) } : null;
    };
  }, [handlers.pick_reference, call, file]);

  return (
    <div ref={frameRef} className="flex h-[min(52rem,calc(100dvh-8rem))] min-h-96 w-full flex-col gap-2" style={fitted ? { height: fitted } : undefined} data-slot="image-editor-node">
      <div className="min-h-0 flex-1">
      <ImageEditor
        title={title}
        versions={versions}
        currentVersionId={versions.some((v) => v.id === currentId) ? currentId : (versions[versions.length - 1]?.id ?? "")}
        onSelectVersion={(id) => {
          // The version just saved behind the lock is not in the list: keep the one on screen.
          if (lockedIds.current.has(id)) return;
          setLockNote(null);
          setCurrentId(id);
        }}
        statusNote={lockNote}
        tools={tools}
        operations={shownOperations}
        initialTool={node.initial_tool === "more" ? undefined : node.initial_tool}
        compare={node.compare}
        commentBrush={node.comment_brush && !!handlers.comment}
        onPickReference={onPickReference}
        onRunOperation={onRunOperation}
        onApplyPending={onApplyPending}
        onSaveMarkup={onSaveMarkup}
        onComment={onComment}
        onClose={() => {
          if (node.on_close) dispatch(node.on_close, [{ file }]);
        }}
      />
      </div>
      {lastError ? <p role="alert" className="text-destructive text-sm">{lastError}</p> : null}
    </div>
  );
}
