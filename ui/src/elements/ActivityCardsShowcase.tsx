"use client";

// ELT-T1-K06 story: calm, readable activity cards for the area above a chat composer.
import { BackgroundInbox } from "./background-inbox";
import { TaskCard } from "./task-card";

export function ActivityCardsShowcase() {
  return (
    <>
      <TaskCard
        label="Waiting for a parent to approve this action"
        state="waiting"
        size="comfortable"
        calm
        result="The request is saved."
      />
      <BackgroundInbox
        size="comfortable"
        calm
        runs={[
          {
            id: "calendar-summary",
            title: "Summarizing the family calendar",
            state: "running",
            elapsed: "2 min",
            summary: "Three events found",
          },
          {
            id: "weekly-summary",
            title: "Weekly summary is ready",
            state: "ready",
            elapsed: "just now",
            summary: "4 updates",
          },
        ]}
      />
    </>
  );
}
