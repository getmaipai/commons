import { createContext } from "react";

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
  /** HANDOFF-01c: the other screens this person could continue `item` on. Called each time the player's cast menu opens.
   * Absent: the `player` node draws no cast menu. */
  castTargets?(item: Record<string, unknown>): Promise<CastTarget[]>;
  /** HANDOFF-01c: send `item` to one target at `position_s`. Absent: the `player` node draws no cast menu. A rejection
   * is shown under the player with its message. */
  castTo?(targetId: string, item: Record<string, unknown>, position_s: number): Promise<void>;
}

export const MediaHostContext = createContext<MediaHost | null>(null);

export const PLAY_UNAVAILABLE = "Playing is not set up on this screen. Open the item from its app.";
