import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { ImageGeneration } from "./image-generation";
import { MusicTrack } from "./music-track";
import { VideoPlayer } from "./video-player";

afterEach(() => act(() => cleanup()));

function actions(log: string[]) {
  return [
    { label: "Make it now at the lower level", onSelect: () => log.push("allow"), variant: "default" as const },
    { label: "Wait for room", onSelect: () => log.push("wait") },
  ];
}

describe("pendingActions on the generation elements", () => {
  test("VideoPlayer draws the answers only while queued, and each calls its handler", () => {
    const log: string[] = [];
    const view = render(<VideoPlayer status="queued" prompt="x" pendingActions={actions(log)} />);
    fireEvent.click(view.getByRole("button", { name: "Make it now at the lower level" }));
    fireEvent.click(view.getByRole("button", { name: "Wait for room" }));
    expect(log).toEqual(["allow", "wait"]);
    view.rerender(<VideoPlayer status="generating" prompt="x" pendingActions={actions(log)} />);
    expect(view.queryByRole("button", { name: "Wait for room" })).toBeNull();
  });

  test("MusicTrack draws the answers only while queued", () => {
    const log: string[] = [];
    const view = render(<MusicTrack status="queued" title="Song" pendingActions={actions(log)} />);
    fireEvent.click(view.getByRole("button", { name: "Wait for room" }));
    expect(log).toEqual(["wait"]);
    view.rerender(<MusicTrack status="ready" title="Song" pendingActions={actions(log)} />);
    expect(view.queryByRole("button", { name: "Wait for room" })).toBeNull();
  });

  test("ImageGeneration draws the answers while generating and not once done", () => {
    const log: string[] = [];
    const view = render(<ImageGeneration prompt="A garden" generating statusLabel="Waiting its turn" pendingActions={actions(log)} />);
    fireEvent.click(view.getByRole("button", { name: "Make it now at the lower level" }));
    expect(log).toEqual(["allow"]);
    view.rerender(<ImageGeneration prompt="A garden" generating={false} pendingActions={actions(log)} />);
    expect(view.queryByRole("button", { name: "Wait for room" })).toBeNull();
  });

  test("no actions draws no row", () => {
    const view = render(<VideoPlayer status="queued" prompt="x" />);
    expect(view.container.querySelector("[data-slot=pending-actions]")).toBeNull();
  });
});
