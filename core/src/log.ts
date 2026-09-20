import { appendFileSync, readdirSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { format } from "node:util";
import { ensureDataDir } from "./paths";

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;
const DEFAULT_MAX_AGE_DAYS = 14;
const DAY_MS = 86_400_000;

export interface LoggerOptions {
  maxBytes?: number;
  maxAgeDays?: number;
}

export interface Logger {
  /** Appends one line (a trailing newline is added), rotating first when
   * the file has grown past maxBytes. Best-effort: a write failure is
   * swallowed, never thrown - logging must never turn a caller's
   * successful operation into a reported failure. */
  appendLine(line: string): void;
  /** A value that must never reach the log file verbatim (a token, a
   * pepper). Every appendLine call redacts every registered secret. */
  registerSecret(secret: string): void;
  redact(value: string): string;
  /** Mirrors console.log/info/warn/error/debug to this logger too.
   * Idempotent per process (globalThis-backed, survives a hot reload). */
  installConsoleMirror(): void;
  /** Logs an uncaughtException/unhandledRejection, awaits `shutdown`,
   * then exits - a fatal error leaves state a running process can't
   * trust, so this always terminates rather than limping on.
   * Idempotent per process. */
  installFatalErrorHandlers(shutdown?: () => Promise<void>): void;
}

/**
 * A small, size-and-days-rotated append-only log file at
 * `<dir>/<name>.log`. Nothing here reads a product's config: the caller
 * passes its own data directory and log name (one `core` module, every
 * product's own logger).
 */
export function createLogger(dir: string, name: string, options: LoggerOptions = {}): Logger {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxAgeDays = options.maxAgeDays ?? DEFAULT_MAX_AGE_DAYS;
  const secrets = new Set<string>();
  const fileName = `${name}.log`;

  function filePath(): string {
    return join(dir, fileName);
  }

  function redact(value: string): string {
    let result = value;
    for (const secret of secrets) result = result.replaceAll(secret, "[REDACTED]");
    return result;
  }

  function pruneOldRotations(): void {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    const cutoff = Date.now() - maxAgeDays * DAY_MS;
    for (const entry of entries) {
      if (entry === fileName || !entry.startsWith(`${fileName}.`)) continue;
      const full = join(dir, entry);
      try {
        if (statSync(full).mtimeMs < cutoff) unlinkSync(full);
      } catch {
        // already gone, or a permissions blip - best-effort
      }
    }
  }

  function rotateIfNeeded(): void {
    const path = filePath();
    let size = 0;
    try {
      size = statSync(path).size;
    } catch {
      return; // no file yet - nothing to rotate
    }
    if (size < maxBytes) return;
    const rotated = `${path}.${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      renameSync(path, rotated);
    } catch {
      // a concurrent rotation or filesystem hiccup - the file just keeps
      // growing this tick rather than losing the line about to be written
    }
    pruneOldRotations();
  }

  function appendLine(line: string): void {
    try {
      ensureDataDir(dir);
      rotateIfNeeded();
      appendFileSync(filePath(), `${redact(line)}\n`, { mode: 0o600 });
    } catch {
      // best-effort - see this method's own doc comment
    }
  }

  const mirrorKey = `__maipaiConsoleMirror_${name}`;
  function installConsoleMirror(): void {
    const state = globalThis as typeof globalThis & Record<string, boolean | undefined>;
    if (state[mirrorKey]) return;
    state[mirrorKey] = true;
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      const original = console[method].bind(console) as (...args: unknown[]) => void;
      console[method] = (...args: unknown[]) => {
        original(...args);
        appendLine(format(...args));
      };
    }
  }

  const fatalKey = `__maipaiFatalHandlers_${name}`;
  function installFatalErrorHandlers(shutdown: () => Promise<void> = async () => {}): void {
    const state = globalThis as typeof globalThis & Record<string, boolean | undefined>;
    if (state[fatalKey]) return;
    state[fatalKey] = true;
    const exitAfterLogging = async (kind: string, error: unknown): Promise<void> => {
      appendLine(`[fatal] ${kind}: ${error instanceof Error ? (error.stack ?? error.message) : format(error)}`);
      appendLine(`${name} exiting`);
      await shutdown();
      process.exit(1);
    };
    process.on("uncaughtException", (error) => void exitAfterLogging("uncaughtException", error));
    process.on("unhandledRejection", (error) => void exitAfterLogging("unhandledRejection", error));
  }

  return {
    appendLine,
    registerSecret: (secret: string) => {
      if (secret) secrets.add(secret);
    },
    redact,
    installConsoleMirror,
    installFatalErrorHandlers,
  };
}
