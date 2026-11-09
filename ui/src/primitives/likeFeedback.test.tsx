import { afterEach, describe, expect, mock, test } from "bun:test";
import { act, cleanup, render } from "@testing-library/react";
import { LIKE_POP_CLASS, likeHaptic } from "@/kit/primitives/likeFeedback";
import { VideoPlayer } from "@/kit/elements/video-player";

afterEach(cleanup);

describe("like feedback", () => {
  test("likeHaptic buzzes for 10 ms and never throws", () => {
    const original = navigator.vibrate;
    const vibrate = mock(() => true);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    likeHaptic();
    expect(vibrate).toHaveBeenCalledWith(10);
    Object.defineProperty(navigator, "vibrate", { value: () => { throw new Error("no"); }, configurable: true });
    expect(() => likeHaptic()).not.toThrow();
    Object.defineProperty(navigator, "vibrate", { value: undefined, configurable: true });
    expect(() => likeHaptic()).not.toThrow();
    Object.defineProperty(navigator, "vibrate", { value: original, configurable: true });
  });

  test("the pop class is motion-safe only", () => {
    expect(LIKE_POP_CLASS).toContain("motion-safe:");
  });

  test("the Favorite toggle pops when it turns on and buzzes on the click", () => {
    const vibrate = mock(() => true);
    Object.defineProperty(navigator, "vibrate", { value: vibrate, configurable: true });
    const view = render(<VideoPlayer status="ready" src="/a.mp4" prompt="Clip" favorite={false} onFavorite={() => {}} />);
    const button = view.container.querySelector("[data-slot=video-player-favorite]") as HTMLButtonElement;
    expect(button.querySelector("svg")!.getAttribute("class") ?? "").not.toContain("like-pop");
    act(() => { button.click(); });
    expect(vibrate).toHaveBeenCalledWith(10);
    view.rerender(<VideoPlayer status="ready" src="/a.mp4" prompt="Clip" favorite onFavorite={() => {}} />);
    expect(view.container.querySelector("[data-slot=video-player-favorite] svg")!.getAttribute("class")).toContain("like-pop");
  });
});
