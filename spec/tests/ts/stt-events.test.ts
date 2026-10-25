// DUPLEX-01: the `stt` socket's full-duplex additions are plain, additive JSON shapes. The test
// pins their wire spelling so a rename on either side fails here first.
import { describe, expect, test } from "bun:test";
import type { SttClientMessage, SttWireEvent } from "../../voice/ts/sttTypes.js";

describe("stt full-duplex wire shapes", () => {
  test("the server's pause and resume events carry only their type", () => {
    const pause: SttWireEvent = { t: "reply_pause" };
    const resume: SttWireEvent = { t: "reply_resume" };
    expect(JSON.stringify(pause)).toBe('{"t":"reply_pause"}');
    expect(JSON.stringify(resume)).toBe('{"t":"reply_resume"}');
  });

  test("the client's played_ms names the reply and the milliseconds heard", () => {
    const played: SttClientMessage = { t: "played_ms", reply_id: "reply-1", ms: 1240 };
    expect(JSON.parse(JSON.stringify(played))).toEqual({ t: "played_ms", reply_id: "reply-1", ms: 1240 });
    const end: SttClientMessage = { t: "end" };
    expect(end.t).toBe("end");
  });

  test("the existing events are unchanged", () => {
    const events: SttWireEvent[] = [{ t: "ready" }, { t: "vad", speaking: true, rms: 0.1 }, { t: "partial", v: "hi" }, { t: "no_speech" }];
    expect(events.map((event) => event.t)).toEqual(["ready", "vad", "partial", "no_speech"]);
  });
});
