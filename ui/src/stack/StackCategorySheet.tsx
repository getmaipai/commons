// STACK-MODELS-PAGE-01. The details of one feature, in a sheet (a bottom sheet on a phone): the on and off switch, the model each level uses,
// every model with download and remove, and behind "More" the order models are tried in and the choices saved for other computer sizes.
import { useEffect, useState } from "react";
import { Button } from "@/kit/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/kit/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/kit/ui/sheet";
import { Switch } from "@/kit/ui/switch";
import { getIcon } from "@/kit/icons";
import { i18n } from "@/kit/i18n";
import { cn } from "@/kit/utils";
import type { StackCategoryId, StackChoiceCategory, StackLevel, StackProfileAssignment } from "./StackClient";
import { ChoiceList } from "./StackChoiceList";
import { LevelList } from "./StackLevelList";
import { ModelList, OrderList } from "./StackModelList";
import { IconChip, NoticeLine, Pill, categoryIconName } from "./StackParts";
import type { Notice } from "./StackParts";
import { candidateById, levelsOf, lockFor, toneOf, cardState } from "./stackLogic";
import { categoryBlurb, cardStateWord, gb, levelName, profileName } from "./stackWords";
import type { Outcome, StackChoicesState } from "./useStackChoices";

const ChevronIcon = getIcon("chevron-down");
const LockIcon = getIcon("lock");

export function useIsPhone(): boolean {
  const query = "(max-width: 639px)";
  const read = () => (typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(query).matches : false);
  const [phone, setPhone] = useState(read);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(query);
    const on = () => setPhone(media.matches);
    media.addEventListener?.("change", on);
    return () => media.removeEventListener?.("change", on);
  }, []);
  return phone;
}

/** What a level or profile pick said back, in one sentence. */
function pickSentence(level: string, model: string | null, value: string, note: string | null, started: boolean): string {
  const base = value === "off"
    ? i18n._({ id: "ui.{level} is off.", message: "{level} is off.", values: { level } })
    : value === "recommended"
      ? i18n._({ id: "ui.{level} uses the recommended model: {model}.", message: "{level} uses the recommended model: {model}.", values: { level, model: model ?? "" } })
      : i18n._({ id: "ui.{level} now uses {model}.", message: "{level} now uses {model}.", values: { level, model: model ?? "" } });
  const tail = started ? ` ${i18n._({ id: "ui.It is downloading first and starts being used when it is ready.", message: "It is downloading first and starts being used when it is ready." })}` : note ? ` ${note}` : "";
  return base + tail;
}

function ProfileBlock({ category, profile, labelOf, busy, lock, onChoose }: { category: StackChoiceCategory; profile: StackProfileAssignment; labelOf: (id: string) => string; busy: boolean; lock: string | null; onChoose: (level: StackLevel, value: string, profile: StackProfileAssignment["profile"]) => Promise<{ ok: boolean }> }) {
  const [editing, setEditing] = useState<StackLevel | null>(null);
  const options = category.candidates.filter((c) => c.pickable && c.state !== "unsupported").sort((a, b) => a.rank - b.rank).map((c) => ({ value: c.id, label: c.label, summary: c.summary, facts: [gb(c.size_bytes), c.min_profile].filter(Boolean).join(" · ") }));
  return (
    <li className="flex flex-col gap-2 py-3">
      <p className="flex flex-wrap items-center gap-2 font-medium">{profileName(profile.memory_gb)}{profile.current && <Pill tone="primary">{i18n._({ id: "ui.This computer", message: "This computer" })}</Pill>}</p>
      <ul className="flex flex-col gap-1.5" aria-label={i18n._({ id: "ui.Models for {profile}", message: "Models for {profile}", values: { profile: profileName(profile.memory_gb) } })}>
        {levelsOf(category).map((row) => {
          const assigned = profile.assignments.find((a) => a.tier === row.tier);
          const title = category.tiered ? levelName(row.tier) : i18n._({ id: "ui.Model", message: "Model" });
          return (
            <li key={row.tier} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-24 shrink-0 text-sm text-muted-foreground">{title}</span>
                <span className="min-w-0 flex-1 break-words text-sm">{assigned ? labelOf(assigned.model) : i18n._({ id: "ui.Recommended", message: "Recommended" })}</span>
                {!lock && <Button variant="ghost" size="sm" aria-expanded={editing === row.tier} onClick={() => setEditing(editing === row.tier ? null : row.tier)} aria-label={i18n._({ id: "ui.Change {level} for {profile}", message: "Change {level} for {profile}", values: { level: title, profile: profileName(profile.memory_gb) } })}>{i18n._({ id: "ui.Change", message: "Change" })}</Button>}
              </div>
              {editing === row.tier && !lock && (
                <ChoiceList
                  name={i18n._({ id: "ui.Models for {level} on {profile}", message: "Models for {level} on {profile}", values: { level: title, profile: profileName(profile.memory_gb) } })}
                  options={[{ value: "recommended", label: i18n._({ id: "ui.Recommended", message: "Recommended" }) }, ...options]}
                  selected={assigned ? assigned.model : "recommended"}
                  busy={busy}
                  onPick={(value) => { void onChoose(row.tier, value, profile.profile).then((r) => { if (r.ok) setEditing(null); }); }}
                />
              )}
            </li>
          );
        })}
      </ul>
      {lock && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lock}</p>}
    </li>
  );
}

export function StackCategorySheet({ category, state, labelOf, locked, highlightId, onClose }: {
  category: StackChoiceCategory | null; state: StackChoicesState; labelOf: (id: string) => string; locked: Readonly<Record<string, string>> | undefined; highlightId: string | null; onClose: () => void;
}) {
  const phone = useIsPhone();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [more, setMore] = useState(false);
  const id: StackCategoryId | null = category?.id ?? null;
  useEffect(() => { setNotice(null); setMore(false); }, [id]);
  const say = (outcome: Outcome<unknown>, ok: string) => setNotice(outcome.ok ? { kind: "ok", text: ok } : { kind: "error", text: outcome.message });

  return (
    <Sheet open={category !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side={phone ? "bottom" : "right"} className="gap-0 overflow-y-auto sm:max-w-xl" aria-describedby={undefined}>
        {category && (() => {
          const lockAll = lockFor(locked, category.id);
          const head = cardState(category);
          const switchable = category.role !== null && category.role_enabled !== null;
          const enabled = category.role_enabled !== false;
          const roleBusy = state.busy.has(`role:${category.role}`);
          const pickBusy = [...state.busy].some((k) => k.startsWith(`pick:${category.id}:`));
          return (
            <>
              <SheetHeader className="gap-3">
                <div className="flex items-center gap-3 pe-10">
                  <IconChip icon={categoryIconName(category.id)} tone={toneOf(head.state)} />
                  <div className="min-w-0 flex-1">
                    <SheetTitle className="break-words">{category.label}</SheetTitle>
                    <SheetDescription>{categoryBlurb(category.id)}</SheetDescription>
                  </div>
                  {switchable && (
                    lockAll
                      ? <LockIcon aria-hidden="true" className="size-4 text-muted-foreground" />
                      : <Switch checked={enabled} disabled={roleBusy} onCheckedChange={(on) => { void state.setRoleEnabled(category.role!, on).then((o) => say(o, on ? i18n._({ id: "ui.{feature} is on.", message: "{feature} is on.", values: { feature: category.label } }) : i18n._({ id: "ui.{feature} is off. Anything it was running has stopped.", message: "{feature} is off. Anything it was running has stopped.", values: { feature: category.label } }))); }} aria-label={i18n._({ id: "ui.{feature} on or off", message: "{feature} on or off", values: { feature: category.label } })} />
                  )}
                </div>
                <p className="flex flex-wrap items-center gap-2"><Pill tone={toneOf(head.state)}>{cardStateWord(head.state, head.percent)}</Pill>{category.role_plan?.reason && <span className="text-sm text-muted-foreground">{category.role_plan.reason}</span>}</p>
                {!category.available && category.unavailable_reason && <p className="text-sm">{category.unavailable_reason}</p>}
                {lockAll && <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><LockIcon aria-hidden="true" className="size-4" />{lockAll}</p>}
                <NoticeLine notice={notice} onDismiss={() => setNotice(null)} />
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-6">
                <section aria-labelledby="sheet-levels" className="flex flex-col gap-1">
                  <h3 id="sheet-levels" className="text-base font-semibold">{category.tiered ? i18n._({ id: "ui.Which model each level uses", message: "Which model each level uses" }) : i18n._({ id: "ui.Which model it uses", message: "Which model it uses" })}</h3>
                  <LevelList
                    category={category}
                    labelOf={labelOf}
                    lockOf={(level) => lockFor(locked, category.id, level)}
                    busy={pickBusy}
                    onChoose={async (level, value) => {
                      const outcome = await state.choose(category.id, level, { model: value });
                      if (outcome.ok) {
                        const used = candidateById(category, outcome.value.model);
                        setNotice({ kind: "ok", text: pickSentence(category.tiered ? levelName(level) : category.label, used?.label ?? (outcome.value.model ? labelOf(outcome.value.model) : null), value, outcome.value.note, outcome.value.install_job !== null) });
                      } else setNotice({ kind: "error", text: outcome.message });
                      return outcome;
                    }}
                  />
                </section>
                <section aria-labelledby="sheet-models" className="flex flex-col gap-2">
                  <h3 id="sheet-models" className="text-base font-semibold">{i18n._({ id: "ui.Models", message: "Models" })}</h3>
                  <ModelList
                    category={category}
                    highlightId={highlightId}
                    busyKeys={state.busy}
                    onInstall={async (modelId) => {
                      const outcome = await state.install(modelId);
                      say(outcome, outcome.ok && outcome.value.already_installed ? i18n._({ id: "ui.That model is already installed.", message: "That model is already installed." }) : i18n._({ id: "ui.Downloading {model}. This can take a while; its status changes when it is ready.", message: "Downloading {model}. This can take a while; its status changes when it is ready.", values: { model: labelOf(modelId) } }));
                      return outcome;
                    }}
                    onRemove={async (modelId) => {
                      const outcome = await state.uninstall(modelId);
                      say(outcome, i18n._({ id: "ui.{model} was removed.", message: "{model} was removed.", values: { model: labelOf(modelId) } }));
                      return outcome;
                    }}
                  />
                </section>
                {!lockAll && (
                  <Collapsible open={more} onOpenChange={setMore}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="-ms-2 w-fit"><span>{i18n._({ id: "ui.More", message: "More" })}</span><ChevronIcon aria-hidden="true" className={cn("transition-transform", more && "rotate-180")} /></Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="flex flex-col gap-6 pt-3">
                      <section aria-labelledby="sheet-order" className="flex flex-col gap-2">
                        <h3 id="sheet-order" className="text-base font-semibold">{i18n._({ id: "ui.Order and fallbacks", message: "Order and fallbacks" })}</h3>
                        <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.The Stack tries models from the top. Switch one off and it is never used.", message: "The Stack tries models from the top. Switch one off and it is never used." })}</p>
                        <OrderList category={category} busy={state.busy.has(`order:${category.id}`)} onSave={async (order, off) => { const o = await state.saveOrder(category.id, order, off); say(o, i18n._({ id: "ui.The order was saved.", message: "The order was saved." })); return o; }} />
                      </section>
                      {category.profiles.length > 0 && (
                        <section aria-labelledby="sheet-profiles" className="flex flex-col gap-1">
                          <h3 id="sheet-profiles" className="text-base font-semibold">{i18n._({ id: "ui.Other computer sizes", message: "Other computer sizes" })}</h3>
                          <p className="text-sm text-muted-foreground">{i18n._({ id: "ui.The choices kept for each amount of memory. They apply if this setup moves to a bigger or smaller computer.", message: "The choices kept for each amount of memory. They apply if this setup moves to a bigger or smaller computer." })}</p>
                          <ul className="flex flex-col divide-y divide-border">
                            {[...category.profiles].sort((a, b) => a.memory_gb - b.memory_gb).map((profile) => (
                              <ProfileBlock
                                key={profile.profile}
                                category={category}
                                profile={profile}
                                labelOf={labelOf}
                                busy={pickBusy}
                                lock={null}
                                onChoose={async (level, value, which) => {
                                  const o = await state.choose(category.id, level, { model: value, profile: which, install: false });
                                  say(o, i18n._({ id: "ui.Saved for {profile}.", message: "Saved for {profile}.", values: { profile: profileName(profile.memory_gb) } }));
                                  return o;
                                }}
                              />
                            ))}
                          </ul>
                        </section>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </>
          );
        })()}
      </SheetContent>
    </Sheet>
  );
}

