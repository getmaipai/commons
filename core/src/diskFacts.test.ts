import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diskFacts } from "./diskFacts";
import { diskSpace } from "./hardware";
import { lsblkInvocation, mountInvocation, parseLsblk, parseMount, parseWindowsDisk, windowsDiskInvocation, type CommandRunner } from "./volumeIdentity";

const fixture = (name: string): string => readFileSync(new URL(`./testdata/volume/${name}`, import.meta.url), "utf8");
const space = () => ({ freeBytes: 100, totalBytes: 1000 });
const id = (p: string) => p;

// Replies keyed by the command line; an unlisted command rejects.
function runner(replies: Record<string, string>): CommandRunner {
  return async (file, args) => {
    const key = [file, ...args].join(" ");
    const hit = replies[key];
    if (hit === undefined) throw new Error(`unexpected command: ${key}`);
    return hit;
  };
}

describe("diskFacts on macOS (diskutil output captured on a real Mac)", () => {
  const df = `Filesystem   1024-blocks      Used Available Capacity  Mounted on\n/dev/disk3s1   971350180 763874072 169956992    82%    /System/Volumes/Data\n`;
  const info = fixture("macos-diskutil-info-data.xml");
  const replies = {
    "df -P -k /Users/x": df,
    "diskutil info -plist /System/Volumes/Data": info,
  };

  test("the internal SSD: type, kind, medium, physical store, space", async () => {
    const f = await diskFacts("/Users/x", { platform: "darwin", run: runner(replies), realpath: id, space });
    expect(f).toMatchObject({
      filesystem: "apfs",
      kind: "internal",
      medium: "solid-state",
      physicalDisk: "disk0s2",
      ownershipIgnored: false,
      noexec: "unknown",
      freeBytes: 100,
      totalBytes: 1000,
    });
    expect(f.identity.id).toBe("00000000-0000-4000-8000-000000000001");
  });

  test("an external spinning drive with ownership ignored", async () => {
    const ext = info
      .replace(/(<key>Internal<\/key>\s*)<true\/>/, "$1<false/>")
      .replace(/(<key>RemovableMediaOrExternalDevice<\/key>\s*)<false\/>/, "$1<true/>")
      .replace(/(<key>SolidState<\/key>\s*)<true\/>/, "$1<false/>")
      .replace(/(<key>GlobalPermissionsEnabled<\/key>\s*)<true\/>/, "$1<false/>");
    const f = await diskFacts("/Users/x", { platform: "darwin", run: runner({ ...replies, "diskutil info -plist /System/Volumes/Data": ext }), realpath: id, space });
    expect(f).toMatchObject({ kind: "external", medium: "spinning", ownershipIgnored: true });
  });

  test("a RAID set that reports no physical store gives unknown, not a guess", async () => {
    const raid = info.replace(/<key>APFSPhysicalStores<\/key>\s*<array>[\s\S]*?<\/array>/, "<key>APFSPhysicalStores</key><array></array>");
    const f = await diskFacts("/Users/x", { platform: "darwin", run: runner({ ...replies, "diskutil info -plist /System/Volumes/Data": raid }), realpath: id, space });
    expect(f.physicalDisk).toBe("unknown");
  });

  test("an SMB share is network, its type from mount, and has no medium or disk", async () => {
    const run = runner({
      "df -P -k /Volumes/Media": `Filesystem 1024-blocks Used Available Capacity Mounted on\n//guest:@nas._smb._tcp.local/Media 3906887168 100000000 3800000000 3% /Volumes/Media\n`,
      mount: "//guest@nas._smb._tcp.local/Media on /Volumes/Media (smbfs, nodev, nosuid, mounted by jo)\n/dev/disk3s1 on /System/Volumes/Data (apfs, local)\n",
    });
    const f = await diskFacts("/Volumes/Media", { platform: "darwin", run, realpath: id, space });
    expect(f).toMatchObject({ kind: "network", filesystem: "smbfs", medium: "unknown", physicalDisk: "unknown" });
  });

  test("the volume identity is required: no diskutil answer means no facts", async () => {
    const run = runner({ "df -P -k /Users/x": df });
    await expect(diskFacts("/Users/x", { platform: "darwin", run, realpath: id, space })).rejects.toThrow();
  });
});

const FINDMNT = (src: string, fs: string, opts: string, uuid = "AB12-CD34") => `UUID="${uuid}" LABEL="" TARGET="/mnt/big" SOURCE="${src}" FSTYPE="${fs}" OPTIONS="${opts}"\n`;
const lsblkCmd = (src: string) => `lsblk -P -s -o NAME,TYPE,RM,ROTA,TRAN ${src}`;

describe("diskFacts on Linux (from the tools' documented output, not captured)", () => {
  const base = (findmnt: string, lsblk: string, src: string): CommandRunner =>
    runner({
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /mnt/big/MaiPai": findmnt,
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /mnt/big": findmnt,
      [lsblkCmd(src)]: lsblk,
    });

  test("an internal NVMe SSD", async () => {
    const run = base(
      FINDMNT("/dev/nvme0n1p2", "ext4", "rw,relatime"),
      `NAME="nvme0n1p2" TYPE="part" RM="0" ROTA="0" TRAN=""\nNAME="nvme0n1" TYPE="disk" RM="0" ROTA="0" TRAN="nvme"\n`,
      "/dev/nvme0n1p2",
    );
    const f = await diskFacts("/mnt/big/MaiPai", { platform: "linux", run, realpath: id, space });
    expect(f).toMatchObject({ filesystem: "ext4", kind: "internal", medium: "solid-state", physicalDisk: "nvme0n1", noexec: false });
  });

  test("a USB spinning disk mounted noexec", async () => {
    const run = base(
      FINDMNT("/dev/sdb1", "exfat", "rw,nosuid,nodev,noexec,relatime"),
      `NAME="sdb1" TYPE="part" RM="1" ROTA="1" TRAN=""\nNAME="sdb" TYPE="disk" RM="1" ROTA="1" TRAN="usb"\n`,
      "/dev/sdb1",
    );
    const f = await diskFacts("/mnt/big/MaiPai", { platform: "linux", run, realpath: id, space });
    expect(f).toMatchObject({ kind: "external", medium: "spinning", physicalDisk: "sdb", noexec: true });
  });

  test("LVM on one disk names that disk", async () => {
    const run = base(
      FINDMNT("/dev/mapper/vg-data", "ext4", "rw"),
      `NAME="vg-data" TYPE="lvm" RM="0" ROTA="0" TRAN=""\nNAME="sda2" TYPE="part" RM="0" ROTA="0" TRAN=""\nNAME="sda" TYPE="disk" RM="0" ROTA="0" TRAN="sata"\n`,
      "/dev/mapper/vg-data",
    );
    expect((await diskFacts("/mnt/big/MaiPai", { platform: "linux", run, realpath: id, space })).physicalDisk).toBe("sda");
  });

  test("an md RAID over two disks gives unknown for the disk", async () => {
    const run = base(
      FINDMNT("/dev/md0", "ext4", "rw"),
      `NAME="md0" TYPE="raid1" RM="0" ROTA="0" TRAN=""\nNAME="sda" TYPE="disk" RM="0" ROTA="0" TRAN="sata"\nNAME="sdb" TYPE="disk" RM="0" ROTA="0" TRAN="sata"\n`,
      "/dev/md0",
    );
    const f = await diskFacts("/mnt/big/MaiPai", { platform: "linux", run, realpath: id, space });
    expect(f.physicalDisk).toBe("unknown");
    expect(f.medium).toBe("unknown");
    expect(f.filesystem).toBe("ext4");
  });

  test("a btrfs subvolume source loses its [/subvol] suffix", () => {
    expect(lsblkInvocation("/dev/sda2[/@data]")).toEqual({ file: "lsblk", args: ["-P", "-s", "-o", "NAME,TYPE,RM,ROTA,TRAN", "/dev/sda2"] });
  });

  test("a tmpfs source has no lsblk query and the disk stays unknown", async () => {
    expect(lsblkInvocation("tmpfs")).toBeNull();
    const run = runner({ "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /mnt/big": FINDMNT("tmpfs", "tmpfs", "rw,noexec", "x") });
    const f = await diskFacts("/mnt/big", { platform: "linux", run, realpath: id, space });
    expect(f).toMatchObject({ filesystem: "tmpfs", physicalDisk: "unknown", noexec: true });
  });

  test("an NFS share is network and the disk is not asked for", async () => {
    const run = runner({
      "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /srv/family": `UUID="" LABEL="" TARGET="/srv/family" SOURCE="nas:/export/family" FSTYPE="nfs4" OPTIONS="rw,vers=4.2"\n`,
    });
    const f = await diskFacts("/srv/family", { platform: "linux", run, realpath: id, space });
    expect(f).toMatchObject({ kind: "network", filesystem: "nfs4", physicalDisk: "unknown", medium: "unknown", noexec: false });
  });

  test("lsblk failing leaves the disk unknown but keeps the mount facts", async () => {
    const run = runner({ "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /mnt/big": FINDMNT("/dev/sdb1", "ext4", "rw") });
    const f = await diskFacts("/mnt/big", { platform: "linux", run, realpath: id, space });
    expect(f).toMatchObject({ filesystem: "ext4", physicalDisk: "unknown", noexec: false });
  });

  test("parseLsblk reads flags and transport", () => {
    expect(parseLsblk(`NAME="sdb" TYPE="disk" RM="1" ROTA="1" TRAN="usb"\nNAME="x" TYPE="part" RM="" ROTA="" TRAN=""\n`)).toEqual([
      { name: "sdb", type: "disk", removable: true, rotational: true, transport: "usb" },
      { name: "x", type: "part", removable: null, rotational: null, transport: "" },
    ]);
  });
});

const WIN_VOLUMES = JSON.stringify({
  Volumes: [
    { DriveLetter: "C", UniqueId: "\\\\?\\Volume{11111111-2222-4333-8444-555555555555}\\", Label: "OS", FileSystem: "NTFS", DriveType: "Fixed" },
    { DriveLetter: "D", UniqueId: "\\\\?\\Volume{AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE}\\", Label: "Big", FileSystem: "exFAT", DriveType: "Removable" },
  ],
  Network: [],
});

describe("diskFacts on Windows (from the documented shape, not captured)", () => {
  const winRun = (disk: string | Error): CommandRunner => async (_file, _args, options) => {
    const input = options?.input ?? "";
    if (input.includes("Get-Volume")) return WIN_VOLUMES;
    if (input.includes("Get-Partition")) {
      if (disk instanceof Error) throw disk;
      return disk;
    }
    throw new Error("unexpected script");
  };

  test("an internal NVMe SSD", async () => {
    const f = await diskFacts("C:\\MaiPai", { platform: "win32", run: winRun(JSON.stringify({ DiskNumber: "0", BusType: "NVMe", MediaType: "SSD" })), realpath: id, space });
    expect(f).toMatchObject({ filesystem: "ntfs", kind: "internal", medium: "solid-state", physicalDisk: "0" });
  });

  test("a USB hard disk", async () => {
    const f = await diskFacts("D:\\MaiPai", { platform: "win32", run: winRun(JSON.stringify({ DiskNumber: "1", BusType: "USB", MediaType: "HDD" })), realpath: id, space });
    expect(f).toMatchObject({ filesystem: "exfat", kind: "external", medium: "spinning", physicalDisk: "1" });
  });

  test("Storage Spaces hides the disks: unknown", async () => {
    const f = await diskFacts("C:\\MaiPai", { platform: "win32", run: winRun(JSON.stringify({ DiskNumber: "3", BusType: "Spaces", MediaType: "Unspecified" })), realpath: id, space });
    expect(f.physicalDisk).toBe("unknown");
    expect(f.medium).toBe("unknown");
  });

  test("a failing Get-Disk keeps the volume facts and leaves the disk unknown", async () => {
    const f = await diskFacts("C:\\MaiPai", { platform: "win32", run: winRun(new Error("no access")), realpath: id, space });
    expect(f).toMatchObject({ filesystem: "ntfs", physicalDisk: "unknown", medium: "unknown" });
  });

  test("a UNC share is network with nothing else reported", async () => {
    const f = await diskFacts("\\\\nas\\Media\\MaiPai", { platform: "win32", run: winRun(new Error("unused")), realpath: id, space });
    expect(f).toMatchObject({ kind: "network", filesystem: "unknown", physicalDisk: "unknown" });
  });

  test("the disk script holds only a validated drive letter", () => {
    expect(windowsDiskInvocation("d").input).toContain("-DriveLetter D ");
    expect(() => windowsDiskInvocation("D; calc")).toThrow();
    expect(parseWindowsDisk(JSON.stringify({ DiskNumber: "", BusType: "", MediaType: "Unspecified" }))).toEqual({ diskNumber: null, busType: "", mediaType: "" });
  });
});

describe("shared pieces", () => {
  test("mount output parsing for macOS network types", () => {
    expect(mountInvocation()).toEqual({ file: "mount", args: [] });
    expect(parseMount("nas:/export on /Volumes/family (nfs, nodev)\n")).toEqual([{ source: "nas:/export", mountPoint: "/Volumes/family", fsType: "nfs" }]);
  });

  test("free and total come from the one shared diskSpace helper, a failure gives unknown", async () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-df-"));
    try {
      const real = diskSpace(dir);
      expect(real.freeBytes).toBeGreaterThan(0);
      expect(real.totalBytes).toBeGreaterThanOrEqual(real.freeBytes);
      const run = runner({
        "findmnt -P -o UUID,LABEL,TARGET,SOURCE,FSTYPE,OPTIONS -T /mnt/big": FINDMNT("tmpfs", "tmpfs", "rw", "x"),
      });
      const f = await diskFacts("/mnt/big", {
        platform: "linux",
        run,
        realpath: id,
        space: () => {
          throw new Error("statfs failed");
        },
      });
      expect(f.freeBytes).toBe("unknown");
      expect(f.totalBytes).toBe("unknown");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("diskFacts against this machine (real tools, a temp folder)", () => {
  test.skipIf(process.platform === "win32")("a temp folder reports a filesystem and real free space", async () => {
    const dir = mkdtempSync(join(tmpdir(), "maipai-facts-"));
    try {
      const f = await diskFacts(join(dir, "not-created-yet"));
      expect(f.identity.id.length).toBeGreaterThan(0);
      expect(typeof f.freeBytes).toBe("number");
      expect(typeof f.totalBytes).toBe("number");
      for (const v of [f.filesystem, f.kind, f.medium, f.physicalDisk]) expect(typeof v).toBe("string");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
