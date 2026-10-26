import { LockKeyholeIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarGroup, AvatarGroupCount, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { diceBearAvatarUri } from "../primitives/Avatar";

export interface VisibilityPerson {
  id: string;
  name: string;
  avatarUrl?: string | null;
  avatarSeed?: string | null;
}

export interface VisibilityChipProps {
  mode: "private" | "shared";
  people: VisibilityPerson[];
  canManage: boolean;
  onOpen: () => void;
}

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "?";
}

export function VisibilityChip({ mode, people, canManage, onOpen }: VisibilityChipProps) {
  const visible = people.slice(0, 3);
  const remainder = Math.max(0, people.length - visible.length);
  return (
    <Button type="button" variant="outline" size="sm" aria-label={`${mode === "private" ? "Private" : "Shared"}${canManage ? ", manage sharing" : ", view sharing"}`} onClick={onOpen}>
      {mode === "private" ? <LockKeyholeIcon aria-hidden className="size-4" /> : (
        <AvatarGroup aria-hidden>
          {visible.map((person) => (
            <Avatar key={person.id}>
              {(() => {
                const src = person.avatarUrl ?? (person.avatarSeed ? diceBearAvatarUri(person.avatarSeed) : null);
                return src ? <AvatarImage src={src} alt="" /> : null;
              })()}
              <AvatarFallback>{initials(person.name)}</AvatarFallback>
            </Avatar>
          ))}
          {remainder > 0 ? <AvatarGroupCount>+{remainder}</AvatarGroupCount> : null}
        </AvatarGroup>
      )}
      <span>{mode === "private" ? "Private" : "Shared"}</span>
    </Button>
  );
}

