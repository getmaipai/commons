import { createContext } from "react";

/** What the host reports while it reads a story aloud: which story, whether the voice is still starting, and how far through the body
 * (0 to 1) it has spoken. The reader marks the Listen button and lights the words as they are spoken (karaoke style). Kept apart from
 * the reader so the shell can provide it without loading the reader. */
export interface ArticleSpeech { storyId: string | null; phase: "loading" | "playing" | "paused" | null; progress: number }
export const ArticleSpeechContext = createContext<ArticleSpeech>({ storyId: null, phase: null, progress: 0 });
