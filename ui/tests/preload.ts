// Registers a real DOM (happy-dom) for `bun test`: bun's default test
// environment has no `document`/`window` at all, which every
// @testing-library/react component test here needs.
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { expect } from "bun:test";
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
