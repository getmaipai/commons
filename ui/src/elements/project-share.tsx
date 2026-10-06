"use client";

import type { FC } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Select } from "../primitives/Select";

/**
 * PROJECTS-KIT-01. ChatGPT's project Share dialog, for a household: the
 * people the host lists (adults only; the host decides who may be shared
 * with) each with "No access", "Can use" or "Can edit". A host passes the
 * people, the copy and the handler.
 */
export type ProjectShareRole = "none" | "can_use" | "can_edit";

export type ProjectShareMember = { id: string; name: string; role: ProjectShareRole };

export type ProjectShareLabels = {
  title?: string;
  description?: string;
  empty?: string;
  roles?: Partial<Record<ProjectShareRole, string>>;
};

const ROLE_DEFAULTS: Record<ProjectShareRole, string> = { none: "No access", can_use: "Can use", can_edit: "Can edit" };

export const ProjectShareDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: readonly ProjectShareMember[];
  onRoleChange: (memberId: string, role: ProjectShareRole) => void | Promise<void>;
  disabled?: boolean | undefined;
  labels?: ProjectShareLabels | undefined;
}> = ({ open, onOpenChange, members, onRoleChange, disabled, labels }) => {
  const roleLabels = { ...ROLE_DEFAULTS, ...labels?.roles };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-slot="project-share" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{labels?.title ?? "Share project"}</DialogTitle>
          <DialogDescription>
            {labels?.description ?? "Choose who in your home can use this project. People you share it with use its instructions and chats."}
          </DialogDescription>
        </DialogHeader>
        {members.length === 0 ? (
          <p className="text-muted-foreground text-sm">{labels?.empty ?? "There is no one to share with yet."}</p>
        ) : (
          <ul className="grid gap-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate">{member.name}</span>
                <Select
                  aria-label={member.name}
                  value={member.role}
                  disabled={disabled}
                  options={["none", "can_use", "can_edit"]}
                  getLabel={(role) => roleLabels[role as ProjectShareRole] ?? role}
                  onValueChange={(role) => void onRoleChange(member.id, role as ProjectShareRole)}
                />
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
