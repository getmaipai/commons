// Volume identity for the data-location record (home docs/dev.md,
// "DATA-LOCATION", (a) and (b)): which volume a folder is on, and which
// mount point a recorded volume has now, so a drive that comes back under
// another name is found again. The id is the filesystem UUID on macOS
// (`diskutil info -plist`, VolumeUUID) and Linux (`findmnt`), the volume
// GUID on Windows (`Get-Volume`, UniqueId), and for a network share the
// share's own address (`//nas/share`, `nas:/export`), which has no UUID.
//
// Shape, the same as keystore.ts: pure invocation builders and parsers
// (tested against captured output) around one injected `CommandRunner`.
// The parsers for macOS were tested against real captured output; the Linux
// `findmnt -P` and Windows PowerShell parsers are written from the tools'
// documented output and are covered by hand-written fixtures until a run on
// a real Linux and Windows machine replaces them (DATA-LOCATION-00b's done
// report lists this). REAL-OS SEAM: `defaultRunner` is the only code that
// spawns a process, and no unit test calls it.
import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { posix, win32 } from "node:path";
import plist from "plist";

/** Runs one command and resolves with its stdout, rejecting on a non-zero
 * exit. `input` is written to stdin. The one seam that touches the OS. */
export type CommandRunner = (file: string, args: string[], options?: { input?: string }) => Promise<string>;

export const defaultRunner: CommandRunner = (file, args, options) =>
  new Promise((resolve, reject) => {
    const child = execFile(file, args, { timeout: 15_000, maxBuffer: 16 * 1024 * 1024, encoding: "utf8" }, (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
    if (options?.input !== undefined) child.stdin?.end(options.input);
  });

// ── Typed errors ─────────────────────────────────────────────────────────

/** The OS tool could not be run or exited non-zero. */
export class VolumeToolError extends Error {
  readonly code = "volume-tool-failed";
  readonly command: string;
  constructor(command: string, cause: unknown) {
    super(`Could not read volume information (${command}): ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "VolumeToolError";
    this.command = command;
    this.cause = cause;
  }
}

/** The tool ran but the volume has no identity a record can hold (no UUID, a
 * drive letter the OS does not list, an unsupported platform). */
export class VolumeIdentityUnavailableError extends Error {
  readonly code = "volume-identity-unavailable";
  readonly path: string;
  readonly reason: string;
  constructor(path: string, reason: string) {
    super(`No volume identity for ${path}: ${reason}`);
    this.name = "VolumeIdentityUnavailableError";
    this.path = path;
    this.reason = reason;
  }
}

// ── Shapes ───────────────────────────────────────────────────────────────

/** A mounted volume as the OS lists it right now. */
export interface MountedVolume {
  id: string;
  label: string;
  mountPoint: string;
  network: boolean;
}

/** A folder's volume: the mounted volume plus the folder's path below it,
 * forward slashes, empty for the volume's top. */
export interface VolumeIdentity extends MountedVolume {
  relativePath: string;
}

export interface VolumeOptions {
  platform?: NodeJS.Platform;
  run?: CommandRunner;
  /** Test seam for symlink resolution; defaults to `fs.realpathSync`. */
  realpath?: (p: string) => string;
}

/** The three fields the spec's `volume` shape holds (drops the live mount
 * point, which is never recorded). */
export function toRecordVolume(v: VolumeIdentity): { id: string; label: string; relativePath: string } {
  return { id: v.id, label: v.label, relativePath: v.relativePath };
}

/** Network addresses keep the host and share and never a credential. */
export function normalizeNetworkAddress(source: string): string {
  let s = source.trim().replace(/\\/g, "/");
  if (s.startsWith("//")) {
    s = "//" + s.slice(2).replace(/^[^/]*@/, "");
    s = s.replace(/\._[a-z0-9-]+\._tcp\.local(?=\/|$)/i, "");
  }
  return s.length > 1 ? s.replace(/\/+$/, "") : s;
}

function isNetworkShaped(source: string): boolean {
  return source.startsWith("//") || /^[^/\s]+:\//.test(source);
}

function lastSegment(address: string): string {
  const parts = address.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

/** Whether two volume ids name the same volume (case-insensitive; a trailing
 * slash on a share address does not matter). */
export function sameVolumeId(a: string, b: string): boolean {
  const norm = (x: string) => x.toLowerCase().replace(/\/+$/, "");
  return norm(a) === norm(b);
}

// ── macOS ────────────────────────────────────────────────────────────────

export function dfInvocation(path?: string): { file: string; args: string[] } {
  return { file: "df", args: path === undefined ? ["-P", "-k"] : ["-P", "-k", path] };
}

export function diskutilInfoInvocation(mountPoint: string): { file: string; args: string[] } {
  return { file: "diskutil", args: ["info", "-plist", mountPoint] };
}

export function diskutilListInvocation(): { file: string; args: string[] } {
  return { file: "diskutil", args: ["list", "-plist"] };
}

/** `df -P -k` rows: the filesystem (a device, or a network address, which
 * may contain spaces) and the mount point (which may contain spaces). */
export function parseDf(output: string): Array<{ source: string; mountPoint: string }> {
  const rows: Array<{ source: string; mountPoint: string }> = [];
  for (const line of output.split("\n").slice(1)) {
    const m = line.match(/^(.+?)\s+\d+\s+\d+\s+\d+\s+(?:\d+%|-)\s+(\/.*)$/);
    if (m) rows.push({ source: m[1]!, mountPoint: m[2]! });
  }
  return rows;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** `diskutil info -plist` for one volume. `uuid` is null when the volume has
 * none (the caller refuses it: a path is not an identity). */
export function parseDiskutilInfo(xml: string): { uuid: string | null; label: string; mountPoint: string; fsType: string } {
  const info = plist.parse(xml) as Record<string, unknown>;
  const uuid = asString(info.VolumeUUID);
  return { uuid: uuid || null, label: asString(info.VolumeName), mountPoint: asString(info.MountPoint), fsType: asString(info.FilesystemType) };
}

/** Every mounted volume in `diskutil list -plist`, wherever it nests (a
 * partition, or an APFS volume inside its container). */
export function parseDiskutilList(xml: string): Array<{ uuid: string; label: string; mountPoint: string }> {
  const out: Array<{ uuid: string; label: string; mountPoint: string }> = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (typeof node !== "object" || node === null) return;
    const d = node as Record<string, unknown>;
    const uuid = asString(d.VolumeUUID);
    const mountPoint = asString(d.MountPoint);
    if (uuid && mountPoint) out.push({ uuid, label: asString(d.VolumeName), mountPoint });
    Object.values(d).forEach(walk);
  };
  walk(plist.parse(xml));
  return out;
}

// ── Linux ────────────────────────────────────────────────────────────────

const LINUX_NETWORK_FS = new Set(["nfs", "nfs4", "cifs", "smb3", "smbfs", "sshfs", "fuse.sshfs", "9p", "ceph", "glusterfs", "davfs", "fuse.davfs"]);

/** `findmnt -P` (KEY="value" pairs, one mount per line), for one path or, with
 * none, every mount. */
export function findmntInvocation(path?: string): { file: string; args: string[] } {
  const base = ["-P", "-o", "UUID,LABEL,TARGET,SOURCE,FSTYPE"];
  return { file: "findmnt", args: path === undefined ? base : [...base, "-T", path] };
}

function decodeFindmnt(value: string): string {
  return value.replace(/(?:\\x[0-9a-fA-F]{2})+/g, (run) => Buffer.from(run.replace(/\\x/g, ""), "hex").toString("utf8"));
}

export function parseFindmnt(output: string): Array<{ uuid: string; label: string; target: string; source: string; fsType: string }> {
  const rows = [];
  for (const line of output.split("\n")) {
    if (!line.trim()) continue;
    const fields: Record<string, string> = {};
    for (const m of line.matchAll(/([A-Z]+)="((?:[^"\\]|\\.)*)"/g)) fields[m[1]!] = decodeFindmnt(m[2]!);
    rows.push({
      uuid: fields.UUID ?? "",
      label: fields.LABEL ?? "",
      target: fields.TARGET ?? "",
      source: fields.SOURCE ?? "",
      fsType: fields.FSTYPE ?? "",
    });
  }
  return rows;
}

// ── Windows ──────────────────────────────────────────────────────────────

// No user text goes into the script: it lists every volume and the tool
// filters, so there is nothing to quote. Read from stdin like keystore.ts's
// DPAPI script.
const WINDOWS_VOLUMES_SCRIPT =
  '$v=@(Get-Volume | Where-Object { $_.DriveLetter } | ForEach-Object { [pscustomobject]@{ DriveLetter = "$($_.DriveLetter)"; UniqueId = $_.UniqueId; Label = $_.FileSystemLabel } }); ' +
  "$n=@(Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 4 } | ForEach-Object { [pscustomobject]@{ DeviceID = $_.DeviceID; ProviderName = $_.ProviderName } }); " +
  "[pscustomobject]@{ Volumes = $v; Network = $n } | ConvertTo-Json -Compress -Depth 4";

export function windowsVolumesInvocation(): { file: string; args: string[]; input: string } {
  return { file: "powershell.exe", args: ["-NoProfile", "-NonInteractive", "-Command", "-"], input: WINDOWS_VOLUMES_SCRIPT };
}

function asList(v: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  return v && typeof v === "object" ? [v as Record<string, unknown>] : [];
}

/** The drive-lettered volumes: the GUID from `UniqueId`
 * (`\\?\Volume{guid}\`, lower-cased), or a mapped drive's share address. */
export function parseWindowsVolumes(json: string): Array<{ letter: string; id: string; label: string; network: boolean }> {
  const data = JSON.parse(json) as { Volumes?: unknown; Network?: unknown };
  const byLetter = new Map<string, { letter: string; id: string; label: string; network: boolean }>();
  for (const v of asList(data.Volumes)) {
    const letter = asString(v.DriveLetter).toUpperCase();
    const guid = asString(v.UniqueId).match(/\{([0-9a-fA-F-]{36})\}/)?.[1];
    if (letter && guid) byLetter.set(letter, { letter, id: guid.toLowerCase(), label: asString(v.Label), network: false });
  }
  for (const n of asList(data.Network)) {
    const letter = asString(n.DeviceID).replace(/:$/, "").toUpperCase();
    const address = normalizeNetworkAddress(asString(n.ProviderName));
    if (letter && address) byLetter.set(letter, { letter, id: address, label: lastSegment(address), network: true });
  }
  return [...byLetter.values()];
}

// ── Orchestration ────────────────────────────────────────────────────────

async function runTool(run: CommandRunner, file: string, args: string[], input?: string): Promise<string> {
  try {
    return await run(file, args, input === undefined ? undefined : { input });
  } catch (err) {
    throw new VolumeToolError([file, ...args].join(" "), err);
  }
}

// The nearest existing ancestor, symlinks resolved, plus the not-yet-existing
// rest: a folder an installer is about to create still has a volume.
function resolveExisting(path: string, api: typeof posix, realpath: (p: string) => string): { existing: string; full: string } {
  const rest: string[] = [];
  let current = path;
  for (;;) {
    try {
      const existing = realpath(current);
      return { existing, full: rest.length ? api.join(existing, ...rest) : existing };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      const parent = api.dirname(current);
      if ((code !== "ENOENT" && code !== "ENOTDIR") || parent === current) throw err;
      rest.unshift(api.basename(current));
      current = parent;
    }
  }
}

// The folder's path below the mount point, or null when it is not below it.
function relativeBelow(mountPoint: string, full: string, api: typeof posix): string | null {
  if (api === win32) {
    const m = mountPoint.replace(/[\\/]+$/, "").toLowerCase();
    const f = full.replace(/[\\/]+$/, "");
    if (f.toLowerCase() === m) return "";
    if (!f.toLowerCase().startsWith(m + "\\")) return null;
    return f.slice(m.length).replace(/^[\\/]+/, "").replace(/\\/g, "/");
  }
  const rel = api.relative(mountPoint, full);
  if (rel === ".." || rel.startsWith("../") || api.isAbsolute(rel)) return null;
  return rel.split(api.sep).filter(Boolean).join("/");
}

/** The volume a folder is on, and the folder's path below it. The folder need
 * not exist yet. Throws `VolumeToolError` or `VolumeIdentityUnavailableError`,
 * never a guess. */
export async function volumeIdentity(path: string, options: VolumeOptions = {}): Promise<VolumeIdentity> {
  const platform = options.platform ?? process.platform;
  const run = options.run ?? defaultRunner;
  const realpath = options.realpath ?? ((p: string) => realpathSync(p));
  if (platform === "darwin") return macIdentity(path, run, realpath);
  if (platform === "linux") return linuxIdentity(path, run, realpath);
  if (platform === "win32") return windowsIdentity(path, run, realpath);
  throw new VolumeIdentityUnavailableError(path, `unsupported platform ${platform}`);
}

async function macIdentity(path: string, run: CommandRunner, realpath: (p: string) => string): Promise<VolumeIdentity> {
  const { existing, full } = resolveExisting(path, posix, realpath);
  const inv = dfInvocation(existing);
  const rows = parseDf(await runTool(run, inv.file, inv.args));
  const row = rows[0];
  if (!row) throw new VolumeIdentityUnavailableError(path, "df listed no filesystem");
  let relativePath = relativeBelow(row.mountPoint, full, posix);
  // macOS firmlinks /Users, /Applications and the rest into the Data volume
  // (mounted at /System/Volumes/Data), and realpath keeps the short form.
  if (relativePath === null && row.mountPoint === "/System/Volumes/Data") relativePath = full.replace(/^\/+/, "");
  if (relativePath === null) throw new VolumeIdentityUnavailableError(path, `${full} is not below its mount point ${row.mountPoint}`);
  if (row.source.startsWith("/dev/")) {
    const info = diskutilInfoInvocation(row.mountPoint);
    const parsed = parseDiskutilInfo(await runTool(run, info.file, info.args));
    if (!parsed.uuid) throw new VolumeIdentityUnavailableError(path, `the volume at ${row.mountPoint} has no UUID`);
    return { id: parsed.uuid, label: parsed.label, relativePath, mountPoint: row.mountPoint, network: false };
  }
  if (isNetworkShaped(row.source)) {
    const id = normalizeNetworkAddress(row.source);
    return { id, label: lastSegment(id), relativePath, mountPoint: row.mountPoint, network: true };
  }
  throw new VolumeIdentityUnavailableError(path, `${row.source} is not a disk or a network share`);
}

async function linuxIdentity(path: string, run: CommandRunner, realpath: (p: string) => string): Promise<VolumeIdentity> {
  const { existing, full } = resolveExisting(path, posix, realpath);
  const inv = findmntInvocation(existing);
  const row = parseFindmnt(await runTool(run, inv.file, inv.args))[0];
  if (!row) throw new VolumeIdentityUnavailableError(path, "findmnt listed no mount");
  const relativePath = relativeBelow(row.target, full, posix);
  if (relativePath === null) throw new VolumeIdentityUnavailableError(path, `${full} is not below its mount point ${row.target}`);
  if (LINUX_NETWORK_FS.has(row.fsType)) {
    const id = normalizeNetworkAddress(row.source);
    return { id, label: lastSegment(id), relativePath, mountPoint: row.target, network: true };
  }
  if (!row.uuid) throw new VolumeIdentityUnavailableError(path, `the ${row.fsType} mount at ${row.target} has no UUID`);
  return { id: row.uuid, label: row.label, relativePath, mountPoint: row.target, network: false };
}

async function windowsIdentity(path: string, run: CommandRunner, realpath: (p: string) => string): Promise<VolumeIdentity> {
  const unc = path.match(/^[\\/]{2}([^\\/]+)[\\/]+([^\\/]+)(.*)$/);
  if (unc) {
    const id = `//${unc[1]}/${unc[2]}`;
    return {
      id,
      label: unc[2]!,
      relativePath: unc[3]!.replace(/^[\\/]+/, "").replace(/[\\/]+$/, "").replace(/\\/g, "/"),
      mountPoint: `\\\\${unc[1]}\\${unc[2]}`,
      network: true,
    };
  }
  const letter = path.match(/^([A-Za-z]):[\\/]/)?.[1]?.toUpperCase();
  if (!letter) throw new VolumeIdentityUnavailableError(path, "not a drive-letter or UNC path");
  const { full } = resolveExisting(path, win32, realpath);
  const inv = windowsVolumesInvocation();
  const volumes = parseWindowsVolumes(await runTool(run, inv.file, inv.args, inv.input));
  const vol = volumes.find((v) => v.letter === letter);
  if (!vol) throw new VolumeIdentityUnavailableError(path, `Windows lists no volume for drive ${letter}:`);
  const relativePath = relativeBelow(`${letter}:\\`, full, win32);
  if (relativePath === null) throw new VolumeIdentityUnavailableError(path, `${full} is not below drive ${letter}:`);
  return { id: vol.id, label: vol.label, relativePath, mountPoint: `${letter}:\\`, network: vol.network };
}

/** The mounted volume with this id right now, or null when it is not
 * connected. */
export async function findVolume(id: string, options: Pick<VolumeOptions, "platform" | "run"> = {}): Promise<MountedVolume | null> {
  const platform = options.platform ?? process.platform;
  const run = options.run ?? defaultRunner;
  if (platform === "darwin") {
    if (isNetworkShaped(id)) {
      const inv = dfInvocation();
      for (const row of parseDf(await runTool(run, inv.file, inv.args))) {
        if (!isNetworkShaped(row.source)) continue;
        const address = normalizeNetworkAddress(row.source);
        if (sameVolumeId(address, id)) return { id: address, label: lastSegment(address), mountPoint: row.mountPoint, network: true };
      }
      return null;
    }
    const inv = diskutilListInvocation();
    const hit = parseDiskutilList(await runTool(run, inv.file, inv.args)).find((v) => sameVolumeId(v.uuid, id));
    return hit ? { id: hit.uuid, label: hit.label, mountPoint: hit.mountPoint, network: false } : null;
  }
  if (platform === "linux") {
    const inv = findmntInvocation();
    for (const row of parseFindmnt(await runTool(run, inv.file, inv.args))) {
      if (LINUX_NETWORK_FS.has(row.fsType)) {
        const address = normalizeNetworkAddress(row.source);
        if (sameVolumeId(address, id)) return { id: address, label: lastSegment(address), mountPoint: row.target, network: true };
      } else if (row.uuid && sameVolumeId(row.uuid, id)) {
        return { id: row.uuid, label: row.label, mountPoint: row.target, network: false };
      }
    }
    return null;
  }
  if (platform === "win32") {
    const inv = windowsVolumesInvocation();
    const hit = parseWindowsVolumes(await runTool(run, inv.file, inv.args, inv.input)).find((v) => sameVolumeId(v.id, id));
    return hit ? { id: hit.id, label: hit.label, mountPoint: `${hit.letter}:\\`, network: hit.network } : null;
  }
  throw new VolumeIdentityUnavailableError(id, `unsupported platform ${platform}`);
}

/** Where a recorded volume's folder is now: the volume's current mount point
 * joined with the recorded relative path, or null when the volume is not
 * connected. The folder's marker, not this path, is the proof it is the right
 * folder (see `checkFolderMarker`). */
export async function locateOnVolume(
  volume: { id: string; relativePath: string },
  options: Pick<VolumeOptions, "platform" | "run"> = {},
): Promise<string | null> {
  const mounted = await findVolume(volume.id, options);
  if (!mounted) return null;
  const api = /^[A-Za-z]:[\\/]|^\\\\/.test(mounted.mountPoint) ? win32 : posix;
  const segments = volume.relativePath.split("/").filter(Boolean);
  return segments.length === 0 ? mounted.mountPoint : api.join(mounted.mountPoint, ...segments);
}
