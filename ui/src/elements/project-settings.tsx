"use client";

import { useEffect, useRef, useState, type FC } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select } from "../primitives/Select";
import { DEFAULT_PROJECT_HUE, DEFAULT_PROJECT_ICON, ProjectIconPicker, type ProjectIconPickerLabels } from "./project-mark";

/**
 * PROJECTS-KIT-01. The project settings form, drawn once (ChatGPT's
 * "Project settings"): name with the icon button beside it, description,
 * instructions, memory, delete. A host passes the record, the copy and the
 * handlers; the form saves one patch of the fields that changed. A child's
 * project is edited by a parent, so the host decides `readOnly`.
 */
export type ProjectSettingsValue = {
  name: string;
  icon: string;
  color: string;
  description: string;
  instructions: string;
  memory_mode: string;
};

export type ProjectSettingsLabels = {
  title?: string;
  /** Screen-reader summary of the dialog. */
  summary?: string;
  name?: string;
  description?: string;
  descriptionHelp?: string;
  instructions?: string;
  instructionsHelp?: string;
  instructionsPlaceholder?: string;
  memory?: string;
  memoryOptions?: Record<string, string>;
  memoryHelp?: Record<string, string>;
  save?: string;
  cancel?: string;
  delete?: string;
  confirmDeleteTitle?: string;
  /** Text under the delete confirmation title. Default says the chats stay. */
  confirmDelete?: string;
  picker?: ProjectIconPickerLabels;
};

const DEFAULTS = {
  title: "Project settings",
  summary: "Edit this project's name, icon, instructions and memory.",
  name: "Project name",
  description: "Description",
  descriptionHelp: "A short note about what this project is for. It is for people only; the assistant does not read it.",
  instructions: "Instructions",
  instructionsHelp: "Set context and customize how the assistant responds in this project.",
  instructionsPlaceholder: "e.g. “Respond in Spanish. Keep answers short and focused.”",
  memory: "Memory",
  save: "Save",
  cancel: "Cancel",
  delete: "Delete project",
  confirmDeleteTitle: "Delete this project?",
  confirmDelete: "Its chats stay.",
};

const MEMORY_DEFAULT_LABELS: Record<string, string> = { shared: "Default", project_only: "Project-only" };
const MEMORY_DEFAULT_HELP: Record<string, string> = {
  shared: "This project can use your memory from outside chats, and the other way round.",
  project_only: "This project keeps its own memory. It does not read or add to your other memories.",
};

export const INSTRUCTIONS_MAX = 1500;
export const DESCRIPTION_MAX = 500;
export const PROJECT_NAME_MAX = 80;

const changed = (a: ProjectSettingsValue, b: ProjectSettingsValue): Partial<ProjectSettingsValue> => {
  const patch: Partial<ProjectSettingsValue> = {};
  for (const key of Object.keys(a) as (keyof ProjectSettingsValue)[]) {
    if (a[key] !== b[key]) patch[key] = a[key];
  }
  return patch;
};

export const ProjectSettingsDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: ProjectSettingsValue;
  /** Saves only the fields that changed. Reject to keep the dialog open. */
  onSave: (patch: Partial<ProjectSettingsValue>) => void | Promise<void>;
  /** Omit to hide Delete (a person who may edit but not delete). */
  onDelete?: (() => void | Promise<void>) | undefined;
  /** Hide the memory control (a host whose memory scope is not built yet). */
  memoryModes?: readonly string[] | undefined;
  readOnly?: boolean | undefined;
  labels?: ProjectSettingsLabels | undefined;
}> = ({ open, onOpenChange, value, onSave, onDelete, memoryModes = ["shared", "project_only"], readOnly = false, labels }) => {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // A reopened dialog starts from the stored record, never a stale draft.
  // Only on the closed-to-open edge: a host that rebuilds `value` on every
  // render, or a refetch while the dialog is open, must not wipe typing.
  const wasOpen = useRef(open);
  useEffect(() => {
    if (open && !wasOpen.current) setDraft(value);
    wasOpen.current = open;
  }, [open, value]);
  const text = { ...DEFAULTS, ...labels };
  const patch = changed({ ...draft, name: draft.name.trim() }, value);
  const dirty = Object.keys(patch).length > 0;
  const nameOk = draft.name.trim().length > 0;
  const memoryLabels = { ...MEMORY_DEFAULT_LABELS, ...labels?.memoryOptions };
  const memoryHelp = { ...MEMORY_DEFAULT_HELP, ...labels?.memoryHelp };
  const set = (key: keyof ProjectSettingsValue) => (next: string) => setDraft((current) => ({ ...current, [key]: next }));

  const save = async () => {
    setSaving(true);
    try {
      await onSave(patch);
      onOpenChange(false);
    } catch {
      // The host says what went wrong; the dialog stays open with the draft.
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent data-slot="project-settings" className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{text.title}</DialogTitle>
            <DialogDescription className="sr-only">{text.summary}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (dirty && nameOk && !readOnly && !saving) void save();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="project-settings-name">{text.name}</Label>
              <div className="flex items-center gap-2">
                <ProjectIconPicker
                  icon={draft.icon || DEFAULT_PROJECT_ICON}
                  color={draft.color || DEFAULT_PROJECT_HUE}
                  disabled={readOnly}
                  labels={labels?.picker}
                  onChange={(next) => setDraft((current) => ({ ...current, ...next }))}
                />
                <Input
                  id="project-settings-name"
                  value={draft.name}
                  maxLength={PROJECT_NAME_MAX}
                  readOnly={readOnly}
                  onChange={(event) => set("name")(event.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-settings-description">{text.description}</Label>
              <p className="text-muted-foreground text-sm">{text.descriptionHelp}</p>
              <Textarea
                id="project-settings-description"
                showCount
                value={draft.description}
                maxLength={DESCRIPTION_MAX}
                readOnly={readOnly}
                onChange={(event) => set("description")(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="project-settings-instructions">{text.instructions}</Label>
              <p className="text-muted-foreground text-sm">{text.instructionsHelp}</p>
              <Textarea
                id="project-settings-instructions"
                showCount
                value={draft.instructions}
                maxLength={INSTRUCTIONS_MAX}
                readOnly={readOnly}
                placeholder={text.instructionsPlaceholder}
                onChange={(event) => set("instructions")(event.target.value)}
              />
            </div>
            {memoryModes.length > 1 ? (
              <div className="grid gap-2">
                <Label id="project-settings-memory-label">{text.memory}</Label>
                <Select
                  aria-label={text.memory}
                  value={draft.memory_mode}
                  disabled={readOnly}
                  options={[...memoryModes]}
                  getLabel={(mode) => memoryLabels[mode] ?? mode}
                  onValueChange={set("memory_mode")}
                />
                <p className="text-muted-foreground text-sm">{memoryHelp[draft.memory_mode] ?? ""}</p>
              </div>
            ) : null}
            <DialogFooter className="items-center sm:justify-between">
              {onDelete && !readOnly ? (
                <Button type="button" variant="destructive" onClick={() => setConfirming(true)}>
                  {text.delete}
                </Button>
              ) : (
                <span />
              )}
              {readOnly ? null : (
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    {text.cancel}
                  </Button>
                  <Button type="submit" disabled={!dirty || !nameOk || saving}>
                    {text.save}
                  </Button>
                </div>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.confirmDeleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.confirmDelete}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{text.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (event) => {
                // Stay open until the delete is done; a failure keeps the
                // settings dialog (the host says what went wrong).
                event.preventDefault();
                try {
                  await onDelete?.();
                  setConfirming(false);
                  onOpenChange(false);
                } catch {
                  setConfirming(false);
                }
              }}
            >
              {text.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
