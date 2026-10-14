// Capability probes for the data-location placement check (home docs/dev.md,
// DATA-LOCATION (b)): each one tries a small real operation in a folder and
// says what the filesystem allowed. Which class needs which probe is the
// placement check's business (DATA-LOCATION-01f), not this module's.
//
// Every probe makes its own uniquely named temp entry in the target folder,
// removes everything it created whether it passed or not, and never throws:
// a failure is a result with a plain reason. Unreadable or untestable means
// `ok: "unknown"`, never a guess.
//
// Run-as: the installer runs as root and the service as another account, and
// the folder has to work for the service. With `runAs`, the probe runs in a
// child process under that account (POSIX: the child is started with that
// account's uid and gid, which needs the caller to be root or that account).
// The child is this very module run as a script. Windows cannot switch
// account without a credential, so there `runAs` yields "unknown" with the
// reason; the installer runs the probe from the service account's own
// session instead. REAL-OS SEAM: `runInChild` is the only code that spawns.
import { execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  fsyncSync,
  ftruncateSync,
  fstatSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { diskSpace } from "./hardware";

export type ProbeName = "probeWrite" | "probeExec" | "probeSymlink" | "probeHardlink" | "probeLargeFile" | "probePermissions";

export interface ProbeResult {
  probe: ProbeName;
  /** true: the filesystem allowed it. false: it refused (see `reason`).
   * "unknown": the probe could not be run here (see `reason`). */
  ok: boolean | "unknown";
  /** One plain sentence on what happened; the placement check words its own
   * message from `ok` and `code`. */
  reason: string;
  /** The OS error code when an operation was refused (`EACCES`, `EPERM`,
   * `EFBIG`, `EROFS`, `ENOSPC`). */
  code?: string;
}

export interface ProbeOptions {
  /** Run the probe as this account (see the module header). */
  runAs?: string;
  platform?: NodeJS.Platform;
}

/** A sparse file just past 4 GiB: the FAT32 limit is 4 GiB minus one byte. */
export const LARGE_FILE_BYTES = 4 * 1024 ** 3 + 1;

function entry(dir: string, probe: string): string {
  return join(dir, `.maipai-probe-${probe}-${randomBytes(6).toString("hex")}`);
}

function codeOf(err: unknown): string | undefined {
  return (err as NodeJS.ErrnoException)?.code;
}

function refused(probe: ProbeName, err: unknown, what: string): ProbeResult {
  const code = codeOf(err);
  return { probe, ok: false, code, reason: `${what}${code ? ` (${code})` : ""}.` };
}

function cleanup(...paths: string[]): void {
  for (const p of paths) {
    try {
      rmSync(p, { recursive: true, force: true });
    } catch {
      // Nothing more can be done; the next probe's entry has its own name.
    }
  }
}

function writeProbe(dir: string): ProbeResult {
  const file = entry(dir, "write");
  const sub = entry(dir, "dir");
  try {
    const fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600);
    try {
      writeSync(fd, "maipai");
      fsyncSync(fd); // a filesystem that cannot fsync (some network shares) fails here
    } finally {
      closeSync(fd);
    }
    if (readFileSync(file, "utf8") !== "maipai") return { probe: "probeWrite", ok: false, reason: "The folder accepted a file but returned different contents when it was read back." };
    mkdirSync(sub);
    return { probe: "probeWrite", ok: true, reason: "A file and a folder were created, flushed to disk and read back." };
  } catch (err) {
    return refused("probeWrite", err, "This account cannot write to the folder");
  } finally {
    cleanup(file, sub);
  }
}

function execProbe(dir: string, platform: NodeJS.Platform): Promise<ProbeResult> {
  const windows = platform === "win32";
  const file = entry(dir, "exec") + (windows ? ".cmd" : "");
  return new Promise((resolve) => {
    const done = (r: ProbeResult): void => {
      cleanup(file);
      resolve(r);
    };
    try {
      writeFileSync(file, windows ? "@exit /b 0\r\n" : "#!/bin/sh\nexit 0\n", { mode: 0o755 });
      chmodSync(file, 0o755);
    } catch (err) {
      return done(refused("probeExec", err, "A test program could not be written to the folder"));
    }
    const [bin, args] = windows ? ["cmd.exe", ["/c", file]] : [file, []];
    execFile(bin, args, { timeout: 10_000 }, (err) => {
      if (!err) return done({ probe: "probeExec", ok: true, reason: "A program stored in the folder ran." });
      const code = codeOf(err);
      done({
        probe: "probeExec",
        ok: false,
        code: typeof code === "string" ? code : undefined,
        reason: `A program stored in the folder would not run${typeof code === "string" ? ` (${code})` : ""}; the volume is probably mounted with programs disabled.`,
      });
    });
  });
}

function symlinkProbe(dir: string): ProbeResult {
  const target = entry(dir, "symtarget");
  const link = entry(dir, "symlink");
  try {
    writeFileSync(target, "x");
    symlinkSync(target, link);
    if (!lstatSync(link).isSymbolicLink() || readlinkSync(link) !== target) return { probe: "probeSymlink", ok: false, reason: "The folder created a link that does not behave as a symbolic link." };
    return { probe: "probeSymlink", ok: true, reason: "A symbolic link was created and read back." };
  } catch (err) {
    return refused("probeSymlink", err, "The folder does not support symbolic links");
  } finally {
    cleanup(link, target);
  }
}

function hardlinkProbe(dir: string): ProbeResult {
  const a = entry(dir, "hardA");
  const b = entry(dir, "hardB");
  try {
    writeFileSync(a, "x");
    linkSync(a, b);
    if (statSync(a).nlink < 2) return { probe: "probeHardlink", ok: false, reason: "The folder created a second name that is not a hard link." };
    return { probe: "probeHardlink", ok: true, reason: "A hard link was created." };
  } catch (err) {
    return refused("probeHardlink", err, "The folder does not support hard links");
  } finally {
    cleanup(a, b);
  }
}

function largeFileProbe(dir: string): ProbeResult {
  const file = entry(dir, "large");
  let fd: number | null = null;
  try {
    // A filesystem without sparse files (exFAT, FAT32 refuses outright) would
    // really allocate 4 GiB: with less room than that, the test cannot be
    // made safely.
    let free: number | null = null;
    try {
      free = diskSpace(dir).freeBytes;
    } catch {
      free = null;
    }
    if (free !== null && free < LARGE_FILE_BYTES + 512 * 1024 ** 2) {
      return { probe: "probeLargeFile", ok: "unknown", reason: "There is not enough free space to test a file larger than 4 GB." };
    }
    fd = openSync(file, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR, 0o600);
    ftruncateSync(fd, LARGE_FILE_BYTES);
    const marker = Buffer.from("Z");
    writeSync(fd, marker, 0, 1, LARGE_FILE_BYTES - 1);
    const size = fstatSync(fd).size;
    const back = Buffer.alloc(1);
    readSync(fd, back, 0, 1, LARGE_FILE_BYTES - 1);
    if (size !== LARGE_FILE_BYTES || !back.equals(marker)) return { probe: "probeLargeFile", ok: false, reason: "The folder cut a file larger than 4 GB short." };
    return { probe: "probeLargeFile", ok: true, reason: "A file just over 4 GB was created and read back." };
  } catch (err) {
    const code = codeOf(err);
    const where = code === "EFBIG" || code === "EINVAL" ? "The folder's filesystem cannot hold a file larger than 4 GB" : "A file larger than 4 GB could not be created";
    return refused("probeLargeFile", err, where);
  } finally {
    if (fd !== null) closeSync(fd);
    cleanup(file);
  }
}

function permissionsProbe(dir: string, platform: NodeJS.Platform): ProbeResult {
  if (platform === "win32") {
    return { probe: "probePermissions", ok: "unknown", reason: "Windows controls access with access lists rather than file modes, so private mode bits cannot be tested here." };
  }
  const file = entry(dir, "perm");
  const sub = entry(dir, "permdir");
  try {
    writeFileSync(file, "x", { mode: 0o600 });
    chmodSync(file, 0o600);
    mkdirSync(sub, { mode: 0o700 });
    chmodSync(sub, 0o700);
    const fileMode = statSync(file).mode & 0o777;
    const dirMode = statSync(sub).mode & 0o777;
    if (fileMode !== 0o600 || dirMode !== 0o700) {
      return {
        probe: "probePermissions",
        ok: false,
        reason: `The folder does not keep private permissions: a file set to 600 reads back as ${fileMode.toString(8)} and a folder set to 700 as ${dirMode.toString(8)}, so any account on this computer can read what is stored here.`,
      };
    }
    return { probe: "probePermissions", ok: true, reason: "A file set to owner-only access stayed owner-only." };
  } catch (err) {
    return refused("probePermissions", err, "File permissions could not be set in the folder");
  } finally {
    cleanup(file, sub);
  }
}

// ── Child process (run-as) ───────────────────────────────────────────────

const PROBES: Record<ProbeName, (dir: string, platform: NodeJS.Platform) => ProbeResult | Promise<ProbeResult>> = {
  probeWrite: writeProbe,
  probeExec: execProbe,
  probeSymlink: symlinkProbe,
  probeHardlink: hardlinkProbe,
  probeLargeFile: largeFileProbe,
  probePermissions: permissionsProbe,
};

function lookup(account: string, flag: "-u" | "-g"): Promise<number> {
  return new Promise((resolve, reject) => {
    execFile("id", [flag, account], { timeout: 5_000 }, (err, stdout) => {
      const n = Number.parseInt(stdout.trim(), 10);
      if (err || Number.isNaN(n)) reject(err ?? new Error("no such account"));
      else resolve(n);
    });
  });
}

function runInChild(probe: ProbeName, dir: string, account: string): Promise<ProbeResult> {
  return (async () => {
    let uid: number;
    let gid: number;
    try {
      [uid, gid] = await Promise.all([lookup(account, "-u"), lookup(account, "-g")]);
    } catch {
      return { probe, ok: "unknown" as const, reason: `There is no account named ${account} on this computer.` };
    }
    return new Promise<ProbeResult>((resolve) => {
      execFile(process.execPath, [fileURLToPath(import.meta.url), probe, dir], { uid, gid, timeout: 60_000, encoding: "utf8" }, (err, stdout) => {
        try {
          resolve(JSON.parse(stdout.trim().split("\n").pop() ?? "") as ProbeResult);
        } catch {
          resolve({
            probe,
            ok: "unknown",
            code: codeOf(err),
            reason: `The probe could not be run as ${account}${codeOf(err) ? ` (${codeOf(err)})` : ""}; run it from that account's own session.`,
          });
        }
      });
    });
  })();
}

async function run(probe: ProbeName, dir: string, options: ProbeOptions): Promise<ProbeResult> {
  const platform = options.platform ?? process.platform;
  if (options.runAs) {
    if (platform === "win32") {
      return { probe, ok: "unknown", reason: `Windows cannot run a test as ${options.runAs} without that account's password; run it from the service account's own session.` };
    }
    return runInChild(probe, dir, options.runAs);
  }
  return PROBES[probe](dir, platform);
}

/** Can this account create, flush and read back a file and a folder here? */
export const probeWrite = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probeWrite", dir, options);
/** Can a program stored here run (not a `noexec` mount)? */
export const probeExec = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probeExec", dir, options);
/** Does the folder support symbolic links? */
export const probeSymlink = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probeSymlink", dir, options);
/** Does the folder support hard links? */
export const probeHardlink = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probeHardlink", dir, options);
/** Can the folder hold a file past 4 GB (a sparse file, removed after)? */
export const probeLargeFile = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probeLargeFile", dir, options);
/** Does the folder keep owner-only permissions? */
export const probePermissions = (dir: string, options: ProbeOptions = {}): Promise<ProbeResult> => run("probePermissions", dir, options);

// `bun probes.ts <probe> <dir>` prints one JSON result: the run-as child.
if (import.meta.main) {
  const [name, dir] = process.argv.slice(2);
  const fn = PROBES[name as ProbeName];
  if (!fn || !dir) {
    process.stdout.write(JSON.stringify({ probe: name, ok: "unknown", reason: "Unknown probe or no folder given." }) + "\n");
    process.exit(2);
  }
  void Promise.resolve(fn(dir, process.platform)).then((r) => process.stdout.write(JSON.stringify(r) + "\n"));
}
