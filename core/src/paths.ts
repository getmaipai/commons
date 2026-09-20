import { existsSync, mkdirSync, statSync } from "node:fs";

// Owner-only: every directory a product creates through this holds real
// household or client data, never a mode a caller should have to
// remember to pass.
export function ensureDataDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function statMtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}
