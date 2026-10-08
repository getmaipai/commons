import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STATUS_AUDIENCES,
  STATUS_CAUSES,
  STATUS_LENGTHS,
  STATUS_STATES,
  STATUS_SURFACES,
  stateFromCauses,
  stateForCause,
  stateInfoFor,
  statusCopy,
  summarize,
  surfaceInfo,
  surfaceView,
  type ServiceStatus,
  type StatusAudience,
  type StatusCause,
  type StatusLength,
  type StatusState,
  type StatusSurface,
  type StatusTone,
} from "../../status/ts/statusModel.js";

const ROOT = join(import.meta.dir, "..", "..");
const read = <T>(path: string): T => JSON.parse(readFileSync(join(ROOT, path), "utf8")) as T;
const vocabText = readFileSync(join(ROOT, "vocab/status-model.json"), "utf8");
const summaries = read<{ cases: Array<{ name: string; statuses: ServiceStatus[]; state: StatusState; tone: StatusTone; affected: string[]; short: string | null; medium: string | null; long: string | null }> }>("fixtures/status-model/summaries.examples.json");
const surfaces = read<{ cases: Array<{ name: string; surface: StatusSurface; audience: StatusAudience; statuses: ServiceStatus[]; text: string | null; tone: StatusTone; repairsLink: string | null }> }>("fixtures/status-model/surfaces.examples.json");
const copyCases = read<{ cases: Array<{ name: string; state: StatusState; length: StatusLength; audience: StatusAudience; service: string | null; text: string | null; repairsLink: string | null }> }>("fixtures/status-model/copy.examples.json");

describe("STATUS-MODEL-01 states", () => {
  test("there are exactly eight states, with paused, down and search limited kept separate", () => {
    expect(STATUS_STATES).toEqual(["running", "starting", "paused", "down", "limited", "search_limited", "waiting_internet", "unknown"]);
  });

  test("severity orders down above waiting, paused, starting, limited, search limited, running and unknown", () => {
    const order = ["down", "waiting_internet", "paused", "starting", "limited", "search_limited", "running", "unknown"] as StatusState[];
    const severities = order.map((state) => stateInfoFor(state).severity);
    expect(severities).toEqual([...severities].sort((a, b) => b - a));
    expect(new Set(severities).size).toBe(order.length);
    expect(stateInfoFor("unknown").severity).toBe(0);
  });

  test("only down and limited are sticky; the rest clear by themselves", () => {
    expect(STATUS_STATES.filter((state) => stateInfoFor(state).sticky).sort()).toEqual(["down", "limited"]);
  });

  test("search limited is amber and down is red", () => {
    expect(stateInfoFor("search_limited").tone).toBe("warn");
    expect(stateInfoFor("down").tone).toBe("error");
    expect(stateInfoFor("paused").tone).toBe("warn");
    const colors = read<{ tone_colors: Record<string, string> }>("vocab/status-model.json").tone_colors;
    expect(colors.warn).toBe("amber");
    expect(colors.error).toBe("red");
  });
});

describe("STATUS-MODEL-01 causes", () => {
  test("each of the ten causes maps to exactly one known state", () => {
    expect(STATUS_CAUSES).toEqual(["engine_stopped", "engine_loading", "engine_failed", "engine_computer_disconnected", "engine_computer_slow", "memory_low", "search_limited", "internet_missing", "optional_part_down", "library_starting"]);
    for (const cause of STATUS_CAUSES) expect(STATUS_STATES).toContain(stateForCause(cause));
    expect(stateForCause("engine_stopped")).toBe("paused");
    expect(stateForCause("engine_failed")).toBe("down");
    expect(stateForCause("search_limited")).toBe("search_limited");
  });

  test("a service takes the state of its worst cause", () => {
    expect(stateFromCauses(["search_limited", "engine_failed", "memory_low"])).toBe("down");
    expect(stateFromCauses(["optional_part_down", "internet_missing"])).toBe("waiting_internet");
  });

  test("causes that share a state give that state in either order", () => {
    const same: StatusCause[] = ["memory_low", "engine_computer_slow"];
    expect(stateFromCauses(same)).toBe("limited");
    expect(stateFromCauses([...same].reverse())).toBe("limited");
  });

  test("no causes means running", () => {
    expect(stateFromCauses([])).toBe("running");
  });
});

describe("STATUS-MODEL-01 copy", () => {
  test("every state has all three lengths for every audience", () => {
    for (const audience of STATUS_AUDIENCES) {
      for (const state of STATUS_STATES) {
        for (const length of STATUS_LENGTHS) {
          const result = statusCopy(state, length, audience);
          if (state === "unknown") expect(result, `${audience}/${state}/${length}`).toBeNull();
          else expect(result?.text.length ?? 0, `${audience}/${state}/${length}`).toBeGreaterThan(0);
        }
      }
    }
  });

  test("copy has no em dashes or en dashes anywhere in the file", () => {
    expect(vocabText).not.toMatch(/[–—]/);
  });

  test("copy never names a persona", () => {
    // Persona names come from the household roster at render time; this file stays generic.
    expect(vocabText).not.toMatch(/\b(Nova|Rover|Reachy)\b/);
  });

  test("short copy fits a 24 character row for the default service", () => {
    for (const audience of ["adult", "teen", "admin"] as StatusAudience[]) {
      for (const state of STATUS_STATES) {
        expect((statusCopy(state, "short", audience)?.text ?? "").length, `${audience}/${state}`).toBeLessThanOrEqual(24);
      }
    }
  });

  test("a child reads one line at every length", () => {
    for (const state of STATUS_STATES) {
      const lines = new Set(STATUS_LENGTHS.map((length) => statusCopy(state, length, "child")?.text ?? null));
      expect(lines.size, state).toBe(1);
    }
  });

  test("no copy leaves a placeholder unfilled", () => {
    for (const audience of STATUS_AUDIENCES) {
      for (const state of STATUS_STATES) {
        for (const length of STATUS_LENGTHS) {
          expect(statusCopy(state, length, audience, { service: "Library" })?.text ?? "").not.toContain("{");
        }
      }
    }
  });

  test("only an admin gets the Repairs link, and only for paused and down at medium and long", () => {
    for (const audience of STATUS_AUDIENCES) {
      for (const state of STATUS_STATES) {
        for (const length of STATUS_LENGTHS) {
          const expected = audience === "admin" && (state === "paused" || state === "down") && length !== "short" ? "Open Repairs" : null;
          expect(statusCopy(state, length, audience)?.repairsLink ?? null, `${audience}/${state}/${length}`).toBe(expected);
        }
      }
    }
  });

  for (const row of copyCases.cases) {
    test(`copy fixture: ${row.name}`, () => {
      const result = statusCopy(row.state, row.length, row.audience, row.service ? { service: row.service } : {});
      expect(result?.text ?? null).toBe(row.text);
      expect(result?.repairsLink ?? null).toBe(row.repairsLink);
    });
  }

  test("a child sees nothing on a profile surface while a service has a problem", () => {
    expect(statusCopy("down", "long", "child", { surface: "profile_hover" })).toBeNull();
    expect(statusCopy("running", "short", "child", { surface: "profile_row" })?.text).toBe("I'm ready to chat.");
    expect(statusCopy("down", "long", "child", { surface: "composer_line" })?.text).toBe("I can't talk right now. Please tell a grown-up.");
  });
});

describe("STATUS-MODEL-01 surface table", () => {
  test("every surface declares a length and a summary flag", () => {
    expect(STATUS_SURFACES.length).toBeGreaterThan(0);
    for (const key of STATUS_SURFACES) {
      const row = surfaceInfo(key);
      expect(STATUS_LENGTHS, key).toContain(row.length);
      expect(typeof row.summary, key).toBe("boolean");
    }
  });

  test("the profile hover, profile LED and status page header are summary surfaces", () => {
    expect(surfaceInfo("profile_hover")).toMatchObject({ summary: true, length: "long" });
    expect(surfaceInfo("profile_led")).toMatchObject({ summary: true, length: "short" });
    expect(surfaceInfo("status_page_header")).toMatchObject({ summary: true, length: "medium" });
  });

  test("the rail LED, composer line and app headers are single surfaces", () => {
    expect(surfaceInfo("rail_led")).toMatchObject({ summary: false, length: "short" });
    expect(surfaceInfo("composer_line")).toMatchObject({ summary: false, length: "long" });
    expect(surfaceInfo("app_header")).toMatchObject({ summary: false, length: "medium" });
  });

  test("a surface with no entry fails by name", () => {
    expect(() => surfaceInfo("not_a_surface" as StatusSurface)).toThrow('status surface "not_a_surface"');
  });

  test("a single surface refuses a roll-up", () => {
    expect(() => surfaceView("composer_line", [{ service: "Chat", state: "down" }, { service: "Search", state: "down" }], "adult")).toThrow("composer_line");
  });

  test("every surface renders every state for every audience without throwing", () => {
    for (const surface of STATUS_SURFACES) {
      for (const audience of STATUS_AUDIENCES) {
        for (const state of STATUS_STATES) {
          const view = surfaceView(surface, [{ service: "Chat", state }], audience);
          expect(view.length).toBe(surfaceInfo(surface).length);
          expect(view.tone).toBe(stateInfoFor(state).tone);
        }
      }
    }
  });

  for (const row of surfaces.cases) {
    test(`surface fixture: ${row.name}`, () => {
      const view = surfaceView(row.surface, row.statuses, row.audience);
      expect(view.text).toBe(row.text);
      expect(view.tone).toBe(row.tone);
      expect(view.repairsLink).toBe(row.repairsLink);
    });
  }
});

describe("STATUS-MODEL-01 summarize", () => {
  for (const row of summaries.cases) {
    test(`summary fixture: ${row.name}`, () => {
      for (const length of STATUS_LENGTHS) {
        const result = summarize(row.statuses, length);
        expect(result.text, length).toBe(row[length]);
        expect(result.state, length).toBe(row.state);
        expect(result.tone, length).toBe(row.tone);
        expect(result.affected, length).toEqual(row.affected);
      }
    });
  }

  test("the sentence does not depend on the order the statuses arrive in", () => {
    const statuses: ServiceStatus[] = [
      { service: "Videos", state: "limited" },
      { service: "Chat", state: "down" },
      { service: "Library", state: "down" },
    ];
    for (const length of STATUS_LENGTHS) {
      expect(summarize([...statuses].reverse(), length)).toEqual(summarize(statuses, length));
    }
  });

  test("the color is the worst severity, never an average", () => {
    const result = summarize([{ service: "Chat", state: "search_limited" }, { service: "Library", state: "down" }, { service: "Music", state: "running" }], "short");
    expect(result.tone).toBe("error");
    expect(result.severity).toBe(stateInfoFor("down").severity);
  });

  test("three affected services are named and four collapse to a count at short", () => {
    const three = ["Chat", "Library", "Music"].map((service): ServiceStatus => ({ service, state: "down" }));
    expect(summarize(three, "short").text).toBe("Chat, Library and Music are down");
    expect(summarize([...three, { service: "Videos", state: "down" }], "short").text).toBe("4 services need attention");
  });

  test("summary text never contains an em dash", () => {
    for (const row of summaries.cases) for (const length of STATUS_LENGTHS) expect(summarize(row.statuses, length).text ?? "").not.toMatch(/[–—]/);
  });
});
