// Keeps at-rest encryption keys (a PIN/password pepper, a secrets AES
// key) OUT of a product's own database, so a copied database is useless
// without a second file. Storage per platform:
//   - macOS:   the login Keychain (via `security`), falling back to the key file.
//   - Windows: the key file, its contents DPAPI-protected (CurrentUser scope).
//   - Linux:   a 0600 hex key file (same trust boundary as the DB file itself).
// An operator-set env var always takes precedence; a caller owns that check.
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const DPAPI_PREFIX = "dpapi:";

export class KeystoreProtectionFailedError extends Error {
  constructor(name: string) {
    super(
      `Keystore key "${name}" could not be DPAPI-protected on Windows ` +
        `(PowerShell unavailable, blocked by execution policy, or timed ` +
        `out). Refusing to write the raw key to disk unprotected - that ` +
        `would silently downgrade the at-rest encryption guarantee. Fix ` +
        `PowerShell access and retry.`,
    );
    this.name = "KeystoreProtectionFailedError";
  }
}

export class KeystoreUnavailableError extends Error {
  constructor(name: string) {
    super(
      `Keystore key "${name}" was previously provisioned into the OS keychain ` +
        `but can't be read right now (locked, headless, or the keychain service ` +
        `is unavailable). Refusing to generate a replacement key: doing so would ` +
        `silently invalidate every secret hashed or encrypted with the original ` +
        `one. Unlock the keychain (or run this as an interactive session once) ` +
        `and retry.`,
    );
    this.name = "KeystoreUnavailableError";
  }
}

// ── Windows DPAPI (CurrentUser) via PowerShell ──────────────────────────

// The key material used to be interpolated straight into the `-Command`
// string, visible in Task Manager and PowerShell transcript logging for
// the duration of the call. The script text itself carries no
// interpolation at all and is read from stdin (`-Command -` is
// documented powershell.exe behavior); the actual value crosses the
// process boundary only through the CHILD's own environment, which
// neither Task Manager's command-line column nor PowerShell transcript
// logging (which records the command TEXT, not env values) ever shows.
// Split into a pure builder plus the real execFileSync call so the
// builder itself is directly unit-testable without invoking PowerShell.
const DPAPI_PROTECT_SCRIPT =
  "Add-Type -AssemblyName System.Security; " +
  "$b=[System.Text.Encoding]::UTF8.GetBytes($env:MAIPAI_KEYSTORE_VALUE); " +
  "$e=[System.Security.Cryptography.ProtectedData]::Protect($b,$null,'CurrentUser'); " +
  "[Convert]::ToBase64String($e)";

const DPAPI_UNPROTECT_SCRIPT =
  "Add-Type -AssemblyName System.Security; " +
  "$e=[Convert]::FromBase64String($env:MAIPAI_KEYSTORE_VALUE); " +
  "$d=[System.Security.Cryptography.ProtectedData]::Unprotect($e,$null,'CurrentUser'); " +
  "[System.Text.Encoding]::UTF8.GetString($d)";

export function dpapiProtectInvocation(hex: string): { args: string[]; input: string; env: Record<string, string> } {
  return { args: ["-NoProfile", "-NonInteractive", "-Command", "-"], input: DPAPI_PROTECT_SCRIPT, env: { MAIPAI_KEYSTORE_VALUE: hex } };
}

export function dpapiUnprotectInvocation(blob: string): { args: string[]; input: string; env: Record<string, string> } {
  return {
    args: ["-NoProfile", "-NonInteractive", "-Command", "-"],
    input: DPAPI_UNPROTECT_SCRIPT,
    env: { MAIPAI_KEYSTORE_VALUE: blob.slice(DPAPI_PREFIX.length) },
  };
}

function dpapiProtect(hex: string): string | null {
  try {
    const { args, input, env } = dpapiProtectInvocation(hex);
    const out = execFileSync("powershell", args, { timeout: 8000, input, env: { ...process.env, ...env } });
    return DPAPI_PREFIX + out.toString().trim();
  } catch {
    return null;
  }
}

function dpapiUnprotect(blob: string): string | null {
  try {
    const { args, input, env } = dpapiUnprotectInvocation(blob);
    const out = execFileSync("powershell", args, { timeout: 8000, input, env: { ...process.env, ...env } });
    return out.toString().trim();
  } catch {
    return null;
  }
}

// ── macOS Keychain via `security` ───────────────────────────────────────

/** `add-generic-password ...` for `security -i` (stdin), never an argv
 * element: `-w hex` as an argv element would put the key material in
 * `ps`/Activity Monitor's command-line column for the duration of the
 * call. Pure builder, directly unit-testable without touching the real
 * keychain. Safe to join with plain spaces (no shell involved): `account`
 * is a fixed per-app constant and `service` is always one of the
 * caller's own fixed internal key names, never arbitrary or
 * user-supplied text that could contain a space. */
export function keychainWriteCommand(account: string, service: string, hex: string): string {
  return `add-generic-password -U -a ${account} -s ${service} -w ${hex}\n`;
}

export interface Keystore {
  /** Resolve, or create, a hex key kept outside the database. */
  getOrCreateHexKey(name: string, bytes?: number): string;
  /** Exported (not just internal): the actual provisioning-marker
   * decision logic, separate from the real macOS Keychain calls, which
   * a test deliberately never exercises (the file backend below exists
   * specifically so a test run never touches a real login keychain).
   * Testing these directly is how that logic gets covered without
   * touching the real keychain. */
  markKeychainProvisioned(name: string): void;
  wasKeychainProvisioned(name: string): boolean;
}

export interface KeystoreOptions {
  /** Where the file-backend keys (and the darwin provisioning markers)
   * live. Created 0700 if missing. */
  keysDir: string;
  /** Namespaces this keystore's OS keychain entries
   * (`com.<appId>.keystore.<name>`) and account (`<appId>`), so two
   * products on the same machine never collide in one login keychain. */
  appId: string;
}

/** Creates a keystore rooted at `keysDir`, namespaced by `appId`.
 * `MAIPAI_KEYSTORE_BACKEND=file` forces the file backend even on macOS -
 * a test run's escape hatch so it never touches a real login keychain. */
export function createKeystore(options: KeystoreOptions): Keystore {
  const { keysDir, appId } = options;
  const forceFileBackend = process.env.MAIPAI_KEYSTORE_BACKEND === "file";

  function keyFile(name: string): string {
    return join(keysDir, `${name}.key`);
  }

  // Marks that a key was successfully provisioned into the OS keychain,
  // so a LATER read failure can be told apart from "never provisioned
  // yet". Treating "not found" and "keychain unreadable" identically
  // (as `security find-generic-password` returning null does for both)
  // would silently mint and persist a brand-new key on a locked/headless
  // keychain that already genuinely has one - a silent, permanent
  // lockout for everything already encrypted or hashed with the
  // original key, with no error anywhere. This marker (not a secret,
  // just a flag) lets a read refuse instead of silently minting when it
  // can tell a key SHOULD be there.
  function keychainMarkerFile(name: string): string {
    return join(keysDir, `${name}.keychain-marker`);
  }

  function ensureKeysDir(): void {
    if (!existsSync(keysDir)) mkdirSync(keysDir, { recursive: true, mode: 0o700 });
    try {
      chmodSync(keysDir, 0o700);
    } catch {
      // best-effort on non-POSIX
    }
  }

  function markKeychainProvisioned(name: string): void {
    ensureKeysDir();
    try {
      writeFileSync(keychainMarkerFile(name), "1", { mode: 0o600 });
    } catch {
      // best-effort; a failed write here just means falling back to
      // silent-remint behavior for this key, no worse than not marking
    }
  }

  function wasKeychainProvisioned(name: string): boolean {
    return existsSync(keychainMarkerFile(name));
  }

  function keychainService(name: string): string {
    return `com.${appId}.keystore.${name}`;
  }

  function keychainRead(name: string): string | null {
    try {
      const out = execFileSync("security", ["find-generic-password", "-a", appId, "-s", keychainService(name), "-w"], {
        timeout: 5000,
        stdio: ["ignore", "pipe", "ignore"],
      });
      const val = out.toString().trim();
      return val || null;
    } catch {
      return null; // not found, or the keychain is locked (headless) -> file fallback
    }
  }

  function keychainWrite(name: string, hex: string): boolean {
    try {
      execFileSync("security", ["-i"], {
        timeout: 5000,
        input: keychainWriteCommand(appId, keychainService(name), hex),
        stdio: ["pipe", "ignore", "ignore"],
      });
      return true;
    } catch {
      return false;
    }
  }

  function fileRead(name: string): string | null {
    const path = keyFile(name);
    if (!existsSync(path)) return null;
    try {
      const raw = readFileSync(path, "utf8").trim();
      if (raw.startsWith(DPAPI_PREFIX)) {
        const dec = dpapiUnprotect(raw);
        return dec && /^[0-9a-fA-F]+$/.test(dec) ? dec : null;
      }
      return /^[0-9a-fA-F]+$/.test(raw) ? raw : null;
    } catch {
      return null;
    }
  }

  function fileWrite(name: string, hex: string): void {
    ensureKeysDir();
    const path = keyFile(name);
    let body = hex;
    if (process.platform === "win32") {
      const dpapiBody = dpapiProtect(hex);
      if (!dpapiBody) throw new KeystoreProtectionFailedError(name);
      body = dpapiBody;
    }
    writeFileSync(path, body, { mode: 0o600 });
    try {
      chmodSync(path, 0o600);
    } catch {
      // best-effort on non-POSIX
    }
  }

  function readStored(name: string): string | null {
    if (process.platform === "darwin" && !forceFileBackend) {
      const fromChain = keychainRead(name);
      if (fromChain && /^[0-9a-fA-F]+$/.test(fromChain)) {
        // Mark on a successful READ too, not only on write: a key that
        // was already in the Keychain before this marker existed (or
        // provisioned some other way) would otherwise have no marker,
        // missing the exact upgrade scenario the marker exists for.
        markKeychainProvisioned(name);
        return fromChain;
      }
      if (wasKeychainProvisioned(name)) throw new KeystoreUnavailableError(name);
    }
    return fileRead(name);
  }

  function writeStored(name: string, hex: string): void {
    if (process.platform === "darwin" && !forceFileBackend && keychainWrite(name, hex)) {
      markKeychainProvisioned(name);
      return;
    }
    fileWrite(name, hex);
  }

  return {
    getOrCreateHexKey(name: string, bytes = 32): string {
      const existing = readStored(name);
      if (existing) return existing;
      const fresh = randomBytes(bytes).toString("hex");
      writeStored(name, fresh);
      return fresh;
    },
    markKeychainProvisioned,
    wasKeychainProvisioned,
  };
}
