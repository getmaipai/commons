// MEDIA-PARITY-02: playlists gain media_kind, members and cover_file_id additively.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { MediaCollection } from "../../gen/ts/media-collection.js";

const read = (name: string): any => JSON.parse(readFileSync(join(import.meta.dir, "..", "..", "fixtures", "records", name), "utf8"));

describe("playlist record", () => {
  test("a video shared playlist validates with its new fields", () => {
    const parsed = MediaCollection.parse(read("media-collection.playlist-video-shared.example.json"));
    expect(parsed).toMatchObject({ media_kind: "video", members: ["person-nova001", "person-iris001"], cover_file_id: "file-cover01" });
  });
  test("a record without the new fields still validates", () => {
    const old = read("media-collection.playlist-legacy.example.json");
    expect(old.media_kind).toBeUndefined();
    expect(() => MediaCollection.parse(old)).not.toThrow();
    expect(() => MediaCollection.parse(read("media-collection.queue.example.json"))).not.toThrow();
  });
  test("rejects an unknown kind, a bad member and a bad cover id", () => {
    const base = read("media-collection.playlist-legacy.example.json");
    expect(() => MediaCollection.parse({ ...base, media_kind: "photo" })).toThrow();
    expect(() => MediaCollection.parse({ ...base, members: ["nova"] })).toThrow();
    expect(() => MediaCollection.parse({ ...base, members: ["person-nova001", "person-nova001"] })).toThrow();
    expect(() => MediaCollection.parse({ ...base, cover_file_id: "cover" })).toThrow();
  });
});
