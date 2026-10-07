import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { BackgroundInbox } from "./background-inbox";
import { TaskCard } from "./task-card";

afterEach(cleanup);

const runs = [
  {
    id: "summarize",
    title: "Summarizing the family schedule",
    state: "running" as const,
    elapsed: "2 min",
    summary: "Calendar notes",
  },
];

describe("TaskCard and BackgroundInbox calm and size props", () => {
  test("defaults keep current text sizes and running animations with reduced-motion support", () => {
    const { container, getByText } = render(
      <>
        <TaskCard label="Preparing a reply" state="working" result="Reply ready" />
        <BackgroundInbox runs={runs} />
      </>,
    );

    const taskSpinner = container.querySelector('[data-slot="task-card"] .animate-spin');
    const inboxSpinner = container.querySelector('[data-slot="background-inbox"] .animate-spin');
    expect(taskSpinner).not.toBeNull();
    expect(taskSpinner?.classList.contains("motion-reduce:animate-none")).toBe(true);
    expect(inboxSpinner).not.toBeNull();
    expect(inboxSpinner?.classList.contains("motion-reduce:animate-none")).toBe(true);
    expect(getByText("Preparing a reply").classList.contains("text-[13.5px]")).toBe(true);
    expect(getByText("Reply ready").classList.contains("text-xs")).toBe(true);
    expect(getByText("Running elsewhere").classList.contains("text-[13.5px]")).toBe(true);
    expect(getByText("Summarizing the family schedule").classList.contains("text-[13px]")).toBe(true);
  });

  test("calm stops both spinners and comfortable uses the 16px text token", () => {
    const { container, getAllByText, getByText } = render(
      <>
        <TaskCard
          label="Preparing a reply"
          state="working"
          calm
          size="comfortable"
          meta="Today"
          elapsed="2 min"
          open
          result="Reply ready"
        >
          <p>Transcript details</p>
        </TaskCard>
        <BackgroundInbox runs={runs} calm size="comfortable" />
      </>,
    );

    expect(container.querySelector('[data-slot="task-card"] .animate-spin')).toBeNull();
    expect(container.querySelector('[data-slot="background-inbox"] .animate-spin')).toBeNull();
    for (const text of [
      "Preparing a reply",
      "Today",
      "Reply ready",
      "Running elsewhere",
      "1 in flight",
      "Summarizing the family schedule",
      "Calendar notes",
    ]) {
      expect(getByText(text).classList.contains("text-base")).toBe(true);
    }
    expect(getAllByText("2 min")).toHaveLength(2);
    for (const text of getAllByText("2 min")) {
      expect(text.classList.contains("text-base")).toBe(true);
    }
    expect(container.querySelector('[data-slot="task-card-transcript"]')?.classList.contains("text-base")).toBe(true);
  });
});
