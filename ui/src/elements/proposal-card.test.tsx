import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { ProposalCard, type ProposalPicture } from "./proposal-card";

afterEach(cleanup);

const GIF = "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
const PICTURES: ProposalPicture[] = [
  { id: "a", src: GIF, alt: "Juniper facing front", badge: "from_photo", caption: "Front" },
  { id: "b", src: GIF, alt: "Juniper from behind", badge: "guessed" },
  { id: "c", src: GIF, alt: "Juniper walking" },
];
const noop = () => {};

describe("ProposalCard", () => {
  test("shows the title, pictures with badge words and the default action labels", () => {
    const v = render(<ProposalCard title="Juniper" description="A green raincoat." pictures={PICTURES} note="A match does not prove who is in the photo." approve={{ onSelect: noop }} change={{ onSelect: noop }} discard={{ onSelect: noop }} />);
    expect(v.getByRole("heading", { name: "Juniper" })).toBeTruthy();
    expect(v.getByText("Matches your photo")).toBeTruthy();
    expect(v.getByText("Guessed by MaiPai")).toBeTruthy();
    expect(v.getByText("Front")).toBeTruthy();
    expect(v.getAllByRole("listitem").length).toBe(3);
    expect(v.getByText("A match does not prove who is in the photo.")).toBeTruthy();
    for (const name of ["Save this look", "Try another guess", "Discard"]) expect(v.getByRole("button", { name })).toBeTruthy();
  });
  test("labels are overridable", () => {
    const v = render(<ProposalCard title="Atlas" description="x" pictures={PICTURES} labels={{ fromPhoto: "From your photo" }} approve={{ label: "Use this look", onSelect: noop }} />);
    expect(v.getByText("From your photo")).toBeTruthy();
    expect(v.getByRole("button", { name: "Use this look" })).toBeTruthy();
  });
  test("the actions fire", () => {
    const hits: string[] = [];
    const v = render(<ProposalCard title="Atlas" description="x" pictures={PICTURES} approve={{ onSelect: () => hits.push("a") }} change={{ onSelect: () => hits.push("c") }} discard={{ onSelect: () => hits.push("d") }} />);
    fireEvent.click(v.getByRole("button", { name: "Save this look" }));
    fireEvent.click(v.getByRole("button", { name: "Try another guess" }));
    fireEvent.click(v.getByRole("button", { name: "Discard" }));
    expect(hits).toEqual(["a", "c", "d"]);
  });
  test("the description stays text until Edit is pressed, then edits and closes", () => {
    const seen: string[] = [];
    function Host() {
      const [text, setText] = useState("A green raincoat.");
      return <ProposalCard title="Juniper" description={text} onDescriptionChange={(value) => { seen.push(value); setText(value); }} pictures={PICTURES} />;
    }
    const v = render(<Host />);
    expect(v.container.querySelector("textarea")).toBeNull();
    fireEvent.click(v.getByRole("button", { name: "Edit description" }));
    const box = v.getByRole("textbox", { name: "Description" }) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: "A red raincoat." } });
    expect(seen).toEqual(["A red raincoat."]);
    fireEvent.click(v.getByRole("button", { name: "Done" }));
    expect(v.container.querySelector("textarea")).toBeNull();
    expect(v.getByText("A red raincoat.")).toBeTruthy();
  });
  test("without onDescriptionChange there is no Edit button", () => {
    const v = render(<ProposalCard title="Juniper" description="x" pictures={PICTURES} />);
    expect(v.queryByRole("button", { name: "Edit description" })).toBeNull();
  });
  test("making shows placeholders and its words, and locks every action", () => {
    let n = 0;
    const v = render(<ProposalCard title="Willow" description="x" pictures={PICTURES} status="making" onDescriptionChange={noop} approve={{ onSelect: () => n++ }} change={{ onSelect: () => n++ }} discard={{ onSelect: () => n++ }} />);
    expect(v.getByRole("status").textContent).toContain("Making the pictures");
    expect(v.container.querySelectorAll("[data-slot=skeleton]").length).toBe(3);
    expect(v.container.querySelector("img")).toBeNull();
    for (const name of ["Save this look", "Try another guess", "Discard", "Edit description"]) {
      const b = v.getByRole("button", { name }) as HTMLButtonElement;
      expect(b.disabled).toBe(true);
      fireEvent.click(b);
    }
    expect(n).toBe(0);
  });
  test("saving shows Saving on the approve button and blocks the rest", () => {
    const v = render(<ProposalCard title="Sage" description="x" pictures={PICTURES} status="saving" approve={{ onSelect: noop }} change={{ onSelect: noop }} />);
    const save = v.getByRole("button", { name: "Saving" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save.getAttribute("aria-busy")).toBe("true");
    expect((v.getByRole("button", { name: "Try another guess" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("a busy or disabled action cannot be pressed", () => {
    let n = 0;
    const v = render(<ProposalCard title="Atlas" description="x" pictures={PICTURES} approve={{ onSelect: () => n++, disabled: true }} change={{ onSelect: () => n++, busy: true }} />);
    const approve = v.getByRole("button", { name: "Save this look" }) as HTMLButtonElement;
    const change = v.getByRole("button", { name: "Try another guess" }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(change.disabled).toBe(true);
    expect(change.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(approve);
    fireEvent.click(change);
    expect(n).toBe(0);
  });
  test("with no pictures the save button is unavailable", () => {
    const v = render(<ProposalCard title="Atlas" description="x" pictures={[]} approve={{ onSelect: noop }} />);
    expect((v.getByRole("button", { name: "Save this look" }) as HTMLButtonElement).disabled).toBe(true);
  });
  test("an error line is announced", () => {
    const v = render(<ProposalCard title="Atlas" description="x" pictures={[]} errorMessage="MaiPai could not make the pictures. Press Try another guess to try again." />);
    expect(v.getByRole("alert").textContent).toContain("Press Try another guess");
  });
});
