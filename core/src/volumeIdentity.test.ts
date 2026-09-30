import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  VolumeIdentityUnavailableError,
  VolumeToolError,
  dfInvocation,
  diskutilInfoInvocation,
  diskutilListInvocation,
  findVolume,
  findmntInvocation,
  locateOnVolume,
  normalizeNetworkAddress,
  parseDf,
  parseDiskutilInfo,
  parseDiskutilList,
  parseFindmnt,
  parseWindowsVolumes,
  sameVolumeId,
  toRecordVolume,
  volumeIdentity,
  windowsVolumesInvocation,
  type CommandRunner,
} from "./volumeIdentity";

function fixture(name: string): string {
  return readFileSync(new URL(`./testdata/volume/${name}`, import.meta.url), "utf8");
}

// Captured on macOS (diskutil info -plist, diskutil list -plist, df -P -k),
// with volume UUIDs and the snapshot name replaced. The Linux findmnt and
// Windows PowerShell outputs below are written from the tools' documented
// formats: they were NOT captured on those systems (see the module's header).
const DF_DATA = `Filesystem   1024-blocks      Used Available Capacity  Mounted on
/dev/disk3s1   971350180 763874072 169956992    82%    /System/Volumes/Data
`;
const DF_ALL = `Filesystem                          1024-blocks      Used Available Capacity  Mounted on
/dev/disk3s3s1                        971350180  12148080 169956992     7%    /
devfs                                       231       231         0   100%    /dev
/dev/disk3s1                          971350180 763874072 169956992    82%    /System/Volumes/Data
map auto_home                                 0         0         0   100%    /System/Volumes/Data/home
/dev/disk5s2                         1953514584 500000000 1400000000    27%    /Volumes/Big 1
//guest:@nas._smb._tcp.local/Media   3906887168 100000000 3800000000     3%    /Volumes/Media
nas:/export/family                   3906887168 100000000 3800000000     3%    /Volumes/family
`;

function fakeRunner(replies: Record<string, string>, calls: string[] = []): CommandRunner {
  return async (file, args) => {
    const key = [file, ...args].join(" ");
    calls.push(key);
    const hit = replies[key];
    if (hit === undefined) throw new Error(`unexpected command: ${key}`);
    return hit;
  };
}

const realpathId = (p: string) => p;

describe("normalizeNetworkAddress", () => {
  test("keeps the share address and drops credentials, the local suffix and slash style", () => {
    expect(normalizeNetworkAddress("//guest:@nas._smb._tcp.local/Media")).toBe("//nas/Media");
    expect(normalizeNetworkAddress("//user:secret@nas/share/")).toBe("//nas/share");
    expect(normalizeNetworkAddress("\\\\NAS\\Share")).toBe("//NAS/Share");
    expect(normalizeNetworkAddress("nas:/export/family")).toBe("nas:/export/family");
  });

  test("never leaves a password in the result", () => {
    expect(normalizeNetworkAddress("//dad:hunter2@nas/share")).not.toContain("hunter2");
  });
});

describe("sameVolumeId", () => {
  test("compares case-insensitively, ignoring a trailing slash", () => {
    expect(sameVolumeId("C3F1AA00-0000-4000-8000-000000000001", "c3f1aa00-0000-4000-8000-000000000001")).toBe(true);
    expect(sameVolumeId("//nas/share", "//NAS/share/")).toBe(true);
    expect(sameVolumeId("a", "b")).toBe(false);
  });
});

describe("toRecordVolume", () => {
  test("keeps exactly the three fields the spec's volume shape has", () => {
    expect(
      toRecordVolume({ id: "x", label: "Big", relativePath: "MaiPai/home", mountPoint: "/Volumes/Big", network: false }),
    ).toEqual({ id: "x", label: "Big", relativePath: "MaiPai/home" });
  });
});

describe("macOS parsers, against captured output", () => {
  test("parseDf reads the filesystem and mount point, including a mount point with a space", () => {
    expect(parseDf(DF_DATA)).toEqual([{ source: "/dev/disk3s1", mountPoint: "/System/Volumes/Data" }]);
    const all = parseDf(DF_ALL);
    expect(all.map((r) => r.mountPoint)).toEqual([
      "/",
      "/dev",
      "/System/Volumes/Data",
      "/System/Volumes/Data/home",
      "/Volumes/Big 1",
      "/Volumes/Media",
      "/Volumes/family",
    ]);
    expect(all[5]?.source).toBe("//guest:@nas._smb._tcp.local/Media");
  });

  test("parseDiskutilInfo reads the volume UUID, name, mount point and filesystem", () => {
    expect(parseDiskutilInfo(fixture("macos-diskutil-info-data.xml"))).toEqual({
      uuid: "00000000-0000-4000-8000-000000000001",
      label: "Macintosh HD - Data",
      mountPoint: "/System/Volumes/Data",
      fsType: "apfs",
    });
  });

  test("parseDiskutilInfo returns a null uuid for a volume that has none", () => {
    const xml = `<?xml version="1.0"?><plist version="1.0"><dict><key>VolumeName</key><string>Old</string><key>MountPoint</key><string>/Volumes/Old</string></dict></plist>`;
    expect(parseDiskutilInfo(xml)).toMatchObject({ uuid: null, label: "Old", mountPoint: "/Volumes/Old" });
  });

  test("parseDiskutilList finds every mounted volume, nested under its container", () => {
    const vols = parseDiskutilList(fixture("macos-diskutil-list.xml"));
    expect(vols).toContainEqual({
      uuid: "00000000-0000-4000-8000-000000000001",
      label: "Macintosh HD - Data",
      mountPoint: "/System/Volumes/Data",
    });
    expect(vols.every((v) => v.mountPoint.startsWith("/"))).toBe(true);
    expect(vols.length).toBeGreaterThan(3);
  });

  test("the invocations are the tools the design names", () => {
    expect(diskutilInfoInvocation("/Volumes/Big")).toEqual({ file: "diskutil", args: ["info", "-plist", "/Volumes/Big"] });
    expect(diskutilListInvocation()).toEqual({ file: "diskutil", args: ["list", "-plist"] });
    expect(dfInvocation("/Volumes/Big")).toEqual({ file: "df", args: ["-P", "-k", "/Volumes/Big"] });
  });
});

describe("volumeIdentity on macOS", () => {
  test("a local folder: id, label and the path below the mount point", async () => {
    const info = fixture("macos-diskutil-info-data.xml");
    const run = fakeRunner({
      "df -P -k /System/Volumes/Data/Users/dad/MaiPai": DF_DATA,
      "diskutil info -plist /System/Volumes/Data": info,
    });
    const got = await volumeIdentity("/System/Volumes/Data/Users/dad/MaiPai", { platform: "darwin", run, realpath: realpathId });
    expect(got).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      label: "Macintosh HD - Data",
      relativePath: "Users/dad/MaiPai",
      mountPoint: "/System/Volumes/Data",
      network: false,
    });
  });

  test("a folder that does not exist yet is identified through its nearest existing parent", async () => {
    const info = fixture("macos-diskutil-info-data.xml");
    const calls: string[] = [];
    const run = fakeRunner(
      { "df -P -k /System/Volumes/Data/Users": DF_DATA, "diskutil info -plist /System/Volumes/Data": info },
      calls,
    );
    const existing = new Set(["/", "/System", "/System/Volumes", "/System/Volumes/Data", "/System/Volumes/Data/Users"]);
    const realpath = (p: string) => {
      if (!existing.has(p)) throw Object.assign(new Error("ENOENT"), { code: "ENOENT" });
      return p;
    };
    const got = await volumeIdentity("/System/Volumes/Data/Users/new/MaiPai", { platform: "darwin", run, realpath });
    expect(got.relativePath).toBe("Users/new/MaiPai");
    expect(calls[0]).toBe("df -P -k /System/Volumes/Data/Users");
  });

  test("a home folder reached through macOS's firmlink (df says the Data volume, the path does not start with its mount point)", async () => {
    // Found running the real tools on macOS: /Users/dad is on the volume
    // mounted at /System/Volumes/Data, and realpath keeps the /Users form.
    const run = fakeRunner({
      "df -P -k /Users/dad": DF_DATA,
      "diskutil info -plist /System/Volumes/Data": fixture("macos-diskutil-info-data.xml"),
    });
    const got = await volumeIdentity("/Users/dad/MaiPai", { platform: "darwin", run, realpath: (p) => (p === "/Users/dad/MaiPai" ? (() => { throw Object.assign(new Error("ENOENT"), { code: "ENOENT" }); })() : p) });
    expect(got.relativePath).toBe("Users/dad/MaiPai");
  });

  test("a path that is not under its mount point and is no firmlink is a typed error, never a ../ path", async () => {
    const run = fakeRunner({
      "df -P -k /elsewhere": `Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk9s1 100 1 99 1% /Volumes/Odd\n`,
      "diskutil info -plist /Volumes/Odd": `<?xml version="1.0"?><plist version="1.0"><dict><key>VolumeUUID</key><string>U</string></dict></plist>`,
    });
    await expect(volumeIdentity("/elsewhere", { platform: "darwin", run, realpath: realpathId })).rejects.toBeInstanceOf(
      VolumeIdentityUnavailableError,
    );
  });

  test("the volume's own top folder has an empty relative path", async () => {
    const run = fakeRunner({
      "df -P -k /System/Volumes/Data": DF_DATA,
      "diskutil info -plist /System/Volumes/Data": fixture("macos-diskutil-info-data.xml"),
    });
    const got = await volumeIdentity("/System/Volumes/Data", { platform: "darwin", run, realpath: realpathId });
    expect(got.relativePath).toBe("");
  });

  test("a network share: its address is the id, and no credentials are kept", async () => {
    const run = fakeRunner({
      "df -P -k /Volumes/Media/MaiPai": `Filesystem 1024-blocks Used Available Capacity Mounted on\n//guest:@nas._smb._tcp.local/Media 3906887168 100000000 3800000000 3% /Volumes/Media\n`,
    });
    const got = await volumeIdentity("/Volumes/Media/MaiPai", { platform: "darwin", run, realpath: realpathId });
    expect(got).toEqual({ id: "//nas/Media", label: "Media", relativePath: "MaiPai", mountPoint: "/Volumes/Media", network: true });
  });

  test("an NFS export", async () => {
    const run = fakeRunner({
      "df -P -k /Volumes/family": `Filesystem 1024-blocks Used Available Capacity Mounted on\nnas:/export/family 3906887168 100000000 3800000000 3% /Volumes/family\n`,
    });
    const got = await volumeIdentity("/Volumes/family", { platform: "darwin", run, realpath: realpathId });
    expect(got).toMatchObject({ id: "nas:/export/family", network: true, relativePath: "" });
  });

  test("a volume with no UUID is a typed error, not a guess", async () => {
    const xml = `<?xml version="1.0"?><plist version="1.0"><dict><key>VolumeName</key><string>Old</string><key>MountPoint</key><string>/Volumes/Old</string></dict></plist>`;
    const run = fakeRunner({
      "df -P -k /Volumes/Old": `Filesystem 1024-blocks Used Available Capacity Mounted on\n/dev/disk9s1 100 1 99 1% /Volumes/Old\n`,
      "diskutil info -plist /Volumes/Old": xml,
    });
    await expect(volumeIdentity("/Volumes/Old", { platform: "darwin", run, realpath: realpathId })).rejects.toBeInstanceOf(
      VolumeIdentityUnavailableError,
    );
  });

  test("a tool that fails is a VolumeToolError naming the command", async () => {
    const run: CommandRunner = async () => {
      throw new Error("boom");
    };
    let caught: unknown;
    try {
      await volumeIdentity("/x", { platform: "darwin", run, realpath: realpathId });
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(VolumeToolError);
    expect((caught as VolumeToolError).command).toContain("df");
  });
});

describe("findVolume on macOS", () => {
  test("finds a drive that came back under another name, by its UUID", async () => {
    const run = fakeRunner({
      "diskutil list -plist": fixture("macos-diskutil-list.xml"),
      "df -P -k": DF_ALL,
    });
    const got = await findVolume("00000000-0000-4000-8000-000000000001", { platform: "darwin", run });
    expect(got).toEqual({
      id: "00000000-0000-4000-8000-000000000001",
      label: "Macintosh HD - Data",
      mountPoint: "/System/Volumes/Data",
      network: false,
    });
  });

  test("finds a network share by its address", async () => {
    const run = fakeRunner({ "diskutil list -plist": fixture("macos-diskutil-list.xml"), "df -P -k": DF_ALL });
    expect(await findVolume("//nas/Media", { platform: "darwin", run })).toMatchObject({ mountPoint: "/Volumes/Media", network: true });
    expect(await findVolume("nas:/export/family", { platform: "darwin", run })).toMatchObject({ mountPoint: "/Volumes/family" });
  });

  test("null when the drive is not mounted", async () => {
    const run = fakeRunner({ "diskutil list -plist": fixture("macos-diskutil-list.xml"), "df -P -k": DF_ALL });
    expect(await findVolume("ffffffff-0000-4000-8000-000000000000", { platform: "darwin", run })).toBeNull();
  });
});

// Documented util-linux format: `findmnt -P` prints KEY="value" pairs, with
// non-printable characters (a space in a mount point) as \xNN.
const FINDMNT_ONE = `UUID="3c0ffee0-1111-4222-8333-444455556666" LABEL="Big" TARGET="/mnt/big" SOURCE="/dev/sdb1" FSTYPE="ext4"\n`;
const FINDMNT_ALL = [
  `UUID="" LABEL="" TARGET="/proc" SOURCE="proc" FSTYPE="proc"`,
  `UUID="3c0ffee0-1111-4222-8333-444455556666" LABEL="Big" TARGET="/mnt/big" SOURCE="/dev/sdb1" FSTYPE="ext4"`,
  `UUID="" LABEL="" TARGET="/mnt/media" SOURCE="//nas/Media" FSTYPE="cifs"`,
  `UUID="AB12-CD34" LABEL="Photos\\x20Backup" TARGET="/media/dad/Photos\\x20Backup" SOURCE="/dev/sdc1" FSTYPE="exfat"`,
  `UUID="" LABEL="" TARGET="/srv/family" SOURCE="nas:/export/family" FSTYPE="nfs4"`,
].join("\n");

describe("Linux parsers and identity (from the documented format, not captured on Linux)", () => {
  test("findmntInvocation names the tool and asks for one mount by path", () => {
    expect(findmntInvocation("/mnt/big/MaiPai")).toEqual({
      file: "findmnt",
      args: ["-P", "-o", "UUID,LABEL,TARGET,SOURCE,FSTYPE", "-T", "/mnt/big/MaiPai"],
    });
    expect(findmntInvocation()).toEqual({ file: "findmnt", args: ["-P", "-o", "UUID,LABEL,TARGET,SOURCE,FSTYPE"] });
  });

  test("parseFindmnt decodes \\xNN escapes and empty values", () => {
    const rows = parseFindmnt(FINDMNT_ALL);
    expect(rows).toHaveLength(5);
    expect(rows[3]).toEqual({ uuid: "AB12-CD34", label: "Photos Backup", target: "/media/dad/Photos Backup", source: "/dev/sdc1", fsType: "exfat" });
    expect(rows[0]).toMatchObject({ uuid: "", fsType: "proc" });
  });

  test("a local folder", async () => {
    const run = fakeRunner({ "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE -T /mnt/big/MaiPai": FINDMNT_ONE });
    const got = await volumeIdentity("/mnt/big/MaiPai", { platform: "linux", run, realpath: realpathId });
    expect(got).toEqual({
      id: "3c0ffee0-1111-4222-8333-444455556666",
      label: "Big",
      relativePath: "MaiPai",
      mountPoint: "/mnt/big",
      network: false,
    });
  });

  test("a CIFS share and an NFS export use their address", async () => {
    const cifs = fakeRunner({
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE -T /mnt/media/x": `UUID="" LABEL="" TARGET="/mnt/media" SOURCE="//nas/Media" FSTYPE="cifs"\n`,
    });
    expect(await volumeIdentity("/mnt/media/x", { platform: "linux", run: cifs, realpath: realpathId })).toMatchObject({
      id: "//nas/Media",
      network: true,
      relativePath: "x",
    });
    const nfs = fakeRunner({
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE -T /srv/family": `UUID="" LABEL="" TARGET="/srv/family" SOURCE="nas:/export/family" FSTYPE="nfs4"\n`,
    });
    expect(await volumeIdentity("/srv/family", { platform: "linux", run: nfs, realpath: realpathId })).toMatchObject({
      id: "nas:/export/family",
      network: true,
    });
  });

  test("a mount with no UUID that is not a network share (tmpfs) is a typed error", async () => {
    const run = fakeRunner({
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE -T /run/x": `UUID="" LABEL="" TARGET="/run" SOURCE="tmpfs" FSTYPE="tmpfs"\n`,
    });
    await expect(volumeIdentity("/run/x", { platform: "linux", run, realpath: realpathId })).rejects.toBeInstanceOf(
      VolumeIdentityUnavailableError,
    );
  });

  test("findVolume", async () => {
    const run = fakeRunner({ "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE": FINDMNT_ALL });
    expect(await findVolume("ab12-cd34", { platform: "linux", run })).toEqual({
      id: "AB12-CD34",
      label: "Photos Backup",
      mountPoint: "/media/dad/Photos Backup",
      network: false,
    });
    expect(await findVolume("//nas/media", { platform: "linux", run })).toMatchObject({ mountPoint: "/mnt/media" });
    expect(await findVolume("nothing", { platform: "linux", run })).toBeNull();
  });
});

// Documented shape of the PowerShell the module runs: ConvertTo-Json of
// { Volumes: [{ DriveLetter, UniqueId, Label }], Network: [{ DeviceID, ProviderName }] }.
const WIN_JSON = JSON.stringify({
  Volumes: [
    { DriveLetter: "C", UniqueId: "\\\\?\\Volume{11111111-2222-4333-8444-555555555555}\\", Label: "" },
    { DriveLetter: "D", UniqueId: "\\\\?\\Volume{AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE}\\", Label: "Big" },
  ],
  Network: [{ DeviceID: "Z:", ProviderName: "\\\\nas\\Media" }],
});

describe("Windows parsers and identity (from the documented shape, not captured on Windows)", () => {
  test("windowsVolumesInvocation pipes the script through stdin, with no user text in it", () => {
    const inv = windowsVolumesInvocation();
    expect(inv.file).toBe("powershell.exe");
    expect(inv.args).toEqual(["-NoProfile", "-NonInteractive", "-Command", "-"]);
    expect(inv.input).toContain("Get-Volume");
    expect(inv.input).toContain("Win32_LogicalDisk");
  });

  test("parseWindowsVolumes extracts the GUID from UniqueId and maps network drives to their share", () => {
    expect(parseWindowsVolumes(WIN_JSON)).toEqual([
      { letter: "C", id: "11111111-2222-4333-8444-555555555555", label: "", network: false },
      { letter: "D", id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", label: "Big", network: false },
      { letter: "Z", id: "//nas/Media", label: "Media", network: true },
    ]);
  });

  test("parseWindowsVolumes accepts the single-object shape PowerShell emits for one item", () => {
    const one = JSON.stringify({ Volumes: { DriveLetter: "C", UniqueId: "\\\\?\\Volume{11111111-2222-4333-8444-555555555555}\\", Label: "OS" }, Network: [] });
    expect(parseWindowsVolumes(one)).toHaveLength(1);
  });

  const winRun = (calls: string[] = []): CommandRunner => async (file, args, options) => {
    calls.push(`${file} ${args.join(" ")}`);
    expect(options?.input).toContain("Get-Volume");
    return WIN_JSON;
  };

  test("a folder on a drive letter: the volume GUID, not the letter, is the id", async () => {
    const got = await volumeIdentity("D:\\MaiPai\\home\\models", { platform: "win32", run: winRun(), realpath: realpathId });
    expect(got).toEqual({
      id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      label: "Big",
      relativePath: "MaiPai/home/models",
      mountPoint: "D:\\",
      network: false,
    });
  });

  test("a mapped network drive uses the share address", async () => {
    const got = await volumeIdentity("Z:\\MaiPai", { platform: "win32", run: winRun(), realpath: realpathId });
    expect(got).toMatchObject({ id: "//nas/Media", network: true, relativePath: "MaiPai", mountPoint: "Z:\\" });
  });

  test("a UNC path needs no PowerShell: the share is the id", async () => {
    const calls: string[] = [];
    const got = await volumeIdentity("\\\\NAS\\Media\\MaiPai\\backups", { platform: "win32", run: winRun(calls), realpath: realpathId });
    expect(got).toEqual({ id: "//NAS/Media", label: "Media", relativePath: "MaiPai/backups", mountPoint: "\\\\NAS\\Media", network: true });
    expect(calls).toEqual([]);
  });

  test("a drive letter PowerShell does not list is a typed error", async () => {
    await expect(volumeIdentity("Q:\\x", { platform: "win32", run: winRun(), realpath: realpathId })).rejects.toBeInstanceOf(
      VolumeIdentityUnavailableError,
    );
  });

  test("findVolume finds the volume wherever Windows put its letter", async () => {
    const got = await findVolume("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE", { platform: "win32", run: winRun() });
    expect(got).toEqual({ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", label: "Big", mountPoint: "D:\\", network: false });
    expect(await findVolume("//nas/media", { platform: "win32", run: winRun() })).toMatchObject({ mountPoint: "Z:\\" });
  });
});

describe("unsupported platforms", () => {
  test("throw the typed error instead of guessing", async () => {
    await expect(volumeIdentity("/x", { platform: "freebsd", run: fakeRunner({}), realpath: realpathId })).rejects.toBeInstanceOf(
      VolumeIdentityUnavailableError,
    );
    await expect(findVolume("x", { platform: "freebsd", run: fakeRunner({}) })).rejects.toBeInstanceOf(VolumeIdentityUnavailableError);
  });
});

describe("locateOnVolume", () => {
  test("joins the volume's current mount point with the recorded relative path", async () => {
    const run = fakeRunner({ "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE": FINDMNT_ALL });
    expect(await locateOnVolume({ id: "AB12-CD34", relativePath: "MaiPai/home/models" }, { platform: "linux", run })).toBe(
      "/media/dad/Photos Backup/MaiPai/home/models",
    );
    expect(await locateOnVolume({ id: "AB12-CD34", relativePath: "" }, { platform: "linux", run })).toBe("/media/dad/Photos Backup");
    expect(await locateOnVolume({ id: "gone", relativePath: "x" }, { platform: "linux", run })).toBeNull();
  });

  test("uses Windows separators under a Windows mount point", async () => {
    const run: CommandRunner = async () => WIN_JSON;
    expect(await locateOnVolume({ id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee", relativePath: "MaiPai/home" }, { platform: "win32", run })).toBe(
      "D:\\MaiPai\\home",
    );
  });
});
