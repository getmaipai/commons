// Where a product's data lives (home docs/dev.md, "DATA-LOCATION"): the
// bootstrap record `data-location.json`, the visible per-folder marker
// `maipai-folder.json`, and class path resolution. One implementation for
// Home and the Stack; nothing here knows a product's class list, callers
// pass each class's declaration (id plus default place). Every path is
// injected. Nothing here creates a class folder: only an installer's init or
// a mover does, and they call mkdir themselves.
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";
import { DataFolder } from "@maipai/spec/gen/ts/data-folder.js";
import { DataLocation } from "@maipai/spec/gen/ts/data-location.js";
import { DataDirMissingError } from "./paths";

export type { DataFolder, DataLocation };

export type DataProduct = "home" | "stack" | "bot";

// ── Typed errors ─────────────────────────────────────────────────────────

/** The record or a marker exists but cannot be read (permissions, I/O). */
export class DataLocationReadError extends Error {
  readonly code = "data-location-unreadable";
  readonly path: string;
  constructor(path: string, cause: unknown) {
    super(`Could not read ${path}: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "DataLocationReadError";
    this.path = path;
    this.cause = cause;
  }
}

/** The record is not JSON, fails the spec shape, or breaks a rule the shape
 * cannot say (two steps for one class, a class the product does not declare). */
export class DataLocationInvalidError extends Error {
  readonly code = "data-location-invalid";
  readonly path: string;
  readonly issues: string[];
  constructor(path: string, issues: string[]) {
    super(`The data location record at ${path} is not valid: ${issues.join("; ")}`);
    this.name = "DataLocationInvalidError";
    this.path = path;
    this.issues = issues;
  }
}

/** The record's `schema` is a version this reader does not know. */
export class DataLocationSchemaError extends Error {
  readonly code = "data-location-schema";
  readonly path: string;
  readonly found: unknown;
  constructor(path: string, found: unknown) {
    super(`The data location record at ${path} has schema ${JSON.stringify(found)}; this build reads schema 2 only.`);
    this.name = "DataLocationSchemaError";
    this.path = path;
    this.found = found;
  }
}

/** A path or subpath that a record or class declaration may not carry (a
 * relative root, a `..` subpath). */
export class DataLocationPathError extends Error {
  readonly code = "data-location-path";
  readonly value: string;
  constructor(what: string, value: string) {
    super(`${what} must be ${what.includes("subpath") ? "a relative, forward-slash path with no . or .. segment" : "an absolute path"}: ${JSON.stringify(value)}`);
    this.name = "DataLocationPathError";
    this.value = value;
  }
}

/** A folder marker fails the spec shape, is not JSON, or a change to it is
 * refused (retiring a folder another move already retired). */
export class DataFolderMarkerInvalidError extends Error {
  readonly code = "data-folder-marker-invalid";
  readonly path: string;
  readonly issues: string[];
  constructor(path: string, issues: string[]) {
    super(`The folder marker at ${path} is not valid: ${issues.join("; ")}`);
    this.name = "DataFolderMarkerInvalidError";
    this.path = path;
    this.issues = issues;
  }
}

/** A marker was needed and the folder has none. */
export class DataFolderMarkerMissingError extends Error {
  readonly code = "data-folder-marker-missing";
  readonly path: string;
  constructor(path: string) {
    super(`No MaiPai folder marker at ${path}.`);
    this.name = "DataFolderMarkerMissingError";
    this.path = path;
  }
}

// ── Path style ───────────────────────────────────────────────────────────

// A record written on Windows holds Windows paths; resolve them with the
// Windows rules on any OS, so a record and its tests do not depend on the
// machine reading them.
function pathApi(p: string): typeof posix {
  return /^[A-Za-z]:[\\/]|^\\\\/.test(p) ? win32 : posix;
}

function assertAbsolute(what: string, p: string): typeof posix {
  const api = pathApi(p);
  if (!api.isAbsolute(p)) throw new DataLocationPathError(what, p);
  return api;
}

function stripTrailingSep(p: string): string {
  return p.length > 1 && /[\\/]$/.test(p) && !/^[A-Za-z]:[\\/]$/.test(p) ? p.replace(/[\\/]+$/, "") : p;
}

// ── The record's fixed per-user path ─────────────────────────────────────

export interface DataLocationPathOptions {
  platform?: NodeJS.Platform;
  homeDir?: string;
  env?: Record<string, string | undefined>;
}

/** `~/.maipai/<product>/data-location.json`, or
 * `%LOCALAPPDATA%\MaiPai\<product>\data-location.json` on Windows, for the
 * account the process runs as. `MAIPAI_DATA_LOCATION_PATH` overrides it, the
 * way `MAIPAI_HUB_LOCK_PATH` overrides the lock. */
export function dataLocationPath(product: DataProduct, options: DataLocationPathOptions = {}): string {
  const env = options.env ?? process.env;
  const override = env.MAIPAI_DATA_LOCATION_PATH;
  if (override) return override;
  const platform = options.platform ?? process.platform;
  const home = options.homeDir ?? homedir();
  if (platform === "win32") {
    const local = env.LOCALAPPDATA || win32.join(home, "AppData", "Local");
    return win32.join(local, "MaiPai", product, "data-location.json");
  }
  return posix.join(home, ".maipai", product, "data-location.json");
}

// ── Atomic write ─────────────────────────────────────────────────────────

interface AtomicOptions {
  mode?: number;
  /** Test seam: runs after the temp file is written and synced, before the
   * rename, so a test can prove an interrupted write leaves the old file. */
  beforeRename?: () => void;
}

// A temp file in the same folder, fsync, rename over the old file, fsync of
// the folder: the file is the old one or the new one, never a torn one.
function writeFileAtomic(file: string, content: string, options: AtomicOptions = {}): void {
  const api = pathApi(file);
  const folder = api.dirname(file);
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  const tmp = api.join(folder, `.${api.basename(file)}.${process.pid}.${Math.random().toString(36).slice(2, 10)}.tmp`);
  let fd: number | undefined;
  try {
    fd = openSync(tmp, "w", options.mode ?? 0o644);
    writeSync(fd, content);
    fsyncSync(fd);
    closeSync(fd);
    fd = undefined;
    options.beforeRename?.();
    renameSync(tmp, file);
  } catch (err) {
    if (fd !== undefined) {
      try {
        closeSync(fd);
      } catch {
        /* already closed */
      }
    }
    try {
      unlinkSync(tmp);
    } catch {
      /* never created, or already renamed */
    }
    throw err;
  }
  // Persist the rename itself. Windows cannot open a folder for sync; there
  // the rename is as durable as the OS makes it.
  try {
    const dirFd = openSync(folder, "r");
    try {
      fsyncSync(dirFd);
    } finally {
      closeSync(dirFd);
    }
  } catch {
    /* best effort */
  }
}

function readTextOrNull(file: string): string | null {
  try {
    return readFileSync(file, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw new DataLocationReadError(file, err);
  }
}

function zodIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }): string[] {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(record)"}: ${i.message}`);
}

// ── The record ───────────────────────────────────────────────────────────

export interface DataLocationCheckOptions {
  /** The class ids the product declares. When given, a `classes` key that is
   * not among them is refused (the spec shape cannot say this). */
  knownClassIds?: readonly string[];
}

// Rules JSON Schema cannot say (spec README, DATA-LOCATION notes): one step
// per class in a move, and class keys the product declares.
function semanticIssues(rec: DataLocation, options: DataLocationCheckOptions): string[] {
  const issues: string[] = [];
  if (options.knownClassIds) {
    const known = new Set(options.knownClassIds);
    for (const id of Object.keys(rec.classes)) {
      if (!known.has(id)) issues.push(`classes.${id}: not a class this product declares`);
    }
  }
  if (rec.move) {
    const seen = new Set<string>();
    for (const step of rec.move.steps) {
      if (seen.has(step.class)) issues.push(`move.steps: more than one step for class ${step.class}`);
      seen.add(step.class);
    }
  }
  return issues;
}

function validateRecord(path: string, value: unknown, options: DataLocationCheckOptions): DataLocation {
  if (typeof value === "object" && value !== null && "schema" in value && (value as { schema: unknown }).schema !== 2) {
    throw new DataLocationSchemaError(path, (value as { schema: unknown }).schema);
  }
  const parsed = DataLocation.safeParse(value);
  if (!parsed.success) throw new DataLocationInvalidError(path, zodIssues(parsed.error));
  const issues = semanticIssues(parsed.data, options);
  if (issues.length > 0) throw new DataLocationInvalidError(path, issues);
  return parsed.data;
}

/** Reads and validates the record. Returns null when there is none. Throws
 * `DataLocationReadError`, `DataLocationSchemaError` or
 * `DataLocationInvalidError`, never a bare string. */
export function readDataLocation(file: string, options: DataLocationCheckOptions = {}): DataLocation | null {
  const text = readTextOrNull(file);
  if (text === null) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new DataLocationInvalidError(file, [`not JSON: ${(err as Error).message}`]);
  }
  return validateRecord(file, value, options);
}

export interface WriteDataLocationOptions extends DataLocationCheckOptions {
  /** Test seam, see `AtomicOptions`. */
  beforeRename?: () => void;
}

/** Validates, then writes atomically (temp file, fsync, rename, fsync of the
 * folder). An invalid record is refused and nothing is written; an
 * interrupted write leaves the old record. Creates the record's own folder
 * (the lock's folder), which is outside every class. */
export function writeDataLocation(file: string, record: DataLocation, options: WriteDataLocationOptions = {}): void {
  const valid = validateRecord(file, record, options);
  writeFileAtomic(file, JSON.stringify(valid, null, 2) + "\n", { beforeRename: options.beforeRename });
}

/** Whether `productRoot` is the root that owns the record. A worktree or a
 * second checkout whose root differs treats the record as not its own. */
export function isRecordOwnedBy(record: DataLocation, productRoot: string): boolean {
  return stripTrailingSep(record.productRoot) === stripTrailingSep(productRoot);
}

/** A class's generation: its entry's, or 1 when the class is absent. */
export function classGeneration(record: DataLocation, classId: string): number {
  return record.classes[classId]?.generation ?? 1;
}

// ── Class path resolution ────────────────────────────────────────────────

/** What resolution needs of a class declaration (a subset of the spec's
 * `DataClass`, which every product's declaration satisfies). */
export interface ClassPathDecl {
  id: string;
  default: { base: "root" | "beside-root"; subpath: string };
}

function checkSubpath(subpath: string): string[] {
  if (subpath === "") return [];
  const segments = subpath.split("/");
  if (subpath.includes("\\") || segments.some((s) => s === "" || s === "." || s === "..")) {
    throw new DataLocationPathError("A class default subpath", subpath);
  }
  return segments;
}

function defaultPath(root: string, decl: ClassPathDecl): string {
  const api = assertAbsolute("The root path", root);
  const segments = checkSubpath(decl.default.subpath);
  const base = decl.default.base === "root" ? stripTrailingSep(root) : api.dirname(stripTrailingSep(root));
  return segments.length === 0 ? base : api.join(base, ...segments);
}

/** The folder a class lives in: its override when the record has one, else
 * the root joined with the class's default subpath (the root's parent for a
 * `beside-root` class). A class absent from the record follows the root. */
export function resolveClassPath(record: DataLocation, decl: ClassPathDecl): string {
  const override = record.classes[decl.id]?.path;
  if (override) {
    assertAbsolute(`The ${decl.id} override path`, override);
    return override;
  }
  return defaultPath(record.root.path, decl);
}

/** `MAIPAI_DATA_DIR`, or undefined when it is unset or empty. */
export function dataDirFromEnv(env: Record<string, string | undefined> = process.env): string | undefined {
  const value = env.MAIPAI_DATA_DIR;
  return value ? value : undefined;
}

export type ClassPathSource = "env" | "record" | "default";

export interface ClassLocationSources {
  /** `MAIPAI_DATA_DIR` (see `dataDirFromEnv`). When set it is the root, every
   * class resolves under it with no overrides, and the record is ignored
   * (tests, the screenshot run, the restore drill). */
  envDataDir?: string;
  /** The record, when it is this product's own (`isRecordOwnedBy`). */
  record?: DataLocation | null;
  /** The product's own default root (the Home checkout's `<repoRoot>/data`). */
  defaultRoot: string;
}

/** The boot order's first step for one class: the environment, then the
 * record, then the default, and which of the three decided. */
export function resolveClassLocation(
  decl: ClassPathDecl,
  sources: ClassLocationSources,
): { path: string; source: ClassPathSource } {
  if (sources.envDataDir) return { path: defaultPath(sources.envDataDir, decl), source: "env" };
  if (sources.record) return { path: resolveClassPath(sources.record, decl), source: "record" };
  return { path: defaultPath(sources.defaultRoot, decl), source: "default" };
}

// ── Folder markers ───────────────────────────────────────────────────────

const MARKER_FILE = "maipai-folder.json";
const PRODUCT_NAME: Record<DataProduct, string> = { home: "MaiPai Home", stack: "MaiPai Stack", bot: "MaiPai Bot" };

export function folderMarkerPath(folder: string): string {
  return pathApi(folder).join(folder, MARKER_FILE);
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function parseMarker(file: string, text: string): DataFolder {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (err) {
    throw new DataFolderMarkerInvalidError(file, [`not JSON: ${(err as Error).message}`]);
  }
  const parsed = DataFolder.safeParse(value);
  if (!parsed.success) throw new DataFolderMarkerInvalidError(file, zodIssues(parsed.error));
  return parsed.data;
}

/** The marker in a class folder, or null when the folder has none. Throws
 * `DataFolderMarkerInvalidError` or `DataLocationReadError`. */
export function readFolderMarker(folder: string): DataFolder | null {
  const file = folderMarkerPath(folder);
  const text = readTextOrNull(file);
  return text === null ? null : parseMarker(file, text);
}

export interface WriteFolderMarkerInput {
  product: DataProduct;
  class: string;
  householdFolderId: string;
  /** The class's generation this folder is live for. A moved-to folder gets
   * the previous generation plus one. */
  generation: number;
  /** The move that created this folder, when a move did. */
  moveId?: string;
  now?: Date;
}

/** Writes the visible marker into an existing class folder (atomically,
 * replacing any marker there). Never creates the folder: a missing one
 * throws `DataDirMissingError`. */
export function writeFolderMarker(folder: string, input: WriteFolderMarkerInput): DataFolder {
  if (!isDirectory(folder)) throw new DataDirMissingError(folder, input.class);
  const marker = {
    schema: 1,
    product: input.product,
    class: input.class,
    householdFolderId: input.householdFolderId,
    generation: input.generation,
    createdAt: (input.now ?? new Date()).toISOString(),
    ...(input.moveId ? { moveId: input.moveId } : {}),
    note:
      `This folder holds part of a ${PRODUCT_NAME[input.product]} household's data (class: ${input.class}). ` +
      `MaiPai uses it while Settings > Storage lists it; do not delete or move it by hand.`,
  };
  const file = folderMarkerPath(folder);
  const parsed = DataFolder.safeParse(marker);
  if (!parsed.success) throw new DataFolderMarkerInvalidError(file, zodIssues(parsed.error));
  writeFileAtomic(file, JSON.stringify(parsed.data, null, 2) + "\n");
  return parsed.data;
}

export interface RetireFolderMarkerInput {
  /** The absolute path the class's data moved to. */
  movedTo: string;
  /** The move that retires the folder. */
  moveId: string;
  now?: Date;
}

/** Sets `retired` on a folder's marker and changes nothing else. Retiring a
 * folder the same move already retired returns its marker unchanged; one
 * another move retired is refused; a folder with no marker throws
 * `DataFolderMarkerMissingError`. */
export function retireFolderMarker(folder: string, input: RetireFolderMarkerInput): DataFolder {
  const file = folderMarkerPath(folder);
  const current = readFolderMarker(folder);
  if (!current) throw new DataFolderMarkerMissingError(file);
  if (current.retired) {
    if (current.retired.moveId === input.moveId) return current;
    throw new DataFolderMarkerInvalidError(file, [`already retired by move ${current.retired.moveId}`]);
  }
  const next = { ...current, retired: { at: (input.now ?? new Date()).toISOString(), movedTo: input.movedTo, moveId: input.moveId } };
  const parsed = DataFolder.safeParse(next);
  if (!parsed.success) throw new DataFolderMarkerInvalidError(file, zodIssues(parsed.error));
  writeFileAtomic(file, JSON.stringify(parsed.data, null, 2) + "\n");
  return parsed.data;
}

export type FolderMarkerCheck =
  | { ok: true; marker: DataFolder }
  | {
      ok: false;
      reason: "missing-folder" | "missing-marker" | "unreadable" | "other-household" | "wrong-class" | "retired" | "wrong-generation";
      marker?: DataFolder;
    };

/** The boot's marker check for one class folder: is this the live folder for
 * `(householdFolderId, class, generation)`? Read-only; creates nothing. */
export function checkFolderMarker(
  folder: string,
  expected: { class: string; householdFolderId: string; generation: number },
): FolderMarkerCheck {
  if (!isDirectory(folder)) return { ok: false, reason: "missing-folder" };
  let marker: DataFolder | null;
  try {
    marker = readFolderMarker(folder);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (!marker) return { ok: false, reason: "missing-marker" };
  if (marker.householdFolderId !== expected.householdFolderId) return { ok: false, reason: "other-household", marker };
  if (marker.class !== expected.class) return { ok: false, reason: "wrong-class", marker };
  if (marker.retired) return { ok: false, reason: "retired", marker };
  if (marker.generation !== expected.generation) return { ok: false, reason: "wrong-generation", marker };
  return { ok: true, marker };
}
