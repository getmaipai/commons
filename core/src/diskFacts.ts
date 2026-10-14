// Disk facts for the data-location placement check (home docs/dev.md,
// DATA-LOCATION (b), "The disk facts, per OS"): what kind of disk a folder is
// on, so the check can refuse or warn. This module only composes
// volumeIdentity.ts, which owns every diskutil, findmnt, lsblk and
// PowerShell invocation and parser, and hardware.ts's `diskSpace`. A fact the
// OS does not report is the string "unknown", never a guess.
//
// Linux `lsblk` and Windows `Get-Partition`/`Get-Disk` parsers are written
// from the tools' documented output and covered by hand-written fixtures; the
// macOS parsers were checked against real `diskutil` output (the same caveat
// as volumeIdentity.ts's header).
import { diskSpace } from "./hardware";
import {
  VolumeIdentityUnavailableError,
  defaultRunner,
  diskutilInfoInvocation,
  findmntInvocation,
  lsblkInvocation,
  mountInvocation,
  parseDiskutilInfo,
  parseFindmnt,
  parseLsblk,
  parseMount,
  parseWindowsDisk,
  parseWindowsVolumes,
  volumeIdentity,
  windowsDiskInvocation,
  windowsVolumesInvocation,
  type CommandRunner,
  type VolumeIdentity,
  type VolumeOptions,
} from "./volumeIdentity";

export type Unknown = "unknown";

export interface DiskFacts {
  identity: VolumeIdentity;
  /** `apfs`, `exfat`, `ntfs`, `nfs`, ... lower-cased. */
  filesystem: string | Unknown;
  /** Where the disk sits. A network share is "network"; a USB or Thunderbolt
   * drive is "external". */
  kind: "internal" | "external" | "network" | Unknown;
  medium: "solid-state" | "spinning" | Unknown;
  /** The disk behind the volume (`disk3s2`, `sda`, disk `1`), or "unknown"
   * for a RAID set or pool that hides its disks, and for a network share. */
  physicalDisk: string | Unknown;
  /** The mount forbids running programs from it (Linux `noexec`). Windows and
   * macOS volumes report false only when the OS says so; otherwise "unknown". */
  noexec: boolean | Unknown;
  /** macOS "Ignore ownership on this volume" is on. */
  ownershipIgnored: boolean | Unknown;
  freeBytes: number | Unknown;
  totalBytes: number | Unknown;
}

export interface DiskFactsOptions extends VolumeOptions {
  /** Test seam for free and total space; defaults to core's `diskSpace`. */
  space?: (path: string) => { freeBytes: number; totalBytes: number };
}

const UNKNOWN: Unknown = "unknown";

// One command key is run once per diskFacts call: identity and the facts both
// ask diskutil about the same mount point.
function memoize(run: CommandRunner): CommandRunner {
  const seen = new Map<string, Promise<string>>();
  return (file, args, options) => {
    const key = JSON.stringify([file, args, options?.input ?? null]);
    let hit = seen.get(key);
    if (!hit) {
      hit = run(file, args, options);
      seen.set(key, hit);
    }
    return hit;
  };
}

async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

/** The volume's disk facts. Throws `VolumeToolError` or
 * `VolumeIdentityUnavailableError` only when the volume itself cannot be
 * identified (the same errors as `volumeIdentity`); every other fact degrades
 * to "unknown". */
export async function diskFacts(path: string, options: DiskFactsOptions = {}): Promise<DiskFacts> {
  const platform = options.platform ?? process.platform;
  const run = memoize(options.run ?? defaultRunner);
  const identity = await volumeIdentity(path, { ...options, platform, run });
  const facts: DiskFacts = {
    identity,
    filesystem: UNKNOWN,
    kind: identity.network ? "network" : UNKNOWN,
    medium: UNKNOWN,
    physicalDisk: UNKNOWN,
    noexec: UNKNOWN,
    ownershipIgnored: UNKNOWN,
    freeBytes: UNKNOWN,
    totalBytes: UNKNOWN,
  };
  if (platform === "darwin") await macFacts(facts, run);
  else if (platform === "linux") await linuxFacts(facts, run);
  else if (platform === "win32") await windowsFacts(facts, run);
  else throw new VolumeIdentityUnavailableError(path, `unsupported platform ${platform}`);

  // Free space is read from the nearest folder that exists: a folder the
  // installer is about to create has no statfs yet, but its volume does.
  const space = await attempt(async () => (options.space ?? diskSpace)(identity.mountPoint));
  if (space) {
    facts.freeBytes = space.freeBytes;
    facts.totalBytes = space.totalBytes;
  }
  return facts;
}

async function macFacts(facts: DiskFacts, run: CommandRunner): Promise<void> {
  const { identity } = facts;
  if (identity.network) {
    const inv = mountInvocation();
    const rows = await attempt(async () => parseMount(await run(inv.file, inv.args)));
    const hit = rows?.find((r) => r.mountPoint === identity.mountPoint);
    if (hit) facts.filesystem = hit.fsType.toLowerCase();
    return;
  }
  const inv = diskutilInfoInvocation(identity.mountPoint);
  const info = await attempt(async () => parseDiskutilInfo(await run(inv.file, inv.args)));
  if (!info) return;
  if (info.fsType) facts.filesystem = info.fsType.toLowerCase();
  if (info.internal !== null) {
    facts.kind = info.external === true || !info.internal ? "external" : "internal";
  }
  if (info.solidState !== null) facts.medium = info.solidState ? "solid-state" : "spinning";
  if (info.physicalStore) facts.physicalDisk = info.physicalStore;
  if (info.permissionsEnabled !== null) facts.ownershipIgnored = !info.permissionsEnabled;
}

async function linuxFacts(facts: DiskFacts, run: CommandRunner): Promise<void> {
  const { identity } = facts;
  const inv = findmntInvocation(identity.mountPoint);
  const row = await attempt(async () => parseFindmnt(await run(inv.file, inv.args))[0]);
  if (!row) return;
  if (row.fsType) facts.filesystem = row.fsType.toLowerCase();
  if (row.options.length > 0) facts.noexec = row.options.includes("noexec");
  if (identity.network) return;
  const lsblk = lsblkInvocation(row.source);
  if (!lsblk) return; // tmpfs, zfs datasets, overlay: nothing lsblk can name
  const rows = await attempt(async () => parseLsblk(await run(lsblk.file, lsblk.args)));
  if (!rows) return;
  const disks = rows.filter((r) => r.type === "disk");
  // A RAID or pool whose members lsblk lists as several disks, or none, has no
  // single physical disk: say so rather than name one.
  if (disks.length !== 1) return;
  const disk = disks[0]!;
  facts.physicalDisk = disk.name;
  if (disk.rotational !== null) facts.medium = disk.rotational ? "spinning" : "solid-state";
  if (disk.transport === "usb" || disk.removable === true) facts.kind = "external";
  else if (disk.removable === false && disk.transport !== "") facts.kind = "internal";
}

async function windowsFacts(facts: DiskFacts, run: CommandRunner): Promise<void> {
  const { identity } = facts;
  const letter = identity.mountPoint.match(/^([A-Za-z]):/)?.[1];
  if (identity.network) {
    // A UNC path has no drive letter row; the share's type is not reported.
    return;
  }
  const volInv = windowsVolumesInvocation();
  const volumes = await attempt(async () => parseWindowsVolumes(await run(volInv.file, volInv.args, volInv.input ? { input: volInv.input } : undefined)));
  const vol = volumes?.find((v) => v.letter === letter?.toUpperCase());
  if (vol?.fsType) facts.filesystem = vol.fsType.toLowerCase();
  if (vol?.driveType === "Remote") facts.kind = "network";
  if (!letter) return;
  const diskInv = windowsDiskInvocation(letter);
  const disk = await attempt(async () => parseWindowsDisk(await run(diskInv.file, diskInv.args, { input: diskInv.input })));
  if (!disk) return;
  if (disk.diskNumber) facts.physicalDisk = disk.diskNumber;
  if (disk.mediaType === "SSD" || disk.mediaType === "SCM") facts.medium = "solid-state";
  else if (disk.mediaType === "HDD") facts.medium = "spinning";
  // Storage Spaces and virtual disks report a bus type that is not a physical
  // bus: no single disk is named for them.
  if (disk.busType === "Spaces" || disk.busType === "Virtual" || disk.busType === "File Backed Virtual") {
    facts.physicalDisk = UNKNOWN;
    return;
  }
  if (disk.busType === "USB" || vol?.driveType === "Removable") facts.kind = "external";
  else if (disk.busType !== "" && facts.kind !== "network") facts.kind = "internal";
}
