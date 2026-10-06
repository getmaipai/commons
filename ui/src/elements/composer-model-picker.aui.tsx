"use client";

import { useEffect, useState } from "react";
import { useAui } from "@assistant-ui/react";
import { cn } from "cn";
import {
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  type ComposerModel,
} from "./composer";

/**
 * Runtime form of the composer's model pill, vendored from assistant-ui's
 * `composer-model-picker` Element. The choice is registered into the
 * thread's model context so it reaches the next request; the catalog of
 * models is whatever the caller passes (nothing is fetched here). Whether a
 * given person may switch models is the caller's call: render it only where
 * switching is allowed.
 */
export function ComposerModelPicker({
  models,
  defaultModel,
  onChange,
  className,
}: {
  models: readonly ComposerModel[];
  /** Name of the model selected first; the first entry when omitted. */
  defaultModel?: string;
  onChange?: (name: string) => void;
  className?: string;
}) {
  const aui = useAui();
  // Remember the pick by name and resolve it against the current list, so a
  // list that arrives late or changes never leaves a stale model registered.
  const [pickedName, setPickedName] = useState<string | undefined>(defaultModel);
  const selected = models.find((m) => m.name === pickedName) ?? models[0];
  const [open, setOpen] = useState(false);
  const name = selected?.name;

  useEffect(() => {
    if (!name) return;
    return aui.modelContext().register({
      getModelContext: () => ({ config: { modelName: name } }),
    });
  }, [aui, name]);

  if (!selected) return null;

  return (
    <div data-slot="composer-model-picker" className={cn("relative", className)}>
      <ComposerModelTrigger
        model={selected.name}
        open={open}
        onClick={() => setOpen((v) => !v)}
      />
      <ComposerMenu open={open}>
        {models.map((entry) => (
          <ComposerModelItem
            key={entry.name}
            entry={entry}
            selected={entry.name === selected.name}
            onClick={() => {
              setPickedName(entry.name);
              setOpen(false);
              onChange?.(entry.name);
            }}
          />
        ))}
      </ComposerMenu>
    </div>
  );
}
