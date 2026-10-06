import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { MergedSetting } from "@/kit/settings/groupSettings";
import { Button } from "../dashboard/components/ui/button";
import { Input } from "../dashboard/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from "../dashboard/components/ui/item";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../dashboard/components/ui/select";
import { Switch } from "../dashboard/components/ui/switch";
import { localeDisplayName, middleEllipsis, titleCaseOption } from "./optionLabels";
import { HitField } from "./HitField";
import { PersonMultiSelect, type PersonOption } from "./PersonMultiSelect";

// A code review (2026-09-06) found the generic write-only secret flow made
// `voice.hf_token` writable a SECOND way: that key already has its own
// dedicated section because saving it has to restart the already-running
// pocket-tts process, which the generic PUT has no hook for. Every other
// secret key has no such conflict, so this stays a narrow, named
// exception rather than a broader mechanism nothing else needs yet.
const SECRETS_WITH_DEDICATED_FLOWS = new Set(["voice.hf_token"]);

/** The per-key hook a host passes to run something before a write: return
 * `true` to let the write go ahead, or a sentence to refuse it (shown
 * under the row, nothing is written). Home uses it to ask the browser for
 * alert permission before `notifications.browser.enabled` turns on. */
export type BeforeChange = (key: string, value: unknown) => true | string | Promise<true | string>;

export interface SettingRowProps {
  setting: MergedSetting;
  /** Resolves true if the write landed, false if the backend rejected it
   * (below a key's min, a stale write, etc.) - the draft reverts on false,
   * since resolved.value won't have changed for the resync effect to catch. */
  onChange: (value: unknown) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  /** The signed-in viewer's own id, dropped from a person multi-select's
   * option list. Unused by every other selector. */
  selfPersonId?: string;
  /** The household roster for a person multi-select; omitted, the control
   * reads `GET /api/people` itself. */
  people?: readonly PersonOption[];
  beforeChange?: BeforeChange;
}

/** One settings row: the title and helper text on the left, the control for
 * this key's selector on the right, a reset action when the value differs
 * from its default. Drawn as the kit's `Item size="setting"`; it goes
 * inside an `ItemGroup variant="card"` (see SettingsRenderer). A secret
 * never shows its value, only Set or Not set. */
export function SettingRow({ setting, onChange, onReset, disabled, selfPersonId, people, beforeChange }: SettingRowProps) {
  const { def, resolved } = setting;
  const titleId = useId();
  const [draft, setDraft] = useState<string>(String(resolved.value ?? ""));
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const editorRef = useRef<HTMLInputElement>(null);
  const canReset = resolved.source === "user";

  // The write-only secret flow. `secretEditing` reveals a masked input; the
  // value is never read back from the server (CLAUDE.md > Credentials:
  // "never logged, never returned"), so there is no previous value to
  // restore on a rejected write - the typed draft just stays for another
  // try. Clearing reuses the row's "Reset to default" (every secret key's
  // default is "").
  const [secretEditing, setSecretEditing] = useState(false);
  const [secretDraft, setSecretDraft] = useState("");
  const [secretSaving, setSecretSaving] = useState(false);

  // Every write, from any control, goes through here so the host's
  // per-key hook sees it and a refusal never reaches the server.
  async function write(value: unknown): Promise<boolean> {
    setNote(null);
    if (beforeChange) {
      const verdict = await beforeChange(def.key, value);
      if (verdict !== true) {
        setNote(verdict);
        return false;
      }
    }
    return onChange(value);
  }

  async function commitSecret() {
    if (!secretDraft) return;
    setSecretSaving(true);
    const ok = await write(secretDraft);
    setSecretSaving(false);
    if (ok) {
      setSecretDraft("");
      setSecretEditing(false);
    }
  }

  // Opening the inline editor puts the cursor in it.
  useEffect(() => {
    if (editing) editorRef.current?.focus();
  }, [editing]);

  // `draft` re-syncs only when the resolved value itself changes (a reset,
  // a reload, our own commit echoing back), never mid-keystroke.
  useEffect(() => {
    setDraft(String(resolved.value ?? ""));
  }, [resolved.value]);

  // Two bugs a code review (2026-09-04) found: `Number("")` is 0, so
  // clearing and blurring silently committed 0 (a trimmed empty string
  // now reverts without calling onChange); and a rejected write left the
  // invalid draft on screen (commitDraft reverts it on a false result).
  async function commitDraft(): Promise<boolean> {
    const trimmed = draft.trim();
    if (trimmed === "") {
      setDraft(String(resolved.value ?? ""));
      return false;
    }
    let value: unknown = trimmed;
    if (def.selector === "number") {
      const n = Number(trimmed);
      if (Number.isNaN(n)) {
        setDraft(String(resolved.value ?? ""));
        return false;
      }
      value = n;
    }
    const ok = await write(value);
    if (!ok) setDraft(String(resolved.value ?? ""));
    return ok;
  }

  let control: ReactNode;
  if (resolved.secret && SECRETS_WITH_DEDICATED_FLOWS.has(def.key)) {
    control = <span className="text-sm text-settings-helper">{resolved.isSet ? "Set" : "Not set"}</span>;
  } else if (resolved.secret) {
    control = secretEditing ? (
      <>
        <HitField pad={10}><Input
          size="row"
          type="password"
          className="w-56"
          placeholder="Paste the new value"
          value={secretDraft}
          disabled={secretSaving}
          onChange={(e) => setSecretDraft(e.target.value)}
          aria-label={def.label}
          autoComplete="off"
        /></HitField>
        <Button type="button" size="row" disabled={secretSaving || !secretDraft} onClick={commitSecret}>
          {secretSaving ? "Saving…" : "Save"}
        </Button>
        <Button
          type="button"
          size="row"
          variant="secondary"
          disabled={secretSaving}
          onClick={() => {
            setSecretDraft("");
            setSecretEditing(false);
          }}
        >
          Cancel
        </Button>
      </>
    ) : (
      <>
        <span className="text-sm text-settings-helper">{resolved.isSet ? "Set" : "Not set"}</span>
        <Button type="button" size="row" variant="secondary" disabled={disabled} aria-describedby={titleId} onClick={() => setSecretEditing(true)}>
          {resolved.isSet ? "Change" : "Set"}
        </Button>
      </>
    );
  } else if (def.selector === "boolean") {
    control = (
      <Switch size="md" checked={Boolean(resolved.value)} onCheckedChange={(v) => void write(v)} disabled={disabled} aria-label={def.label} />
    );
  } else if (def.selector === "select") {
    const options = (def.range as { options?: string[] } | undefined)?.options ?? [];
    const getLabel = def.key === "household.locale" ? localeDisplayName : titleCaseOption;
    control = (
      <Select
        value={String(resolved.value)}
        onValueChange={(v) => {
          if (v != null) void write(v);
        }}
        items={options.map((option) => ({ value: option, label: getLabel(option) }))}
        disabled={disabled}
      >
        <SelectTrigger size="row" aria-label={def.label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {getLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (def.selector === "number") {
    const range = def.range as { min?: number; max?: number } | undefined;
    control = (
      <HitField pad={10}><Input
        size="row"
        type="number"
        className="w-28"
        min={range?.min}
        max={range?.max}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => void commitDraft()}
        aria-label={def.label}
      /></HitField>
    );
  } else if (def.selector === "time") {
    control = (
      <>
        <HitField pad={10}><Input size="row" type="time" className="w-32" value={String(resolved.value ?? "")} disabled={disabled} onChange={(e) => {
            // A half-typed or cleared time is not a value: only a complete
            // HH:MM is written; "Use household hours" is the way back.
            if (e.target.value) void write(e.target.value);
          }}
          aria-label={def.label}
        /></HitField>
        {resolved.value == null ? (
          <>
            <span className="text-sm text-settings-helper">Inheriting household hours</span>
            <Button type="button" variant="link" size="row" onClick={onReset} disabled={disabled}>
              Use household hours
            </Button>
          </>
        ) : null}
      </>
    );
  } else if (def.selector === "text") {
    // Text and URL values read as the value, muted and monospaced with a
    // middle ellipsis, plus a Change button that opens an inline editor.
    const current = String(resolved.value ?? "");
    control = editing ? (
      <>
        <HitField pad={10}><Input
          size="row"
          className="w-64"
          value={draft}
          disabled={disabled}
          ref={editorRef}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void commitDraft().then((ok) => ok && setEditing(false));
            if (e.key === "Escape") {
              setDraft(current);
              setEditing(false);
            }
          }}
          aria-label={def.label}
        /></HitField>
        <Button type="button" size="row" disabled={disabled} onClick={() => void commitDraft().then((ok) => ok && setEditing(false))}>
          Save
        </Button>
        <Button
          type="button"
          size="row"
          variant="secondary"
          onClick={() => {
            setDraft(current);
            setEditing(false);
          }}
        >
          Cancel
        </Button>
      </>
    ) : (
      <>
        <span title={current} className="min-w-0 max-w-full truncate font-mono text-[13px] text-settings-helper">
          {current ? middleEllipsis(current) : "Not set"}
        </span>
        <Button type="button" size="row" variant="secondary" disabled={disabled} aria-describedby={titleId} onClick={() => setEditing(true)}>
          Change
        </Button>
      </>
    );
  } else if (def.selector === "person" && (def.range as { multiple?: boolean } | undefined)?.multiple) {
    control = (
      <PersonMultiSelect
        value={(resolved.value as string[] | undefined) ?? []}
        onValueChange={(ids) => void write(ids)}
        disabled={disabled}
        excludePersonId={selfPersonId}
        people={people}
        ariaLabel={def.label}
      />
    );
  } else {
    // duration, entity, area, media, and a scalar `person`: typed by the
    // spec's selector vocabulary but with no real registry key yet.
    control = <span className="text-sm text-settings-helper">Not supported in this hub version yet.</span>;
  }

  // A switch is small enough to stay beside the text on a phone; every other
  // control drops under the helper text below `sm` so the text keeps its
  // width and a long value cannot push the row past the screen.
  const stacks = def.selector !== "boolean" || resolved.secret;
  return (
    <Item size="setting" id={`setting-${def.key}`} data-setting-key={def.key} className="flex-wrap sm:flex-nowrap">
      <ItemContent className={stacks ? "basis-full sm:basis-0" : undefined}>
        <ItemTitle id={titleId}>{def.label}</ItemTitle>
        {def.help ? <ItemDescription clamp={false}>{def.help}</ItemDescription> : null}
        {note ? (
          <p role="status" className="text-[13px] leading-4 text-settings-helper">
            {note}
          </p>
        ) : null}
        {canReset ? (
          <Button type="button" variant="link" size="row" onClick={onReset} disabled={disabled} className="h-auto w-fit p-0 text-[13px] before:-inset-y-3.5">
            Reset to default
          </Button>
        ) : null}
      </ItemContent>
      <ItemActions className={stacks ? "w-full min-w-0 flex-wrap sm:w-auto sm:flex-nowrap" : "min-w-0"}>{control}</ItemActions>
    </Item>
  );
}
