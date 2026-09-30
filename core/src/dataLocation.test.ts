import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DataFolderMarkerInvalidError,
  DataFolderMarkerMissingError,
  DataLocationInvalidError,
  DataLocationPathError,
  DataLocationSchemaError,
  checkFolderMarker,
  classGeneration,
  dataDirFromEnv,
  dataLocationPath,
  folderMarkerPath,
  isRecordOwnedBy,
  readDataLocation,
  readFolderMarker,
  resolveClassLocation,
  resolveClassPath,
  retireFolderMarker,
  writeDataLocation,
  writeFolderMarker,
  type ClassPathDecl,
} from "./dataLocation";
import { DataDirMissingError } from "./paths";
import type { DataLocation } from "@maipai/spec/gen/ts/data-location.js";

const HOUSEHOLD = "01J9ZK3M8Q4V6X2B7D5F0HRTAN";
const MOVE = "01J9ZK5C1R7W3Y9A2E4G6JNPQS";
const OTHER_MOVE = "01J9ZK7D2S8X4Z0B3F5H7KQRTV";
const AT = "2026-09-30T21:04:00Z";

function record(overrides: Partial<DataLocation> = {}): DataLocation {
  return {
    schema: 2,
    productRoot: "/usr/local/maipai-home",
    householdFolderId: HOUSEHOLD,
    root: { path: "/Volumes/Mirror/MaiPai" },
    classes: {},
    writtenAt: AT,
    writtenBy: "init",
    move: null,
    ...overrides,
  };
}

const records: ClassPathDecl = { id: "records", default: { base: "root", subpath: "" } };
const models: ClassPathDecl = { id: "models", default: { base: "root", subpath: "models" } };
const wakewords: ClassPathDecl = { id: "wakeword-models", default: { base: "root", subpath: "voice/wakewords" } };
const backups: ClassPathDecl = { id: "backups", default: { base: "beside-root", subpath: "backups" } };

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "maipai-core-dataloc-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("dataLocationPath", () => {
  test("defaults to ~/.maipai/<product>/data-location.json on macOS and Linux", () => {
    expect(dataLocationPath("home", { platform: "darwin", homeDir: "/Users/dad", env: {} })).toBe(
      "/Users/dad/.maipai/home/data-location.json",
    );
    expect(dataLocationPath("stack", { platform: "linux", homeDir: "/opt/maipai-home", env: {} })).toBe(
      "/opt/maipai-home/.maipai/stack/data-location.json",
    );
  });

  test("uses %LOCALAPPDATA%\\MaiPai\\<product>\\ on Windows, falling back to AppData\\Local", () => {
    expect(
      dataLocationPath("home", { platform: "win32", homeDir: "C:\\Users\\dad", env: { LOCALAPPDATA: "C:\\Users\\dad\\AppData\\Local" } }),
    ).toBe("C:\\Users\\dad\\AppData\\Local\\MaiPai\\home\\data-location.json");
    expect(dataLocationPath("home", { platform: "win32", homeDir: "C:\\Users\\dad", env: {} })).toBe(
      "C:\\Users\\dad\\AppData\\Local\\MaiPai\\home\\data-location.json",
    );
  });

  test("MAIPAI_DATA_LOCATION_PATH overrides it, the way MAIPAI_HUB_LOCK_PATH overrides the lock", () => {
    expect(
      dataLocationPath("home", { platform: "darwin", homeDir: "/Users/dad", env: { MAIPAI_DATA_LOCATION_PATH: "/tmp/x/record.json" } }),
    ).toBe("/tmp/x/record.json");
  });
});

describe("readDataLocation and writeDataLocation", () => {
  test("round-trips a record", () => {
    const file = join(dir, "lock", "data-location.json");
    const rec = record({ classes: { models: { path: "/Volumes/Big/MaiPai/home/models", generation: 2 } } });
    writeDataLocation(file, rec);
    expect(readDataLocation(file)).toEqual(rec);
  });

  test("returns null when there is no record", () => {
    expect(readDataLocation(join(dir, "nope.json"))).toBeNull();
  });

  test("refuses to write a record that fails the spec shape, and writes nothing", () => {
    const file = join(dir, "data-location.json");
    const bad = { ...record(), householdFolderId: "not-a-ulid" } as DataLocation;
    expect(() => writeDataLocation(file, bad)).toThrow(DataLocationInvalidError);
    expect(existsSync(file)).toBe(false);
    expect(readdirSync(dir)).toEqual([]);
  });

  test("refuses a record whose schema it does not know, naming the version", () => {
    const file = join(dir, "data-location.json");
    writeFileSync(file, JSON.stringify({ ...record(), schema: 3 }));
    let caught: unknown;
    try {
      readDataLocation(file);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DataLocationSchemaError);
    expect((caught as DataLocationSchemaError).found).toBe(3);
  });

  test("throws a typed error for JSON that does not parse and for a shape that fails, never a bare string", () => {
    const file = join(dir, "data-location.json");
    writeFileSync(file, "{ nope");
    expect(() => readDataLocation(file)).toThrow(DataLocationInvalidError);
    writeFileSync(file, JSON.stringify({ ...record(), root: {} }));
    let caught: unknown;
    try {
      readDataLocation(file);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(Error);
    expect((caught as DataLocationInvalidError).path).toBe(file);
    expect((caught as DataLocationInvalidError).issues.length).toBeGreaterThan(0);
  });

  test("rejects a move with two steps for one class (one step per class)", () => {
    const step = {
      class: "models",
      from: "/a/models",
      to: "/b/models",
      mode: "offline" as const,
      staging: null,
      state: "planned" as const,
      previous: { path: null, generation: 1 },
    };
    const rec = record({ move: { id: MOVE, bootAttempts: 0, steps: [step, { ...step, to: "/c/models" }] } });
    expect(() => writeDataLocation(join(dir, "r.json"), rec)).toThrow(DataLocationInvalidError);
  });

  test("with knownClassIds, rejects a class key the product does not declare", () => {
    const rec = record({ classes: { mystery: { path: null, generation: 1 } } });
    const file = join(dir, "r.json");
    writeFileSync(file, JSON.stringify(rec));
    expect(readDataLocation(file)).toEqual(rec);
    expect(() => readDataLocation(file, { knownClassIds: ["records", "models"] })).toThrow(DataLocationInvalidError);
    expect(() => writeDataLocation(join(dir, "w.json"), rec, { knownClassIds: ["records"] })).toThrow(DataLocationInvalidError);
  });

  test("an interrupted write leaves the old record intact and no temp file behind", () => {
    const file = join(dir, "data-location.json");
    writeDataLocation(file, record());
    const before = readFileSync(file, "utf8");
    const newRec = record({ writtenBy: "move", writtenAt: "2026-10-01T00:00:00Z" });
    expect(() =>
      writeDataLocation(file, newRec, {
        beforeRename: () => {
          throw new Error("killed mid-write");
        },
      }),
    ).toThrow("killed mid-write");
    expect(readFileSync(file, "utf8")).toBe(before);
    expect(readdirSync(dir)).toEqual(["data-location.json"]);
  });

  test("after a completed write the file is the new record, whole", () => {
    const file = join(dir, "data-location.json");
    writeDataLocation(file, record());
    writeDataLocation(file, record({ writtenBy: "move", writtenAt: "2026-10-01T00:00:00Z" }));
    expect(readDataLocation(file)?.writtenBy).toBe("move");
    expect(readdirSync(dir)).toEqual(["data-location.json"]);
  });
});

describe("isRecordOwnedBy", () => {
  test("a worktree or second checkout whose root differs does not own the record", () => {
    expect(isRecordOwnedBy(record(), "/usr/local/maipai-home")).toBe(true);
    expect(isRecordOwnedBy(record(), "/usr/local/maipai-home/")).toBe(true);
    expect(isRecordOwnedBy(record(), "/Users/dad/work/home-worktree")).toBe(false);
  });
});

describe("resolveClassPath", () => {
  test("a class with no entry resolves to the root plus its default subpath", () => {
    const rec = record();
    expect(resolveClassPath(rec, models)).toBe("/Volumes/Mirror/MaiPai/models");
    expect(resolveClassPath(rec, wakewords)).toBe("/Volumes/Mirror/MaiPai/voice/wakewords");
  });

  test("an empty subpath is the root itself", () => {
    expect(resolveClassPath(record(), records)).toBe("/Volumes/Mirror/MaiPai");
  });

  test("an override wins over the root", () => {
    const rec = record({ classes: { models: { path: "/Volumes/Big/MaiPai/home/models", generation: 2 } } });
    expect(resolveClassPath(rec, models)).toBe("/Volumes/Big/MaiPai/home/models");
    expect(resolveClassPath(rec, records)).toBe("/Volumes/Mirror/MaiPai");
  });

  test("an entry with path null follows the root", () => {
    const rec = record({ classes: { models: { path: null, generation: 3 } } });
    expect(resolveClassPath(rec, models)).toBe("/Volumes/Mirror/MaiPai/models");
  });

  test("a beside-root class sits under the root's parent, so moving the root never shifts it", () => {
    expect(resolveClassPath(record(), backups)).toBe("/Volumes/Mirror/backups");
    const moved = record({ root: { path: "/Volumes/Other/Deep/MaiPai" } });
    expect(resolveClassPath(moved, backups)).toBe("/Volumes/Other/Deep/backups");
  });

  test("a beside-root class with an override uses the override", () => {
    const rec = record({ classes: { backups: { path: "/Volumes/Backup/MaiPai/backups", generation: 1 } } });
    expect(resolveClassPath(rec, backups)).toBe("/Volumes/Backup/MaiPai/backups");
  });

  test("resolves Windows-shaped roots with backslashes", () => {
    const rec = record({ root: { path: "D:\\MaiPai" } });
    expect(resolveClassPath(rec, models)).toBe("D:\\MaiPai\\models");
    expect(resolveClassPath(rec, wakewords)).toBe("D:\\MaiPai\\voice\\wakewords");
    expect(resolveClassPath(rec, backups)).toBe("D:\\backups");
  });

  test("refuses a relative root or override (a record path is absolute)", () => {
    expect(() => resolveClassPath(record({ root: { path: "data" } }), models)).toThrow(DataLocationPathError);
    const rel = record({ classes: { models: { path: "models", generation: 1 } } });
    expect(() => resolveClassPath(rel, models)).toThrow(DataLocationPathError);
  });

  test("refuses a subpath that escapes its base or is absolute", () => {
    for (const subpath of ["../escape", "a/../../b", "/abs", "a//b", "a\\b", "./a"]) {
      expect(() => resolveClassPath(record(), { id: "x", default: { base: "root", subpath } })).toThrow(DataLocationPathError);
    }
  });
});

describe("resolveClassLocation, the boot order's first step", () => {
  const env = "/tmp/screenshot-run/data";

  test("MAIPAI_DATA_DIR is the root, every class resolves under it, the record is ignored", () => {
    const rec = record({ classes: { models: { path: "/Volumes/Big/models", generation: 2 } } });
    const got = resolveClassLocation(models, { envDataDir: env, record: rec, defaultRoot: "/repo/data" });
    expect(got).toEqual({ path: "/tmp/screenshot-run/data/models", source: "env" });
    expect(resolveClassLocation(records, { envDataDir: env, record: rec, defaultRoot: "/repo/data" })).toEqual({
      path: env,
      source: "env",
    });
  });

  test("with MAIPAI_DATA_DIR a beside-root class is beside that root, as backupDir is today", () => {
    expect(resolveClassLocation(backups, { envDataDir: env, defaultRoot: "/repo/data" })).toEqual({
      path: "/tmp/screenshot-run/backups",
      source: "env",
    });
  });

  test("with no env, the record decides, and says so", () => {
    const rec = record({ classes: { models: { path: "/Volumes/Big/models", generation: 2 } } });
    expect(resolveClassLocation(models, { record: rec, defaultRoot: "/repo/data" })).toEqual({
      path: "/Volumes/Big/models",
      source: "record",
    });
    expect(resolveClassLocation(wakewords, { record: rec, defaultRoot: "/repo/data" })).toEqual({
      path: "/Volumes/Mirror/MaiPai/voice/wakewords",
      source: "record",
    });
  });

  test("with no env and no record, the default root and default subpaths apply", () => {
    expect(resolveClassLocation(models, { record: null, defaultRoot: "/repo/data" })).toEqual({
      path: "/repo/data/models",
      source: "default",
    });
    expect(resolveClassLocation(backups, { defaultRoot: "/repo/data" })).toEqual({ path: "/repo/backups", source: "default" });
  });

  test("an empty MAIPAI_DATA_DIR counts as unset", () => {
    expect(dataDirFromEnv({ MAIPAI_DATA_DIR: "" })).toBeUndefined();
    expect(dataDirFromEnv({})).toBeUndefined();
    expect(dataDirFromEnv({ MAIPAI_DATA_DIR: "/x" })).toBe("/x");
    expect(resolveClassLocation(models, { envDataDir: "", defaultRoot: "/repo/data" }).source).toBe("default");
  });

  test("a relative MAIPAI_DATA_DIR is refused with a typed error", () => {
    expect(() => resolveClassLocation(models, { envDataDir: "data", defaultRoot: "/repo/data" })).toThrow(DataLocationPathError);
  });
});

describe("classGeneration", () => {
  test("a class absent from the record is generation 1", () => {
    expect(classGeneration(record(), "models")).toBe(1);
    expect(classGeneration(record({ classes: { models: { path: null, generation: 4 } } }), "models")).toBe(4);
  });
});

describe("folder markers", () => {
  const base = { product: "home" as const, class: "people-files", householdFolderId: HOUSEHOLD, generation: 1 };

  test("writeFolderMarker writes the visible file with a plain note, and readFolderMarker reads it", () => {
    const folder = join(dir, "people");
    mkdirSync(folder);
    const marker = writeFolderMarker(folder, { ...base, now: new Date(AT) });
    expect(existsSync(join(folder, "maipai-folder.json"))).toBe(true);
    expect(folderMarkerPath(folder)).toBe(join(folder, "maipai-folder.json"));
    expect(marker.note).toBe(
      "This folder holds part of a MaiPai Home household's data (class: people-files). MaiPai uses it while Settings > Storage lists it; do not delete or move it by hand.",
    );
    expect(marker.createdAt).toBe("2026-09-30T21:04:00.000Z");
    expect(readFolderMarker(folder)).toEqual(marker);
    expect(readdirSync(folder)).toEqual(["maipai-folder.json"]);
  });

  test("the note names the product", () => {
    const folder = join(dir, "s");
    mkdirSync(folder);
    expect(writeFolderMarker(folder, { ...base, product: "stack", class: "stack-models" }).note).toContain("MaiPai Stack");
  });

  test("never creates the folder: a missing class folder is refused with the typed error", () => {
    const folder = join(dir, "not-plugged-in");
    let caught: unknown;
    try {
      writeFolderMarker(folder, base);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(DataDirMissingError);
    expect((caught as DataDirMissingError).className).toBe("people-files");
    expect(existsSync(folder)).toBe(false);
  });

  test("a moved-to folder is stamped with the new generation and the move id", () => {
    const folder = join(dir, "new");
    mkdirSync(folder);
    const marker = writeFolderMarker(folder, { ...base, generation: 2, moveId: MOVE });
    expect(marker.generation).toBe(2);
    expect(marker.moveId).toBe(MOVE);
  });

  test("readFolderMarker returns null for a folder with no marker, and throws typed errors for a bad one", () => {
    const folder = join(dir, "f");
    mkdirSync(folder);
    expect(readFolderMarker(folder)).toBeNull();
    writeFileSync(join(folder, "maipai-folder.json"), "not json");
    expect(() => readFolderMarker(folder)).toThrow(DataFolderMarkerInvalidError);
    writeFileSync(join(folder, "maipai-folder.json"), JSON.stringify({ schema: 1, product: "home" }));
    expect(() => readFolderMarker(folder)).toThrow(DataFolderMarkerInvalidError);
  });

  test("writeFolderMarker refuses an invalid marker (generation 0) and leaves any old marker alone", () => {
    const folder = join(dir, "f");
    mkdirSync(folder);
    const good = writeFolderMarker(folder, base);
    expect(() => writeFolderMarker(folder, { ...base, generation: 0 })).toThrow(DataFolderMarkerInvalidError);
    expect(readFolderMarker(folder)).toEqual(good);
  });

  test("retireFolderMarker sets retired and changes nothing else", () => {
    const folder = join(dir, "old");
    mkdirSync(folder);
    const live = writeFolderMarker(folder, { ...base, moveId: MOVE });
    const retired = retireFolderMarker(folder, {
      movedTo: "/Volumes/Big/people",
      moveId: OTHER_MOVE,
      now: new Date("2026-10-02T10:00:00Z"),
    });
    expect(retired).toEqual({
      ...live,
      retired: { at: "2026-10-02T10:00:00.000Z", movedTo: "/Volumes/Big/people", moveId: OTHER_MOVE },
    });
    expect(readFolderMarker(folder)).toEqual(retired);
    expect(readdirSync(folder)).toEqual(["maipai-folder.json"]);
  });

  test("retiring twice by the same move is a no-op, by another move is refused, and with no marker is refused", () => {
    const folder = join(dir, "old");
    mkdirSync(folder);
    expect(() => retireFolderMarker(folder, { movedTo: "/x", moveId: MOVE })).toThrow(DataFolderMarkerMissingError);
    writeFolderMarker(folder, base);
    const first = retireFolderMarker(folder, { movedTo: "/x", moveId: MOVE, now: new Date(AT) });
    expect(retireFolderMarker(folder, { movedTo: "/x", moveId: MOVE, now: new Date("2027-01-01T00:00:00Z") })).toEqual(first);
    expect(() => retireFolderMarker(folder, { movedTo: "/y", moveId: OTHER_MOVE })).toThrow(DataFolderMarkerInvalidError);
  });

  describe("checkFolderMarker (the boot's marker check)", () => {
    const expected = { class: "people-files", householdFolderId: HOUSEHOLD, generation: 1 };

    test("ok for the live folder", () => {
      const folder = join(dir, "live");
      mkdirSync(folder);
      writeFolderMarker(folder, base);
      expect(checkFolderMarker(folder, expected).ok).toBe(true);
    });

    test("names why not: missing folder, missing marker, other household, wrong class, wrong generation, retired, unreadable", () => {
      const folder = join(dir, "f");
      expect(checkFolderMarker(folder, expected)).toMatchObject({ ok: false, reason: "missing-folder" });
      mkdirSync(folder);
      expect(checkFolderMarker(folder, expected)).toMatchObject({ ok: false, reason: "missing-marker" });
      writeFolderMarker(folder, base);
      expect(checkFolderMarker(folder, { ...expected, householdFolderId: "01J9ZK9F4T0Z6B2D5H7KMNPQRS" })).toMatchObject({
        ok: false,
        reason: "other-household",
      });
      expect(checkFolderMarker(folder, { ...expected, class: "models" })).toMatchObject({ ok: false, reason: "wrong-class" });
      expect(checkFolderMarker(folder, { ...expected, generation: 2 })).toMatchObject({ ok: false, reason: "wrong-generation" });
      retireFolderMarker(folder, { movedTo: "/x", moveId: MOVE });
      expect(checkFolderMarker(folder, expected)).toMatchObject({ ok: false, reason: "retired" });
      writeFileSync(join(folder, "maipai-folder.json"), "garbage");
      expect(checkFolderMarker(folder, expected)).toMatchObject({ ok: false, reason: "unreadable" });
    });

    test("never creates anything", () => {
      const folder = join(dir, "absent");
      checkFolderMarker(folder, expected);
      expect(existsSync(folder)).toBe(false);
    });
  });
});
