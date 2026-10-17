// MEDIA-PLAYER-01: Media Chrome's custom elements build their shadow DOM with CSS
// happy-dom cannot parse (`::slotted(...)` rules throw in insertRule), so the
// test run swaps `media-chrome/react` for plain elements that keep the props a
// test reads (slot, aria-label, data-slot, children). The kit's own Player
// logic (gestures, keyboard, progress, resume, Up next, Media Session) works on
// the media element directly and is what the tests exercise; Media Chrome's
// own drawing is checked in a real browser.
import { forwardRef, type ReactNode } from "react";

type StubProps = { children?: ReactNode; slot?: string; "aria-label"?: string; "data-slot"?: string };

function stub(name: string) {
  const Component = forwardRef<HTMLDivElement, StubProps>(function Stub({ children, slot, "aria-label": label, "data-slot": dataSlot }, ref) {
    return (
      <div ref={ref} data-media-chrome={name} slot={slot} aria-label={label} data-slot={dataSlot}>
        {children}
      </div>
    );
  });
  Component.displayName = name;
  return Component;
}

const NAMES = [
  "MediaAirplayButton",
  "MediaCaptionsButton",
  "MediaCastButton",
  "MediaControlBar",
  "MediaController",
  "MediaFullscreenButton",
  "MediaMuteButton",
  "MediaPipButton",
  "MediaPlayButton",
  "MediaSeekBackwardButton",
  "MediaSeekForwardButton",
  "MediaTimeDisplay",
  "MediaTimeRange",
  "MediaVolumeRange",
] as const;

export const mediaChromeStub = Object.fromEntries(NAMES.map((n) => [n, stub(n)]));
