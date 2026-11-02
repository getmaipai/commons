import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { AnswerBlockView } from "./answer-block";
import { Album } from "./album";
import { Band } from "./band";
import { diffPatch, parseTags } from "./music-edit";
import band from "@maipai/spec/fixtures/answer-block/valid-band.json";
import album from "@maipai/spec/fixtures/answer-block/valid-album.json";
import songStyle from "@maipai/spec/fixtures/answer-block/valid-song_style.json";

afterEach(cleanup);
const withProps = <B extends { props: object }>(block: B, props: object) => ({ ...block, props: { ...block.props, ...props } });
type Call = [string, string, Record<string, unknown> | undefined];

describe("shared edit helpers", () => {
  test("tags: trimmed, no empties, no repeats, at most eight", () => {
    expect(parseTags(" lo-fi , ,dream pop,lo-fi")).toEqual(["lo-fi", "dream pop"]);
    expect(parseTags("a,b,c,d,e,f,g,h,i,j")).toHaveLength(8);
  });
  test("diffPatch keeps only what changed", () => {
    expect(diffPatch({ a: "x", b: ["1"] }, { a: "x", b: ["1", "2"] })).toEqual({ b: ["1", "2"] });
    expect(diffPatch({ a: 1 }, { a: 1 })).toEqual({});
  });
});

describe("Band edit mode", () => {
  test("no Edit button unless editable", () => {
    const { queryByLabelText } = render(<AnswerBlockView block={band} onAction={() => {}} />);
    expect(queryByLabelText("Edit band")).toBeNull();
  });
  test("edits name, about, look, sound and tags and reports only the changes as edit_band", () => {
    const calls: Call[] = [];
    const block = withProps(band, { editable: true, look: "a lighthouse", sound: "hazy lo-fi" });
    const { getByLabelText, getByText } = render(<AnswerBlockView block={block} onAction={(...args) => calls.push(args as Call)} />);
    fireEvent.click(getByLabelText("Edit band"));
    expect((getByText("Save") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(getByLabelText("Band name"), { target: { value: "Lantern Hollow II" } });
    fireEvent.change(getByLabelText("Style tags"), { target: { value: "lo-fi, shoegaze" } });
    fireEvent.change(getByLabelText("Sound"), { target: { value: "wall of reverb" } });
    fireEvent.click(getByText("Save"));
    expect(calls).toEqual([[block.id, "edit_band", { name: "Lantern Hollow II", sound: "wall of reverb", genres: ["lo-fi", "shoegaze"] }]]);
    expect(getByLabelText("Edit band")).toBeTruthy();
  });
  test("New band picture and New logo report the existing remake actions; Cancel reports nothing", () => {
    const calls: Call[] = [];
    const { getByLabelText, getByText } = render(<AnswerBlockView block={withProps(band, { editable: true })} onAction={(...args) => calls.push(args as Call)} />);
    fireEvent.click(getByLabelText("Edit band"));
    fireEvent.click(getByText("New band picture"));
    fireEvent.click(getByText("New logo"));
    fireEvent.change(getByLabelText("Band name"), { target: { value: "x" } });
    fireEvent.click(getByText("Cancel"));
    expect(calls.map((c) => c[1])).toEqual(["remake_portrait", "remake_logo"]);
  });
  test("defaultEditing opens in edit mode", () => {
    const { container } = render(<Band name="Cedar Quill" actions={[]} editable defaultEditing />);
    expect(container.querySelector('[data-mode="edit"]')).not.toBeNull();
  });
});

describe("Album", () => {
  test("shows cover, title, band, numbered tracks with times, and plays a track by media id", () => {
    const calls: Call[] = [];
    const { container, getByText, getByLabelText } = render(<AnswerBlockView block={album} resolveImageSrc={(s) => `/img/${s}`} onAction={(...args) => calls.push(args as Call)} />);
    expect(container.querySelector('[data-slot="album"]')).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/img/hubimg-7d5e2f34");
    expect(getByText("Salt on the Glass", { selector: "h3" })).toBeTruthy();
    expect(getByText(/^Lantern Hollow/)).toBeTruthy();
    expect(getByText("2:32")).toBeTruthy();
    fireEvent.click(getByLabelText("Play Lamp Oil"));
    fireEvent.click(getByLabelText("Play album"));
    fireEvent.click(getByText("remake cover"));
    expect(calls.map((c) => c.slice(1))).toEqual([["play_track", { media_id: "media-tr4ck002" }], ["play_all", undefined], ["remake_cover", undefined]]);
  });
  test("is read-only without a handler", () => {
    const { getByLabelText } = render(<AnswerBlockView block={album} />);
    expect((getByLabelText("Play Lamp Oil") as HTMLButtonElement).disabled).toBe(true);
  });
  test("edit mode reorders and removes tracks and reports edit_album with track_ids only for what changed", () => {
    const calls: Call[] = [];
    const block = withProps(album, { editable: true });
    const { getByLabelText, getByText } = render(<AnswerBlockView block={block} onAction={(...args) => calls.push(args as Call)} />);
    fireEvent.click(getByLabelText("Edit album"));
    fireEvent.click(getByLabelText("Move Low Tide Letters up"));
    fireEvent.click(getByLabelText("Remove Salt on the Glass from the album"));
    fireEvent.change(getByLabelText("About the album"), { target: { value: "Three songs." } });
    fireEvent.click(getByText("Save"));
    expect(calls).toEqual([[block.id, "edit_album", { blurb: "Three songs.", track_ids: ["media-tr4ck003", "media-tr4ck002"] }]]);
  });
  test("edit mode: first track cannot move up, last cannot move down, New cover reports remake_cover", () => {
    const calls: Call[] = [];
    const { getByLabelText, getByText } = render(<AnswerBlockView block={withProps(album, { editable: true })} onAction={(...args) => calls.push(args as Call)} />);
    fireEvent.click(getByLabelText("Edit album"));
    expect((getByLabelText("Move Salt on the Glass up") as HTMLButtonElement).disabled).toBe(true);
    expect((getByLabelText("Move Low Tide Letters down") as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(getByText("New cover"));
    expect(calls.map((c) => c[1])).toEqual(["remake_cover"]);
  });
  test("an album with no cover and no tracks still draws", () => {
    const { container } = render(<Album title="Empty" actions={[]} />);
    expect(container.querySelector('[data-slot="album"]')).not.toBeNull();
  });
});

describe("SongStyleCard", () => {
  test("shows the style words, tags and knobs, and reports its actions", () => {
    const calls: Call[] = [];
    const { container, getByText } = render(<AnswerBlockView block={songStyle} onAction={(...args) => calls.push(args as Call)} />);
    expect(container.querySelector('[data-slot="song-style"]')).not.toBeNull();
    expect(getByText("slow felt piano, soft rain, warm and sleepy")).toBeTruthy();
    expect(getByText("Instrumental · 64 bpm · A minor · 2:00")).toBeTruthy();
    fireEvent.click(getByText("make song"));
    expect(calls.map((c) => c.slice(1))).toEqual([["make_song", undefined]]);
  });
  test("edit mode reports edit_song_style with only the changed fields, empty numbers as null", () => {
    const calls: Call[] = [];
    const block = withProps(songStyle, { editable: true });
    const { getByLabelText, getByText } = render(<AnswerBlockView block={block} onAction={(...args) => calls.push(args as Call)} />);
    fireEvent.click(getByLabelText("Edit style"));
    fireEvent.change(getByLabelText("Style name"), { target: { value: "Stormy piano" } });
    fireEvent.change(getByLabelText("Tempo (bpm)"), { target: { value: "" } });
    fireEvent.click(getByLabelText("Instrumental, no singing"));
    fireEvent.click(getByText("Save"));
    expect(calls).toEqual([[block.id, "edit_song_style", { title: "Stormy piano", instrumental: false, bpm: null }]]);
  });
  test("Save stays off with empty words", () => {
    const { getByLabelText, getByText } = render(<AnswerBlockView block={withProps(songStyle, { editable: true })} onAction={() => {}} />);
    fireEvent.click(getByLabelText("Edit style"));
    fireEvent.change(getByLabelText("Sound"), { target: { value: " " } });
    expect((getByText("Save") as HTMLButtonElement).disabled).toBe(true);
  });
});
