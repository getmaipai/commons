// Real hardware detection: the machine facts model sizing, autotuning
// and a "what can this box run" page all consume. Ported from the
// archived legacy hub's lib/hwfit.ts (hard-won logic, kept per the
// org's "copy resolvers/drivers/measurements, never feature scope"
// rule), adapted to Bun idioms.
import { execFile } from "node:child_process";
import { statfsSync } from "node:fs";
import os from "node:os";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CudaDevice {
  index: number;
  name: string;
  vramBytes: number;
  usedVramBytes?: number;
  utilizationPct?: number;
}

export interface HardwareInfo {
  computerName?: string;
  platform: NodeJS.Platform;
  /** Kept alongside `platform` rather than re-read via node:os a second
   * time, so every platform-matching decision (e.g. an engine binary
   * pin) trusts the one real detection. */
  arch: string;
  totalRamGb: number;
  cpuCount: number;
  isAppleSilicon: boolean;
  /** Only meaningful when isAppleSilicon: unified memory available to a
   * model, approximated as total RAM (no separate VRAM concept on
   * Metal). */
  unifiedMemoryGb: number;
  cudaDevices: CudaDevice[];
  /** Only present when a `diskPath` was given to detectHardware(). */
  freeDiskBytes?: number;
  totalDiskBytes?: number;
  osVersion: string;
}

// Spawned async, never sync: a blocking spawnSync intermittently stalls
// the event loop on a loaded backend process, and this can be called
// from a request handler.
export async function detectCudaDevices(): Promise<CudaDevice[]> {
  try {
    const { stdout } = await execFileAsync(
      "nvidia-smi",
      ["--query-gpu=index,name,memory.total,memory.used,utilization.gpu", "--format=csv,noheader,nounits"],
      { timeout: 8_000 },
    );
    return stdout
      .trim()
      .split("\n")
      .flatMap((line): CudaDevice[] => {
        const parts = line.split(",").map((part) => part.trim());
        if (parts.length < 3) return [];
        const index = parseInt(parts[0] ?? "", 10);
        const name = parts[1] ?? "";
        const vramMiB = parseInt(parts[2] ?? "", 10);
        if (Number.isNaN(index) || Number.isNaN(vramMiB)) return [];
        const usedMiB = parseInt(parts[3] ?? "", 10);
        const utilPct = parseInt(parts[4] ?? "", 10);
        return [
          {
            index,
            name,
            vramBytes: vramMiB * 1_048_576,
            usedVramBytes: Number.isNaN(usedMiB) ? undefined : usedMiB * 1_048_576,
            utilizationPct: Number.isNaN(utilPct) ? undefined : utilPct,
          },
        ];
      });
  } catch {
    // No nvidia-smi on PATH (no NVIDIA driver, or a non-NVIDIA box): not
    // an error, just zero CUDA devices. Apple Silicon and CPU-only boxes
    // both take this path.
    return [];
  }
}

function detectIsAppleSilicon(): boolean {
  return process.platform === "darwin" && (os.cpus()[0]?.model ?? "").includes("Apple");
}

async function detectOsVersion(): Promise<string> {
  if (process.platform !== "darwin") return os.release();
  try {
    const { stdout } = await execFileAsync("sw_vers", ["-productVersion"], { timeout: 2_000 });
    return stdout.trim() || os.release();
  } catch {
    return os.release();
  }
}

export interface DetectHardwareOptions {
  /** When given, freeDiskBytes/totalDiskBytes are computed for the
   * filesystem this path lives on (a caller's own data directory).
   * Omitted, those two fields are left undefined - core doesn't assume
   * a product's data layout. */
  diskPath?: string;
}

// A short TTL, not a permanent cache: free VRAM and disk figures should
// stay reasonably fresh (usage changes as other things run), but a
// single page load firing several requests for the same figures within
// the same second shouldn't each spawn their own nvidia-smi/statfs call.
const DETECTION_CACHE_MS = 5_000;
// Keyed by diskPath (or "" for none): a bare Date.now()-gated single slot
// would return one call's disk figures - or its absence - to a very next
// call that asked about a different diskPath within the same TTL window.
const cache = new Map<string, { at: number; info: HardwareInfo }>();
let now = (): number => Date.now();

/** Test-only: substitutes the clock detectHardware()'s cache checks
 * against, so a TTL boundary can be crossed deterministically. */
export function __setClockForTests(clock: (() => number) | null): void {
  now = clock ?? ((): number => Date.now());
}

export async function detectHardware(options: DetectHardwareOptions = {}): Promise<HardwareInfo> {
  const cacheKey = options.diskPath ?? "";
  const cached = cache.get(cacheKey);
  if (cached && now() - cached.at < DETECTION_CACHE_MS) return cached.info;
  const totalRamGb = Math.round(os.totalmem() / 1_073_741_824);
  const isAppleSilicon = detectIsAppleSilicon();
  const cudaDevices = isAppleSilicon ? [] : await detectCudaDevices();
  const disk = options.diskPath ? statfsSync(options.diskPath) : null;
  const info: HardwareInfo = {
    computerName: os.hostname().replace(/\.local$/i, ""),
    platform: process.platform,
    arch: process.arch,
    totalRamGb,
    cpuCount: os.cpus().length,
    isAppleSilicon,
    // No distinct "free VRAM" concept on Metal (unified memory is
    // shared with the OS): use total RAM as the ceiling, same
    // simplification the legacy code made for Apple Silicon's autotune
    // path.
    unifiedMemoryGb: isAppleSilicon ? totalRamGb : 0,
    cudaDevices,
    freeDiskBytes: disk ? disk.bavail * disk.bsize : undefined,
    totalDiskBytes: disk ? disk.blocks * disk.bsize : undefined,
    osVersion: await detectOsVersion(),
  };
  cache.set(cacheKey, { at: now(), info });
  return info;
}

/** Test-only: detectHardware() caches between calls. */
export function __resetHardwareCacheForTests(): void {
  cache.clear();
}

/** Bytes available to a model on this box: the biggest single card's
 * FREE VRAM on CUDA (total minus whatever nvidia-smi reports already in
 * use by another process, so a card already loaded with something else
 * isn't recommended as if it were empty), unified memory on Apple
 * Silicon, or 0 (CPU-only, no automatic recommendation possible)
 * otherwise. Which workload gets which card on a multi-card box is a
 * caller's own placement policy, not this function's. */
export function primaryBudgetBytes(hw: HardwareInfo): number {
  if (hw.isAppleSilicon) return hw.unifiedMemoryGb * 1_073_741_824;
  if (hw.cudaDevices.length === 0) return 0;
  return hw.cudaDevices.reduce((max, device) => Math.max(max, device.vramBytes - (device.usedVramBytes ?? 0)), 0);
}
