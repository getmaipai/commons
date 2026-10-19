"use client";

import type { FC } from "react";
import { ShareDialog, type ShareRole } from "./share-dialog";

/**
 * PROJECTS-KIT-01. ChatGPT's project Share dialog, for a household: the
 * people the host lists (adults only; the host decides who may be shared
 * with) each with "No access", "Can use" or "Can edit". A host passes the
 * people, the copy and the handler.
 *
 * LIBRARY-REVAMP-06 slice B: this is now the three-role preset of `ShareDialog`
 * (same props, same words, same behaviour).
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
  const roles: ShareRole[] = (Object.keys(ROLE_DEFAULTS) as ProjectShareRole[]).map((id) => ({ id, label: roleLabels[id] ?? id }));
  return (
    <ShareDialog
      dataSlot="project-share"
      open={open}
      onOpenChange={onOpenChange}
      members={members}
      roles={roles}
      onRoleChange={(memberId, role) => onRoleChange(memberId, role as ProjectShareRole)}
      disabled={disabled}
      showDone={false}
      showAvatars={false}
      labels={{
        title: labels?.title ?? "Share project",
        description: labels?.description ?? "Choose who in your home can use this project. People you share it with use its instructions and chats.",
        empty: labels?.empty ?? "There is no one to share with yet.",
      }}
    />
  );
};
