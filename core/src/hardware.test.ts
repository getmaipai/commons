import { beforeEach, describe, expect, test } from "bun:test";
import {
  __resetHardwareCacheForTests,
  __setClockForTests,
  detectHardware,
  primaryBudgetBytes,
  type HardwareInfo,
} from "./hardware";

beforeEach(() => {
  __resetHardwareCacheForTests();
  __setClockForTests(null);
});

function hw(overrides: Partial<HardwareInfo>): HardwareInfo {
  return {
    platform: "linux",
    arch: "x64",
    totalRamGb: 32,
    cpuCount: 8,
    isAppleSilicon: false,
    unifiedMemoryGb: 0,
    cudaDevices: [],
    osVersion: "test",
    ...overrides,
  };
}

describe("detectHardware", () => {
  test("resolves real values on this machine, never throws", async () => {
    const info = await detectHardware();
    expect(info.totalRamGb).toBeGreaterThan(0);
    expect(info.cpuCount).toBeGreaterThan(0);
    expect(Array.isArray(info.cudaDevices)).toBe(true);
    expect(info.osVersion).not.toBe("");
    if (info.isAppleSilicon) expect(info.cudaDevices).toEqual([]);
  });

  test("without a diskPath, disk fields are left undefined - core doesn't assume a data layout", async () => {
    const info = await detectHardware();
    expect(info.freeDiskBytes).toBeUndefined();
    expect(info.totalDiskBytes).toBeUndefined();
  });

  test("with a diskPath, disk fields are computed for that filesystem", async () => {
    const info = await detectHardware({ diskPath: "/" });
    expect(info.freeDiskBytes).toBeGreaterThan(0);
    expect(info.totalDiskBytes).toBeGreaterThan(0);
  });

  test("a call without diskPath, then one with diskPath within the TTL, never returns the first call's cached (missing) disk fields", async () => {
    const first = await detectHardware();
    expect(first.freeDiskBytes).toBeUndefined();
    const second = await detectHardware({ diskPath: "/" });
    expect(second.freeDiskBytes).toBeGreaterThan(0);
  });

  test("two different diskPaths within the TTL are cached independently, not conflated", async () => {
    const a = await detectHardware({ diskPath: "/" });
    const b = await detectHardware({ diskPath: "/tmp" });
    expect(a.freeDiskBytes).toBeGreaterThan(0);
    expect(b.freeDiskBytes).toBeGreaterThan(0);
    // Re-fetching "/" within the TTL returns the same cached object as
    // the first "/" call, not "/tmp"'s.
    const aAgain = await detectHardware({ diskPath: "/" });
    expect(aAgain).toBe(a);
  });

  test("caches within its TTL", async () => {
    let t = 0;
    __setClockForTests(() => t);
    const first = await detectHardware();
    t += 4_000;
    const second = await detectHardware();
    expect(second).toBe(first);
    t += 2_000;
    const third = await detectHardware();
    expect(third).not.toBe(first);
    expect(third).toEqual(first);
  });
});

describe("primaryBudgetBytes", () => {
  test("Apple Silicon: unified memory in bytes", () => {
    expect(primaryBudgetBytes(hw({ isAppleSilicon: true, unifiedMemoryGb: 24 }))).toBe(24 * 1_073_741_824);
  });

  test("CPU-only box: zero", () => {
    expect(primaryBudgetBytes(hw({}))).toBe(0);
  });

  test("single CUDA device: that device's VRAM", () => {
    expect(primaryBudgetBytes(hw({ cudaDevices: [{ index: 0, name: "RTX 3070", vramBytes: 8_589_934_592 }] }))).toBe(8_589_934_592);
  });

  test("multiple CUDA devices: the biggest single card's free VRAM", () => {
    expect(
      primaryBudgetBytes(
        hw({
          cudaDevices: [
            { index: 0, name: "RTX 2070 Super", vramBytes: 8_589_934_592 },
            { index: 1, name: "RTX 3070", vramBytes: 8_589_934_592 },
          ],
        }),
      ),
    ).toBe(8_589_934_592);
  });

  test("a card with another workload counts only free VRAM", () => {
    expect(
      primaryBudgetBytes(
        hw({ cudaDevices: [{ index: 0, name: "RTX 3070", vramBytes: 8_589_934_592, usedVramBytes: 2_147_483_648 }] }),
      ),
    ).toBe(8_589_934_592 - 2_147_483_648);
  });
});
