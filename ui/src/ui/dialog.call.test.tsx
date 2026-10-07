import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { Dialog, DialogContent } from "./dialog";

afterEach(cleanup);

test("call dialog fills the phone viewport and centers the kit voice card at desktop", () => {
  render(
    <Dialog open>
      <DialogContent variant="call" showCloseButton={false}>
        <div data-slot="voice-conversation" />
      </DialogContent>
    </Dialog>,
  );
  const content = document.body.querySelector<HTMLElement>("[data-slot='dialog-content']");
  expect(content).not.toBeNull();
  expect(content?.className).toContain("h-dvh");
  expect(content?.className).toContain("w-screen");
  expect(content?.className).toContain("max-w-none");
  expect(content?.className).toContain("sm:h-auto");
  expect(content?.className).toContain("sm:max-w-xs");
  expect(content?.querySelector("[data-slot='voice-conversation']")).not.toBeNull();
});
