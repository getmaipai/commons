import { Button } from "../ui/button";
import { ShareDialog } from "./share-dialog";
import type { VisibilityPerson } from "./visibility-chip";
import { i18n } from "@/kit/i18n";

export interface SharePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: VisibilityPerson[];
  candidates: VisibilityPerson[];
  canManage: boolean;
  onAdd: (personId: string) => void | Promise<void>;
  onRemove: (personId: string) => void | Promise<void>;
  onMakePrivate: () => void | Promise<void>;
}

export function SharePanel({ open, onOpenChange, people, candidates, canManage, onAdd, onRemove, onMakePrivate }: SharePanelProps) {
  const currentIds = new Set(people.map((person) => person.id));
  const listed = canManage ? [...candidates, ...people.filter((person) => !candidates.some((candidate) => candidate.id === person.id))] : people;
  const rows = listed.map((person) => ({
    id: person.id,
    name: person.name,
    role: currentIds.has(person.id) ? "view" : "off",
    avatarSeed: person.avatarSeed ?? person.name,
    avatarUrl: person.avatarUrl,
    disabledReason: canManage ? undefined : "",
  }));
  return (
    <ShareDialog
      open={open}
      onOpenChange={onOpenChange}
      members={rows}
      disabled={!canManage}
      showDone
      labels={{
        title: i18n._({ id: "ui.Who can see this?", message: "Who can see this?" }),
        description: canManage ? i18n._({ id: "ui.Choose who can see this.", message: "Choose who can see this." }) : i18n._({ id: "ui.These people can see this.", message: "These people can see this." }),
        empty: i18n._({ id: "ui.No one else can see this yet.", message: "No one else can see this yet." }),
      }}
      restrictions={canManage ? <Button type="button" variant="link" height="auto" onClick={() => void onMakePrivate()}>{i18n._({ id: "ui.Make private", message: "Make private" })}</Button> : undefined}
      onRoleChange={(personId, role) => role === "view" ? onAdd(personId) : onRemove(personId)}
    />
  );
}
