import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { VoiceLineRow } from "./voice-line-row";

afterEach(cleanup);
const noop = () => {};
const AVATAR = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";

describe("VoiceLineRow", () => {
  test("shows the speaker, the words and which reading this is", () => {
    const v = render(<VoiceLineRow speaker={{ name: "Juniper", avatar: AVATAR }} text="We should get going." reading={{ index: 1, count: 2 }} onPlay={noop} />);
    expect(v.getByText("Juniper")).toBeTruthy();
    expect(v.getByText("We should get going.")).toBeTruthy();
    expect(v.getByText("Reading 1 of 2")).toBeTruthy();
  });
  test("the play button toggles its name with playing and fires onPlay", () => {
    let n = 0;
    const v = render(<VoiceLineRow speaker={{ name: "Atlas" }} text="Hi." onPlay={() => n++} />);
    fireEvent.click(v.getByRole("button", { name: "Play Atlas" }));
    expect(n).toBe(1);
    v.rerender(<VoiceLineRow speaker={{ name: "Atlas" }} text="Hi." onPlay={() => n++} playing />);
    expect(v.getByRole("button", { name: "Pause Atlas" })).toBeTruthy();
    expect(v.container.querySelector("[data-playing]")).toBeTruthy();
  });
  test("the reading actions fire when there are two readings", () => {
    const hits: string[] = [];
    const v = render(<VoiceLineRow speaker={{ name: "Willow" }} text="Hi." reading={{ index: 1, count: 2 }} onSayDifferently={() => hits.push("say")} onUseOtherReading={() => hits.push("other")} />);
    fireEvent.click(v.getByRole("button", { name: "Say it differently" }));
    fireEvent.click(v.getByRole("button", { name: "Use the other reading" }));
    expect(hits).toEqual(["say", "other"]);
    expect(v.queryByText(/only one reading/)).toBeNull();
  });
  test("with one reading, the other-reading button is disabled and the reason is visible text", () => {
    let n = 0;
    const v = render(<VoiceLineRow speaker={{ name: "Sage" }} text="Hi." reading={{ index: 1, count: 1 }} onSayDifferently={noop} onUseOtherReading={() => n++} />);
    const b = v.getByRole("button", { name: "Use the other reading" }) as HTMLButtonElement;
    expect(b.disabled).toBe(true);
    fireEvent.click(b);
    expect(n).toBe(0);
    const reason = v.getByText(/There is only one reading so far/);
    expect(b.getAttribute("aria-describedby")).toBe(reason.id);
    expect((v.getByRole("button", { name: "Say it differently" }) as HTMLButtonElement).disabled).toBe(false);
  });
  test("making shows its words and disables both reading actions", () => {
    const v = render(<VoiceLineRow speaker={{ name: "Willow" }} text="Hi." status="making" reading={{ index: 1, count: 2 }} onSayDifferently={noop} onUseOtherReading={noop} onPlay={noop} />);
    expect(v.getByRole("status").textContent).toContain("Making a new reading");
    expect(v.container.querySelector("[data-slot=skeleton]")).toBeTruthy();
    expect((v.getByRole("button", { name: "Say it differently" }) as HTMLButtonElement).disabled).toBe(true);
    expect((v.getByRole("button", { name: "Use the other reading" }) as HTMLButtonElement).disabled).toBe(true);
    expect((v.getByRole("button", { name: "Play Willow" }) as HTMLButtonElement).disabled).toBe(false);
  });
  test("draws one bar per wave value, hidden from assistive tech", () => {
    const v = render(<VoiceLineRow speaker={{ name: "Atlas" }} text="Hi." wave={[0.2, 0.9, 0.5]} />);
    const wave = v.container.querySelector("[data-slot=voice-line-wave]")!;
    expect(wave.getAttribute("aria-hidden")).toBe("true");
    expect(wave.children.length).toBe(3);
    cleanup();
    expect(render(<VoiceLineRow speaker={{ name: "Atlas" }} text="Hi." />).container.querySelector("[data-slot=voice-line-wave]")).toBeNull();
  });
  test("an error line is announced", () => {
    const v = render(<VoiceLineRow speaker={{ name: "Sage" }} text="Hi." errorMessage="MaiPai could not make a new reading. Press Say it differently to try again." />);
    expect(v.getByRole("alert").textContent).toContain("Press Say it differently");
  });
  test("labels are overridable", () => {
    const v = render(<VoiceLineRow speaker={{ name: "Atlas" }} text="Hi." onPlay={noop} labels={{ play: "Listen" }} />);
    expect(v.getByRole("button", { name: "Listen" })).toBeTruthy();
  });
});
