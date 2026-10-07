import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
// The single style package directly, not the `@dicebear/collection`
// barrel - `collection` depends on all ~30 style packages (avataaars,
// bottts, croodles, every other one) to re-export them from one place,
// so depending on it at all pulls the whole set into the install graph
// for the one style actually used (a code review, 2026-09-26, caught
// this the first time it landed as `@dicebear/collection`).
import * as adventurer from "@dicebear/adventurer";
import { Avatar as AvatarRoot, AvatarFallback, AvatarImage, AvatarBadge } from "@/kit/ui/avatar";
import { cn } from "@/kit/utils";
import { profileAccentStyle, type ProfileAccent } from "@/kit/primitives/profileAccent";

interface AvatarProps {
  name: string;
  /** `Person.avatar_seed` (`spec/schemas/person.schema.json`): "Deterministic
   * seed for a generated avatar; never a photo of a real person by
   * default." When set, renders a DiceBear picture from it. Optional
   * because not every caller has a Person yet (SignIn's own placeholder
   * name has no record behind it); absent, or a generation failure,
   * falls back to the initial below - the real photo state
   * (`avatar_file_id`, `AVATAR-RENDER-01`'s own design note) is a
   * separate, not-yet-spec'd field and out of scope here. */
  seed?: string | null;
  className?: string;
  size?: "default" | "profile";
  accent?: ProfileAccent;
  /** A small filled dot on the avatar's own corner - the phone header
   * fold's own stand-in for a separate notification badge (owner
   * reference, "The phone composition," 2026-09-20: "the bell's count
   * shows as a dot on the avatar"). Deliberately not the count itself:
   * the reference's own header has no room for a number, and the
   * avatar menu it opens already shows the real count. */
  dot?: boolean;
}

// The DiceBear style is an open call this item's own design note left to
// implementation ("make the smallest reasonable call and note it",
// AVATAR-RENDER-01): "adventurer" - a friendly, all-ages face, not a
// robot or an abstract identicon - the same reasoning that will pick a
// wake word or an assistant voice, applied here first.
//
// Exported so Avatar.test.tsx can assert the seed-to-picture mapping
// directly - happy-dom's image loading is off by default (deterministic,
// offline test runs), so a full render can never observe the resulting
// `<img>` actually "load"; this is still the one place the logic lives,
// just testable without a real browser's image pipeline.
export function diceBearAvatarUri(seed: string): string | null {
  try {
    return createAvatar(adventurer, { seed, size: 96 }).toDataUri();
  } catch {
    // Never a guess dressed up as a picture - genuinely unrenderable
    // (a future DiceBear major bump, a malformed seed) falls back to
    // the initial below exactly like no seed at all.
    return null;
  }
}

// 3.1's real avatar rendering (DiceBear SVG, PNG rasterization,
// /avatar/:userId) was deferred (home/docs/dev.md's Review queue: "no shell
// or kit work has started; revisit when the shell's profile picker is
// built"). The picker (`PEOPLE-GRID-01`) is built and this is that
// revisit (`AVATAR-RENDER-01`): a seed renders a real DiceBear picture: no
// seed at all, or a render failure, still gets the documented fallback
// (initials on a flat tint), now a genuine last resort rather than the
// only path.
//
// A pattern component on top of `kit/ui/avatar.tsx` (name-to-initial is
// product logic, not something a generic Avatar primitive knows), the
// same relationship Card and Select have to their generated bases. The
// Image-then-Fallback shape mirrors the kit's other optional-asset avatar
// (`assistant-ui/attachment.aui.tsx`'s `AttachmentThumb`: an `AvatarImage`
// for the real thing, `AvatarFallback` for when there isn't one) rather
// than inventing a second way to show "picture, or a stand-in for one."
export function Avatar({ name, seed, className, size = "default", accent, dot }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const trimmedSeed = seed?.trim();
  // Memoized: DiceBear's own SVG generation runs synchronously and isn't
  // free, and the seed rarely changes across a re-render.
  const avatarUri = useMemo(() => (trimmedSeed ? diceBearAvatarUri(trimmedSeed) : null), [trimmedSeed]);
  return (
    <AvatarRoot
      data-accent={accent}
      style={accent ? profileAccentStyle(accent) : undefined}
      // The caller's text size (SignIn's `text-xl`, Shell's `text-sm`,
      // MessageThread's `text-sm`) sets the font-size here, on the root.
      className={cn(
        size === "profile" ? "size-16 text-xl" : "size-12",
        "bg-primary text-primary-foreground font-semibold text-base after:hidden",
        accent && "ring-2 ring-offset-2 ring-offset-card ring-[var(--profile-accent-active)]",
        className,
      )}
    >
      {/* Decorative, same reasoning as the initial below: every real
          caller already renders the full name as separate, adjacent
          visible text, so the picture carries no information a screen
          reader needs read aloud. Radix's own Image-to-Fallback swap
          (kit/ui/avatar.tsx) is what makes a failed load fall through to
          the initial with no extra code here. */}
      {avatarUri ? <AvatarImage src={avatarUri} alt="" /> : null}
      {/* kit/ui/avatar.tsx's AvatarFallback hardcodes its own `text-sm` in
          its base classes, so it never actually inherited the root's size
          in the first place (a code review, 2026-09-05, caught every
          non-default caller's size silently doing nothing - verified live,
          the root's text-xl/text-sm made no difference until this line).
          `text-[length:inherit]` overrides that hardcoded size back to
          "whatever the root above is set to", which is the one property
          Tailwind has no bare utility for (`text-inherit` sets color, not
          size). */}
      {/* A screen-reader read-through (session E step 7, 2026-09-06)
          found this initial announced as real text everywhere Avatar is
          used - "S Sage Owner" on People, "S You M Marlow N Nova" on
          Home's Who's Here strip - since nothing ever named the letter
          decorative. It stands in for a real picture (this file's own
          header comment), and every real caller already renders the
          full name as separate, adjacent visible text, so the letter
          itself carries no information a screen reader needs to hear
          twice. */}
      <AvatarFallback aria-hidden delayMs={0} className="bg-transparent text-[length:inherit] text-primary-foreground">
        {initial}
      </AvatarFallback>
      {/* aria-hidden: same reasoning as the initial above - the dot
          stands in for a count the menu this avatar opens already
          shows in real text, not new information of its own. */}
      {dot ? <AvatarBadge aria-hidden /> : null}
    </AvatarRoot>
  );
}
