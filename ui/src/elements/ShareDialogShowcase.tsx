"use client";

// LIBRARY-REVAMP-06 slice B story: ShareDialog for a file (on and off per person, a household row, a row that cannot
// be changed with its reason in plain text, a saving state, a failure, and the warning step before the household), and
// the project preset (three roles) beside it. Names are samples.
import { useState } from "react";
import { Button } from "../ui/button";
import { ProjectShareDialog, type ProjectShareMember } from "./project-share";
import { ShareDialog, type ShareConfirmStep } from "./share-dialog";

type FileRoles = Record<string, string>;

const PEOPLE = [
  { id: "marlow", name: "Marlow", avatarSeed: "marlow" },
  { id: "nova", name: "Nova", avatarSeed: "nova" },
  { id: "iris", name: "Iris", avatarSeed: "iris" },
  { id: "quill", name: "Quill", avatarSeed: "quill" },
  { id: "daisy", name: "Daisy", avatarSeed: "daisy" },
];

export function ShareDialogShowcase() {
  const [fileOpen, setFileOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [roles, setRoles] = useState<FileRoles>({ marlow: "view", nova: "off", iris: "off", quill: "off", daisy: "off", household: "off" });
  const [saving, setSaving] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [projectRoles, setProjectRoles] = useState<Record<string, ProjectShareMember["role"]>>({ marlow: "can_use", nova: "none" });

  function save(id: string, role: string) {
    setFailed(null);
    setSaving(id);
    window.setTimeout(() => {
      setSaving(null);
      // Quill's change never saves, to show the failure words.
      if (id === "quill") {
        setFailed(id);
        return;
      }
      setRoles((current) => ({ ...current, [id]: role }));
    }, 500);
  }

  const confirm: ShareConfirmStep | null = asking
    ? {
        title: "Share with everyone in the home?",
        body: "Everyone in the home, including the children, will be able to see this picture. You can stop sharing at any time.",
        confirmLabel: "Share with everyone",
        cancelLabel: "Go back",
        onConfirm: () => {
          setRoles((current) => ({ ...current, household: "view" }));
          setAsking(false);
        },
        onCancel: () => setAsking(false),
      }
    : null;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap gap-2 p-4">
      <Button variant="secondary" onClick={() => setFileOpen(true)}>
        Share a file
      </Button>
      <Button variant="secondary" onClick={() => setProjectOpen(true)}>
        Share a project
      </Button>
      <ShareDialog
        open={fileOpen}
        onOpenChange={(next) => {
          setFileOpen(next);
          if (!next) setAsking(false);
        }}
        labels={{ title: "Share Fox in the snow" }}
        household={{ role: roles.household ?? "off", busy: saving === "household" }}
        members={PEOPLE.map((person) => ({
          ...person,
          role: roles[person.id] ?? "off",
          busy: saving === person.id,
          error: failed === person.id ? "Home could not save that. Check your connection and try again." : undefined,
          disabledReason: person.id === "daisy" ? "This picture is for adults only, so it cannot be shared with a child." : undefined,
        }))}
        onRoleChange={(id, role) => {
          if (id === "household" && role === "view") {
            setAsking(true);
            return;
          }
          save(id, role);
        }}
        confirm={confirm}
      />
      <ProjectShareDialog
        open={projectOpen}
        onOpenChange={setProjectOpen}
        members={[
          { id: "marlow", name: "Marlow", role: projectRoles.marlow ?? "none" },
          { id: "nova", name: "Nova", role: projectRoles.nova ?? "none" },
        ]}
        onRoleChange={(id, role) => setProjectRoles((current) => ({ ...current, [id]: role }))}
      />
    </div>
  );
}
