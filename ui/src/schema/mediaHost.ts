import { createContext } from "react";
import type { PlayerVoiceover } from "@/kit/primitives/Player";
import { i18n } from "@/kit/i18n";

// MEDIA-PLAYER-01: the schema `play` action hands a media item to the host. The page never
// plays anything itself: Home's shell (its one audio session, AUDIO-SESSION-01) provides this
// context and decides what playing means (open the Watch page, start the docked bar, refuse an
// item the person may not see). Without a host the action is refused with PLAY_UNAVAILABLE.

export interface MediaItemRef {
  id: string;
  src: string;
  kind: "video" | "audio";
  title: string;
  subtitle?: string;
  poster?: string;
  /** ADULT-LOCK-01: the item is adult-only. The kit never hands such an item to the host (`mediaFor`, the `play` action): it
   * plays only inside its own page's player, with no mini player, dock, audio session or Media Session entry. A host that is
   * handed one anyway (a registration made outside the kit) refuses it with `refuseAdultOnly`. Absent or false: unchanged. */
  adultOnly?: boolean;
}

/** ADULT-LOCK-01: the plain line shown when an adult-only item is asked to play anywhere but its own page. */
export const ADULT_ONLY_PAGE_ONLY = "This item plays only on its own page. Open it there.";

export function adultOnlyPageOnly(): string {
  return i18n._({ id: "ui.This item plays only on its own page. Open it there.", message: "This item plays only on its own page. Open it there." });
}

/** ADULT-LOCK-01: the one rule for a host's media store (`createMediaStore`, `mediaFor`): an item that carries `adultOnly: true`
 * is never registered or given an element. Returns true when the item must be refused. */
export function refuseAdultOnly(item: { adultOnly?: boolean }): boolean {
  return item.adultOnly === true;
}

/** HANDOFF-01c: what the `play` action adds. `position_s` is the action's start position, resolved to a finite number >= 0
 * (absent when the action has none or its value did not resolve to one). */
export interface MediaPlayOptions {
  position_s?: number;
}

/** HANDOFF-01c: one other screen the person could continue on. */
export interface CastTarget {
  id: string;
  name: string;
  kind: string;
}

export interface MediaHost {
  /** `mediaId` is the action's `media_id` with its `{field}` placeholders filled; `item` is the bound row it fired for. */
  onPlay(mediaId: string, item: Record<string, unknown>, options?: MediaPlayOptions): void | Promise<void>;
  /** MEDIA-POLISH-01: the element a `player` node plays this item in. A host that returns one owns it (Home's audio
   * session keeps it playing in the docked mini bar after the page closes); the same item must get the same element.
   * Absent, or null: the Player makes its own element and playback stops with the page. Called during render. */
  mediaFor?(item: MediaItemRef): HTMLMediaElement | null;
  /** The spoken DJ line (a hub audio address) the Player plays over this item, or undefined for none; called during render for an item the host owns the element of; must return the same object while the line is unchanged so the Player does not restart it. */
  voiceoverFor?(item: MediaItemRef): PlayerVoiceover | undefined;
  /** HANDOFF-01c: the other screens this person could continue `item` on. Called each time the player's cast menu opens.
   * Absent: the `player` node draws no cast menu. */
  castTargets?(item: Record<string, unknown>): Promise<CastTarget[]>;
  /** HANDOFF-01c: send `item` to one target at `position_s`. Absent: the `player` node draws no cast menu. A rejection
   * is shown under the player with its message. */
  /** VIDEO-CREATE-02: opens the host's media picker (the Library, or an upload) for a `prompt_bar` reference slot of this kind and
   * resolves with the chosen file id and an optional thumbnail address, or null when the person cancels. Absent: the slot
   * stays empty and is disabled, because the kit has no uploader of its own. */
  pickMedia?(kind: "picture" | "character" | "place" | "audio" | "video"): Promise<{ id: string; thumb?: string } | null>;
  /** VIDEO-UI-03 (K8): the one plain line to show instead of a control that starts a picture or a clip while that engine is not
   * ready ("Video is not ready yet. Try again in a minute."), or undefined when it is ready. A `prompt_bar` with `starts` uses it as
   * its `disabledReason`. Called during render, so it may read a query. Absent: nothing is disabled. */
  makingNotice?(kind: "picture" | "video"): string | undefined;
  /** VIDEO-CREATE-02: turns a package asset path (a card's `media`) into an address. Absent: `/api/plugins/<package>/assets/<path>`. */
  assetUrl?(packageId: string, path: string): string;
  castTo?(targetId: string, item: Record<string, unknown>, position_s: number): Promise<void>;
}

export const MediaHostContext = createContext<MediaHost | null>(null);

export const PLAY_UNAVAILABLE = "Playing is not set up on this screen. Open the item from its app.";

export function playUnavailable(): string {
  return i18n._({ id: "ui.Playing is not set up on this screen. Open the item from its app.", message: "Playing is not set up on this screen. Open the item from its app." });
}
