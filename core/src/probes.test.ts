import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir, userInfo } from "node:os";
import { join } from "node:path";
import { probeExec, probeHardlink, probeLargeFile, probePermissions, probeSymlink, probeWrite, type ProbeName, type ProbeResult } from "./probes";

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "maipai-probe-"));
});
afterEach(() => {
  chmodSync(dir, 0o700);
  rmSync(dir, { recursive: true, force: true });
});

const left = (): string[] => readdirSync(dir);
const posix = process.platform !== "win32";

describe("capability probes on a real temp folder", () => {
  test("probeWrite passes and removes what it created", async () => {
    const r = await probeWrite(dir);
    expect(r).toMatchObject({ probe: "probeWrite", ok: true });
    expect(left()).toEqual([]);
  });

  test.skipIf(!posix)("probeWrite reports a read-only folder as refused, with the OS code", async () => {
    if (process.getuid?.() === 0) return; // root ignores the mode
    chmodSync(dir, 0o500);
    const r = await probeWrite(dir);
    expect(r.ok).toBe(false);
    expect(r.code).toBe("EACCES");
    expect(r.reason).toContain("cannot write");
  });

  test("probeWrite on a folder that does not exist is a refusal, not a throw", async () => {
    const r = await probeWrite(join(dir, "missing"));
    expect(r.ok).toBe(false);
    expect(r.code).toBe("ENOENT");
  });

  test.skipIf(!posix)("probeExec runs a stored program and removes it", async () => {
    const r = await probeExec(dir);
    expect(r).toMatchObject({ probe: "probeExec", ok: true });
    expect(left()).toEqual([]);
  });

  test.skipIf(!posix)("probeSymlink and probeHardlink pass and clean up", async () => {
    expect(await probeSymlink(dir)).toMatchObject({ ok: true });
    expect(await probeHardlink(dir)).toMatchObject({ ok: true });
    expect(left()).toEqual([]);
  });

  test.skipIf(!posix)("probePermissions sees 600 and 700 kept, then cleans up", async () => {
    expect(await probePermissions(dir)).toMatchObject({ probe: "probePermissions", ok: true });
    expect(left()).toEqual([]);
  });

  test("probePermissions is unknown on Windows, never a guess", async () => {
    const r = await probePermissions(dir, { platform: "win32" });
    expect(r.ok).toBe("unknown");
  });

  test.skipIf(!posix)("probeLargeFile makes a sparse file past 4 GB and removes it (or says unknown when space is short)", async () => {
    const r = await probeLargeFile(dir);
    expect([true, "unknown"]).toContain(r.ok);
    expect(left()).toEqual([]);
  });
});

describe("run-as", () => {
  test.skipIf(!posix)("runs the probe in a child under the named account (here: the current one) and returns its result", async () => {
    const me = userInfo().username;
    const r: ProbeResult = await probeWrite(dir, { runAs: me });
    expect(r).toMatchObject({ probe: "probeWrite", ok: true });
    expect(left()).toEqual([]);
  });

  test.skipIf(!posix)("an account that does not exist is unknown with a plain reason", async () => {
    const r = await probeWrite(dir, { runAs: "no-such-maipai-account" });
    expect(r.ok).toBe("unknown");
    expect(r.reason).toContain("no-such-maipai-account");
  });

  test("on Windows run-as is unknown and says where to run it instead", async () => {
    const names: ProbeName[] = ["probeWrite", "probeExec", "probeSymlink", "probeHardlink", "probeLargeFile", "probePermissions"];
    const fns = [probeWrite, probeExec, probeSymlink, probeHardlink, probeLargeFile, probePermissions];
    for (const [i, fn] of fns.entries()) {
      const r = await fn(dir, { runAs: "svc", platform: "win32" });
      expect(r).toMatchObject({ probe: names[i], ok: "unknown" });
      expect(r.reason).toContain("service account");
    }
  });
});
