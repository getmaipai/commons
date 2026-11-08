// Registers a real DOM (happy-dom) for `bun test`: bun's default test
// environment has no `document`/`window` at all, which every
// @testing-library/react component test here needs.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach, expect, jest } from "bun:test";
import * as matchers from "@testing-library/jest-dom/matchers";

// happy-dom's own ReadableStream/WritableStream/TransformStream are
// incomplete - captured before registration and restored right after so
// every test in the suite keeps Bun's own native implementations.
const nativeStreams = {
  ReadableStream: globalThis.ReadableStream,
  WritableStream: globalThis.WritableStream,
  TransformStream: globalThis.TransformStream,
};

GlobalRegistrator.register();
Object.assign(globalThis, nativeStreams);

expect.extend(matchers);

// MEDIA-PLAYER-01: see tests/mediaChromeStub.tsx for why Media Chrome is stubbed under happy-dom.
import { mock } from "bun:test";
import { mediaChromeStub } from "./mediaChromeStub";
mock.module("media-chrome/react", () => mediaChromeStub);

// The full gate runs beside other sessions' work; at load averages near 40 the 1 s default let
// "an empty shelf ... hide_when_empty", "Citation on a touch screen" and "composer-attachments" time out
// while passing alone. 4 s stays under bun's 5 s per-test timeout.
import { configure } from "@testing-library/dom";
configure({ asyncUtilTimeout: 4000 });

// Fake timers are process-wide in bun, and a batch runs many files in one process. A file that ends with jest.useFakeTimers()
// still on (weather-sky.test.tsx did) makes the next file's first await never settle: the gate batch hung at 0% CPU with no
// output (weather-sky then http.test.ts, or weather-scene-running then i18n.test.tsx). Restoring real timers after every test
// makes that impossible for any file, present or future.
afterEach(() => {
  jest.useRealTimers();
});
