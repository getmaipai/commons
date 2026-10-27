import { afterEach, expect, test } from "bun:test";
import { cleanup, render } from "@testing-library/react";
import { ChatHeader } from "./chat-header";
import { CompanionCard } from "./companion-card";
import { CompanionProfileHeader } from "./companion-profile-header";
import { CharacterHero } from "./character-hero";

afterEach(cleanup);

// A companion's picture or clip is transparent: no element draws a fill behind the media slot.
const mediaNode = <span data-testid="media">m</span>;
function fillBehind(node: HTMLElement): string[] {
  const found: string[] = [];
  for (let el: HTMLElement | null = node.parentElement; el && !el.matches("header, article, section, [data-slot]"); el = el.parentElement) {
    if (/\bbg-(muted|secondary|card|background|primary)\b/.test(el.className)) found.push(el.className);
  }
  return found;
}

test("no fill sits behind the companion media in the kit's companion pieces", () => {
  const header = render(<ChatHeader name="Rivet" media={mediaNode} />);
  expect(fillBehind(header.getByTestId("media"))).toEqual([]);
  cleanup();
  const card = render(<CompanionCard name="Rivet" line="Hi" media={mediaNode} status="Ready" actions={<span />} />);
  expect(fillBehind(card.getByTestId("media"))).toEqual([]);
  cleanup();
  const profile = render(<CompanionProfileHeader name="Rivet" line="Hi" media={mediaNode} />);
  expect(fillBehind(profile.getByTestId("media"))).toEqual([]);
  cleanup();
  const hero = render(<CharacterHero name="Rivet" line="Hi" media={mediaNode} />);
  expect(fillBehind(hero.getByTestId("media"))).toEqual([]);
});
