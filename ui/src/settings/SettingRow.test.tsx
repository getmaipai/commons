import { describe, expect, test, mock, afterEach } from "bun:test";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { SettingRow } from "@/kit/settings/SettingRow";
import { titleCaseOption, localeDisplayName } from "@/kit/settings/optionLabels";
import type { MergedSetting } from "@/kit/settings/groupSettings";

afterEach(cleanup);

// `@testing-library/dom`'s global `screen` singleton is computed once at
// module-load time (`typeof document !== 'undefined' && document.body`,
// dist/screen.js), before Bun's test preload has necessarily finished
// registering happy-dom's globals - it permanently falls back to a
// stub that throws "a global document has to be available" no matter
// how real `document` is by the time a test actually runs. render()'s
// own returned queries are bound to the real rendered container instead
// of that stale singleton, so every query here comes from `render()`,
// never from an `import { screen } from "@testing-library/react"`.

function numberSetting(value: number, source: "user" | "default" = "default"): MergedSetting {
  return {
    def: {
      key: "household.conversation_retention_days",
      scope: "household",
      selector: "number",
      range: { min: 7, max: 365 },
      default: 90,
      label: "Conversation history retention",
      level: "advanced",
      secret: false,
      lives_in: "household.system",
      honoured_by: ["home"],
    },
    resolved: {
      key: "household.conversation_retention_days",
      value,
      source,
      label: "Conversation history retention",
      level: "advanced",
      secret: false,
    },
  };
}

describe("SettingRow - number selector", () => {
  // Real bug, found live testing the Settings page (2026-09-04): a reset
  // or any external re-fetch updated the stored value but the input kept
  // showing whatever was last typed, because the local `draft` string
  // only ever synced from `resolved.value` once, on mount.
  test("re-syncs the input when resolved.value changes from outside (a reset)", () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText, rerender } = render(
      <SettingRow setting={numberSetting(45, "user")} onChange={onChange} onReset={() => {}} />,
    );
    expect(getByLabelText("Conversation history retention")).toHaveValue(45);

    // Simulates SettingsRenderer re-rendering this field with a fresh
    // resolved value after a successful reset - not a local edit.
    rerender(<SettingRow setting={numberSetting(90, "default")} onChange={onChange} onReset={() => {}} />);
    expect(getByLabelText("Conversation history retention")).toHaveValue(90);
  });

  test("does not clobber an in-progress, uncommitted edit", () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText, rerender } = render(
      <SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />,
    );
    const input = getByLabelText("Conversation history retention");
    fireEvent.change(input, { target: { value: "120" } });
    expect(input).toHaveValue(120);

    // Re-rendering with the SAME resolved.value (nothing external
    // changed) must not stomp the still-uncommitted draft.
    rerender(<SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />);
    expect(getByLabelText("Conversation history retention")).toHaveValue(120);
  });

  // Second bug from the same review pass: Number("") is 0, not NaN, so
  // clearing the field and blurring used to silently commit 0.
  test("clearing the field and blurring reverts instead of committing 0", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText } = render(
      <SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />,
    );
    const input = getByLabelText("Conversation history retention");
    fireEvent.change(input, { target: { value: "" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(90);
  });

  test("a non-numeric draft reverts instead of committing NaN", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText } = render(
      <SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />,
    );
    const input = getByLabelText("Conversation history retention");
    fireEvent.change(input, { target: { value: "abc" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(90);
  });

  // Third bug from the same review pass: a rejected write (below min,
  // etc.) left the invalid draft on screen forever, since resolved.value
  // never changes on failure and the resync effect only fires when it does.
  test("a rejected write reverts the draft back to the last known value", async () => {
    const onChange = mock(() => Promise.resolve(false));
    const { getByLabelText } = render(
      <SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />,
    );
    const input = getByLabelText("Conversation history retention");
    fireEvent.change(input, { target: { value: "3" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(onChange).toHaveBeenCalledWith(3);
    expect(input).toHaveValue(90);
  });

  test("a successful write is not reverted", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText } = render(
      <SettingRow setting={numberSetting(90)} onChange={onChange} onReset={() => {}} />,
    );
    const input = getByLabelText("Conversation history retention");
    fireEvent.change(input, { target: { value: "30" } });
    await act(async () => {
      fireEvent.blur(input);
    });
    expect(input).toHaveValue(30);
  });
});

// A code review on tts.voice_id (2026-09-04, "per user selection of
// voice") found every `select`-selector value rendered as its raw
// machine token ("quantized", "bill_boerst") with no label transform at
// all - the same rough edge the People page's role picker already fixed
// for its own raw role slugs, just never generalized here.
describe("titleCaseOption (select option labels)", () => {
  test("capitalizes a single word", () => {
    expect(titleCaseOption("auto")).toBe("Auto");
    expect(titleCaseOption("vera")).toBe("Vera");
  });

  test("splits underscores into separate capitalized words", () => {
    expect(titleCaseOption("bill_boerst")).toBe("Bill Boerst");
  });

  test("leaves an empty string alone", () => {
    expect(titleCaseOption("")).toBe("");
  });
});

describe("localeDisplayName", () => {
  test("renders a real BCP-47 tag as its language name, not a title-cased split", () => {
    expect(localeDisplayName("en-US")).toBe("American English");
    expect(localeDisplayName("en-GB")).toBe("British English");
  });

  test("falls through to titleCaseOption for anything Intl doesn't recognize as a locale", () => {
    expect(localeDisplayName("bill_boerst")).toBe(titleCaseOption("bill_boerst"));
  });
});

function localeSelectSetting(value: string): MergedSetting {
  return {
    def: {
      key: "household.locale",
      scope: "household",
      selector: "select",
      range: { options: ["en-US", "en-GB"] },
      default: "en-US",
      label: "Language and region",
      level: "basic",
      secret: false,
      lives_in: "household.system",
      honoured_by: ["home"],
    },
    resolved: {
      key: "household.locale",
      value,
      source: "default",
      label: "Language and region",
      level: "basic",
      secret: false,
    },
  };
}

describe("SettingRow - select selector", () => {
  // A code review, 2026-09-05, found the BCP-47 display-name fix scoped
  // to the wrong key entirely (`core.locale`, which does not exist - the
  // real key is `household.locale`), caught only by looking at the
  // running app, not by any test - this is that test, rendering the real
  // component against the real key so a future rename of either has
  // somewhere to fail loudly instead of silently.
  test("renders household.locale's value as a real language name, not a raw BCP-47 tag", () => {
    const { getByRole } = render(
      <SettingRow setting={localeSelectSetting("en-US")} onChange={async () => true} onReset={() => {}} />,
    );
    expect(getByRole("combobox", { name: "Language and region" })).toHaveTextContent("American English");
  });
});

// Session B step 7: a `secret: true` key with no dedicated backend route
// (unlike voice.hf_token) had no way to be set at all - the generic
// renderer only ever showed a static "Set"/"Not set" status. This is the
// regression suite for the write-only paste-and-confirm flow that fixes
// that, found live (2026-09-06) checking notifications.telegram.bot_token
// in the running app.
function secretSetting(isSet: boolean, source: "user" | "default" = isSet ? "user" : "default"): MergedSetting {
  return {
    def: {
      key: "notifications.telegram.bot_token",
      scope: "household",
      selector: "text",
      default: "",
      label: "Telegram bot token",
      level: "advanced",
      secret: true,
      lives_in: "household.notifications",
      honoured_by: ["home"],
    },
    resolved: {
      key: "notifications.telegram.bot_token",
      value: null,
      source,
      label: "Telegram bot token",
      level: "advanced",
      secret: true,
      isSet,
    },
  };
}

describe("SettingRow - secret write-only flow", () => {
  test("not set: shows status and a Set button, no input", () => {
    const { getByText, getByRole, queryByLabelText } = render(
      <SettingRow setting={secretSetting(false)} onChange={async () => true} onReset={() => {}} />,
    );
    expect(getByText("Not set")).toBeTruthy();
    expect(getByRole("button", { name: "Set" })).toBeTruthy();
    expect(queryByLabelText("Telegram bot token")).toBeNull();
  });

  test("already set: shows status and a Change button", () => {
    const { getByText, getByRole } = render(
      <SettingRow setting={secretSetting(true)} onChange={async () => true} onReset={() => {}} />,
    );
    expect(getByText("Set")).toBeTruthy();
    expect(getByRole("button", { name: "Change" })).toBeTruthy();
  });

  test("clicking Set reveals a masked input with Save disabled until something is typed", () => {
    const { getByRole, getByLabelText } = render(
      <SettingRow setting={secretSetting(false)} onChange={async () => true} onReset={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: "Set" }));
    const input = getByLabelText("Telegram bot token") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.change(input, { target: { value: "123:abc" } });
    expect(getByRole("button", { name: "Save" })).not.toBeDisabled();
  });

  test("saving calls onChange with the typed value and collapses back to status on success", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole, getByLabelText, queryByLabelText } = render(
      <SettingRow setting={secretSetting(false)} onChange={onChange} onReset={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: "Set" }));
    fireEvent.change(getByLabelText("Telegram bot token"), { target: { value: "123:abc" } });
    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Save" }));
    });
    expect(onChange).toHaveBeenCalledWith("123:abc");
    expect(queryByLabelText("Telegram bot token")).toBeNull();
  });

  test("a rejected save keeps the input open with the typed draft, not the never-returned old value", async () => {
    const onChange = mock(() => Promise.resolve(false));
    const { getByRole, getByLabelText } = render(
      <SettingRow setting={secretSetting(false)} onChange={onChange} onReset={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: "Set" }));
    const input = getByLabelText("Telegram bot token") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "123:abc" } });
    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Save" }));
    });
    expect(getByLabelText("Telegram bot token")).toHaveValue("123:abc");
  });

  test("Cancel discards the draft without calling onChange", () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole, getByLabelText, queryByLabelText } = render(
      <SettingRow setting={secretSetting(false)} onChange={onChange} onReset={() => {}} />,
    );
    fireEvent.click(getByRole("button", { name: "Set" }));
    fireEvent.change(getByLabelText("Telegram bot token"), { target: { value: "123:abc" } });
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(queryByLabelText("Telegram bot token")).toBeNull();
  });

  // A code review (2026-09-06) found this write flow made voice.hf_token
  // writable a second way, bypassing HuggingFaceTokenSection.tsx's
  // dedicated route (needed to restart pocket-tts after a save) - a
  // household member using this row instead would see "Set" succeed
  // while voice cloning silently kept failing.
  test("voice.hf_token stays a static status row - its real write path is a dedicated section", () => {
    const setting: MergedSetting = {
      def: {
        key: "voice.hf_token",
        scope: "household",
        selector: "text",
        default: "",
        label: "Hugging Face token (for voice cloning)",
        level: "advanced",
        secret: true,
        lives_in: "household.ai",
        honoured_by: ["home"],
      },
      resolved: {
        key: "voice.hf_token",
        value: null,
        source: "default",
        label: "Hugging Face token (for voice cloning)",
        level: "advanced",
        secret: true,
        isSet: false,
      },
    };
    const { getByText, queryByRole } = render(
      <SettingRow setting={setting} onChange={async () => true} onReset={() => {}} />,
    );
    expect(getByText("Not set")).toBeTruthy();
    expect(queryByRole("button", { name: "Set" })).toBeNull();
    expect(queryByRole("button", { name: "Change" })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// KIT-SET-03: the refreshed row (kit parts, Home's NextSettingField behaviours
// moved in: switch, time, person multi-select, per-key beforeChange hook).
// ---------------------------------------------------------------------------

function makeSetting(over: { selector: string; key?: string; value?: unknown; range?: unknown; source?: "user" | "default"; label?: string; help?: string; secret?: boolean; isSet?: boolean }): MergedSetting {
  const key = over.key ?? "person.chat.sample";
  const label = over.label ?? "Sample setting";
  return {
    def: {
      key,
      scope: "person",
      selector: over.selector,
      range: over.range,
      default: over.value ?? "",
      label,
      help: over.help,
      level: "basic",
      secret: over.secret ?? false,
      lives_in: "person.chat",
      honoured_by: ["home"],
    } as MergedSetting["def"],
    resolved: { key, value: over.value ?? null, source: over.source ?? "default", label, level: "basic", secret: over.secret ?? false, isSet: over.isSet },
  };
}

describe("SettingRow - the row is the kit's setting Item", () => {
  test("draws an Item size=setting with title, helper text and a 32 x 20 switch", () => {
    const { container, getByRole } = render(
      <SettingRow setting={makeSetting({ selector: "boolean", value: true, help: "Let people attach pictures." })} onChange={async () => true} onReset={() => {}} />,
    );
    const row = container.querySelector("[data-slot=item]")!;
    expect(row.getAttribute("data-size")).toBe("setting");
    expect(row.getAttribute("data-setting-key")).toBe("person.chat.sample");
    expect(container.querySelector("[data-slot=item-title]")!.textContent).toBe("Sample setting");
    expect(container.querySelector("[data-slot=item-description]")!.textContent).toBe("Let people attach pictures.");
    expect(container.querySelector("[data-slot=item-description]")!.className).not.toContain("line-clamp");
    expect(getByRole("switch", { name: "Sample setting" }).getAttribute("data-size")).toBe("md");
  });
});

describe("SettingRow - boolean selector", () => {
  test("toggling the switch writes the new value", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole } = render(<SettingRow setting={makeSetting({ selector: "boolean", value: false })} onChange={onChange} onReset={() => {}} />);
    await act(async () => {
      fireEvent.click(getByRole("switch", { name: "Sample setting" }));
    });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  test("a disabled row cannot be toggled", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole } = render(<SettingRow setting={makeSetting({ selector: "boolean", value: false })} onChange={onChange} onReset={() => {}} disabled />);
    await act(async () => {
      fireEvent.click(getByRole("switch", { name: "Sample setting" }));
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SettingRow - the per-key beforeChange hook", () => {
  test("a refusal shows its sentence under the row and nothing is written", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const beforeChange = mock(async () => "Browser permission was not granted, so alerts are off." as const);
    const { getByRole, findByRole } = render(
      <SettingRow setting={makeSetting({ selector: "boolean", key: "notifications.browser.enabled", value: false })} onChange={onChange} onReset={() => {}} beforeChange={beforeChange} />,
    );
    await act(async () => {
      fireEvent.click(getByRole("switch", { name: "Sample setting" }));
    });
    expect(beforeChange).toHaveBeenCalledWith("notifications.browser.enabled", true);
    expect(onChange).not.toHaveBeenCalled();
    expect((await findByRole("status")).textContent).toBe("Browser permission was not granted, so alerts are off.");
  });

  test("true lets the write through and clears an earlier message", async () => {
    const onChange = mock(() => Promise.resolve(true));
    let verdict: true | string = "No.";
    const beforeChange = async () => verdict;
    const { getByRole, queryByRole } = render(
      <SettingRow setting={makeSetting({ selector: "boolean", value: false })} onChange={onChange} onReset={() => {}} beforeChange={beforeChange} />,
    );
    await act(async () => {
      fireEvent.click(getByRole("switch", { name: "Sample setting" }));
    });
    expect(queryByRole("status")).not.toBeNull();
    verdict = true;
    await act(async () => {
      fireEvent.click(getByRole("switch", { name: "Sample setting" }));
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(queryByRole("status")).toBeNull();
  });
});

describe("SettingRow - text selector reads as a value plus Change", () => {
  const path = "/Users/example/Documents/very/long/folder/name/Codex";

  test("shows the value (middle-ellipsised, full text in the title) and a Change button, no input", () => {
    const { getByText, getByRole, queryByRole } = render(
      <SettingRow setting={makeSetting({ selector: "text", value: path })} onChange={async () => true} onReset={() => {}} />,
    );
    const shown = getByText(/…/);
    expect(shown.getAttribute("title")).toBe(path);
    expect(shown.textContent!.length).toBeLessThan(path.length);
    expect(shown.textContent!.startsWith("/Users/")).toBe(true);
    expect(shown.textContent!.endsWith("/Codex")).toBe(true);
    expect(getByRole("button", { name: "Change" })).toBeTruthy();
    expect(queryByRole("textbox")).toBeNull();
  });

  test("Change opens an inline editor; Save writes the trimmed text and closes it", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole, queryByRole } = render(<SettingRow setting={makeSetting({ selector: "text", value: "a" })} onChange={onChange} onReset={() => {}} />);
    fireEvent.click(getByRole("button", { name: "Change" }));
    fireEvent.change(getByRole("textbox", { name: "Sample setting" }), { target: { value: "  /srv/library  " } });
    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Save" }));
    });
    expect(onChange).toHaveBeenCalledWith("/srv/library");
    expect(queryByRole("textbox")).toBeNull();
  });

  test("a rejected write keeps the editor open and puts the old value back", async () => {
    const onChange = mock(() => Promise.resolve(false));
    const { getByRole } = render(<SettingRow setting={makeSetting({ selector: "text", value: "old" })} onChange={onChange} onReset={() => {}} />);
    fireEvent.click(getByRole("button", { name: "Change" }));
    const input = getByRole("textbox", { name: "Sample setting" });
    fireEvent.change(input, { target: { value: "new" } });
    await act(async () => {
      fireEvent.click(getByRole("button", { name: "Save" }));
    });
    expect(getByRole("textbox", { name: "Sample setting" })).toHaveValue("old");
  });

  test("Cancel and Escape discard the edit without writing", () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByRole, queryByRole } = render(<SettingRow setting={makeSetting({ selector: "text", value: "old" })} onChange={onChange} onReset={() => {}} />);
    fireEvent.click(getByRole("button", { name: "Change" }));
    fireEvent.change(getByRole("textbox"), { target: { value: "new" } });
    fireEvent.click(getByRole("button", { name: "Cancel" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(queryByRole("textbox")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Change" }));
    fireEvent.change(getByRole("textbox"), { target: { value: "other" } });
    fireEvent.keyDown(getByRole("textbox"), { key: "Escape" });
    expect(onChange).not.toHaveBeenCalled();
    expect(queryByRole("textbox")).toBeNull();
  });

  test("an empty value reads Not set", () => {
    const { getByText } = render(<SettingRow setting={makeSetting({ selector: "text", value: "" })} onChange={async () => true} onReset={() => {}} />);
    expect(getByText("Not set")).toBeTruthy();
  });
});

describe("SettingRow - a secret is never echoed", () => {
  test("even a value that wrongly arrives on the wire is never drawn, only Set", () => {
    const setting = makeSetting({ selector: "text", key: "search.brave_api_key", value: "s3cr3t-token-value", secret: true, isSet: true });
    const { container } = render(<SettingRow setting={setting} onChange={async () => true} onReset={() => {}} />);
    expect(container.textContent).not.toContain("s3cr3t-token-value");
    expect(container.innerHTML).not.toContain("s3cr3t-token-value");
    expect(container.textContent).toContain("Set");
  });

  test("the editor is a password field and starts empty", () => {
    const setting = makeSetting({ selector: "text", key: "search.brave_api_key", value: "s3cr3t-token-value", secret: true, isSet: true });
    const { getByRole, getByLabelText } = render(<SettingRow setting={setting} onChange={async () => true} onReset={() => {}} />);
    fireEvent.click(getByRole("button", { name: "Change" }));
    const input = getByLabelText("Sample setting") as HTMLInputElement;
    expect(input.type).toBe("password");
    expect(input.value).toBe("");
  });
});

describe("SettingRow - time selector", () => {
  test("writes the picked time, and offers household hours while inheriting", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const onReset = mock(() => {});
    const { getByLabelText, getByText, getByRole } = render(
      <SettingRow setting={makeSetting({ selector: "time", key: "person.quiet_hours.from", value: null })} onChange={onChange} onReset={onReset} />,
    );
    expect(getByText("Inheriting household hours")).toBeTruthy();
    fireEvent.click(getByRole("button", { name: "Use household hours" }));
    expect(onReset).toHaveBeenCalled();
    await act(async () => {
      fireEvent.change(getByLabelText("Sample setting"), { target: { value: "22:30" } });
    });
    expect(onChange).toHaveBeenCalledWith("22:30");
  });

  test("clearing a time field writes nothing", async () => {
    const onChange = mock(() => Promise.resolve(true));
    const { getByLabelText } = render(
      <SettingRow setting={makeSetting({ selector: "time", key: "person.quiet_hours.from", value: "21:00" })} onChange={onChange} onReset={() => {}} />,
    );
    await act(async () => {
      fireEvent.change(getByLabelText("Sample setting"), { target: { value: "" } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("SettingRow - person multi-select", () => {
  const people = [
    { id: "p1", display_name: "Sage Willow" },
    { id: "p2", display_name: "Rover Marsh" },
    { id: "p3", display_name: "Clover Hill" },
  ];
  const setting = makeSetting({
    selector: "person",
    key: "notifications.file_shared.muted_senders",
    value: ["p2"],
    range: { multiple: true },
    label: "Mute file shares from",
  });

  test("shows stored people as chips by name", () => {
    const { getByText } = render(<SettingRow setting={setting} onChange={async () => true} onReset={() => {}} selfPersonId="p1" people={people} />);
    expect(getByText("Rover Marsh")).toBeTruthy();
  });

  test("a stored id stays shown even when it is the viewer's own, but the viewer is never offered", async () => {
    const own = { ...setting, resolved: { ...setting.resolved, value: ["p1"] } };
    const { getByText, getByRole, queryByRole, findByRole } = render(<SettingRow setting={own} onChange={async () => true} onReset={() => {}} selfPersonId="p1" people={people} />);
    expect(getByText("Sage Willow")).toBeTruthy();
    const input = getByRole("combobox");
    await act(async () => {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "o" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
    });
    // The list really opened (others are offered), and the viewer is not.
    expect(await findByRole("option", { name: "Rover Marsh" })).toBeTruthy();
    expect(queryByRole("option", { name: "Sage Willow" })).toBeNull();
  });
});

describe("SettingRow - unknown selector and reset", () => {
  test("a selector with no real key yet says so instead of drawing nothing", () => {
    const { getByText } = render(<SettingRow setting={makeSetting({ selector: "duration", value: 5 })} onChange={async () => true} onReset={() => {}} />);
    expect(getByText("Not supported in this hub version yet.")).toBeTruthy();
  });

  test("Reset to default shows only for a changed value and calls onReset", () => {
    const onReset = mock(() => {});
    const { getByRole, queryByRole, rerender } = render(
      <SettingRow setting={makeSetting({ selector: "boolean", value: true, source: "default" })} onChange={async () => true} onReset={onReset} />,
    );
    expect(queryByRole("button", { name: "Reset to default" })).toBeNull();
    rerender(<SettingRow setting={makeSetting({ selector: "boolean", value: true, source: "user" })} onChange={async () => true} onReset={onReset} />);
    fireEvent.click(getByRole("button", { name: "Reset to default" }));
    expect(onReset).toHaveBeenCalled();
  });
});

describe("SettingField compatibility shim", () => {
  test("the old import path still serves the helpers and the row", async () => {
    const shim = await import("@/kit/settings/SettingField");
    expect(shim.titleCaseOption("bill_boerst")).toBe("Bill Boerst");
    expect(shim.localeDisplayName("en-GB")).toBe("British English");
    expect(shim.SettingField).toBe(SettingRow);
  });
});
