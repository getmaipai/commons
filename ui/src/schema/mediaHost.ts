import { createContext } from "react";

// MEDIA-PLAYER-01: the schema `play` action hands a media item to the host. The page never
// plays anything itself: Home's shell (its one audio session, AUDIO-SESSION-01) provides this
// context and decides what playing means (open the Watch page, start the docked bar, refuse an
// item the person may not see). Without a host the action is refused with PLAY_UNAVAILABLE.

export interface MediaHost {
  /** `mediaId` is the action's `media_id` with its `{field}` placeholders filled; `item` is the bound row it fired for. */
  onPlay(mediaId: string, item: Record<string, unknown>): void | Promise<void>;
}

export const MediaHostContext = createContext<MediaHost | null>(null);

export const PLAY_UNAVAILABLE = "Playing is not set up on this screen. Open the item from its app.";
