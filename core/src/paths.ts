import { existsSync, mkdirSync, statSync } from "node:fs";

/** A class folder that must already exist does not (see `ensureDataDir`). */
export class DataDirMissingError extends Error {
  readonly code = "data-dir-missing";
  readonly path: string;
  readonly className: string | undefined;
  constructor(path: string, className?: string) {
    super(
      className
        ? `The "${className}" data folder is missing at ${path}. Refusing to create an empty one: the drive it lives on may not be connected.`
        : `The data folder is missing at ${path}. Refusing to create an empty one: the drive it lives on may not be connected.`,
    );
    this.name = "DataDirMissingError";
    this.path = path;
    this.className = className;
  }
}

export interface EnsureDataDirOptions {
  /** Default true (today's behavior). `false` is the never-create mode for a
   * data-class folder that a person placed on another drive: a missing folder
   * throws `DataDirMissingError` instead of becoming an empty one on the
   * wrong disk. */
  create?: boolean;
  /** The data-class id, named in the error. */
  className?: string;
}

// Owner-only: every directory a product creates through this holds real
// household or client data, never a mode a caller should have to
// remember to pass.
export function ensureDataDir(dir: string, options: EnsureDataDirOptions = {}): void {
  if (existsSync(dir)) return;
  if (options.create === false) throw new DataDirMissingError(dir, options.className);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function statMtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs;
  } catch {
    return null;
  }
}
