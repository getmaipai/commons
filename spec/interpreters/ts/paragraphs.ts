// GENUI-13a: the one definition of a paragraph in released reply text, shared by the hub (which places a ready block
// or picture set at a paragraph boundary and stamps `after_paragraph`) and every client (which splits the stored text
// at the same boundary). The Python twin is interpreters/py/paragraphs.py; both read fixtures/paragraphs/cases.json.
//
// A paragraph break is a blank line (a line holding only spaces or tabs) and the whitespace after it. A blank line
// inside an open ``` code fence is not a break: a block or picture set is never placed inside a code block, and the
// fence's own blank lines never count as paragraphs. A paragraph is a piece of text between breaks that is not blank.

const BREAK = /\n[ \t]*\n\s*/g;

/** True when `text` ends inside an open ``` code fence (an odd number of fence markers so far). */
export function insideCodeFence(text: string): boolean {
  return (text.match(/```/g) ?? []).length % 2 === 1;
}

/** The paragraph breaks in `text` that count: [start, end) of each, those inside a code fence left out. */
function breaks(text: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const m of text.matchAll(BREAK)) {
    const start = m.index ?? 0;
    if (insideCodeFence(text.slice(0, start))) continue;
    out.push([start, start + m[0].length]);
  }
  return out;
}

/** How many paragraphs `text` holds (blank pieces do not count). */
export function paragraphCount(text: string): number {
  let seen = 0;
  let from = 0;
  for (const [start, end] of breaks(text)) {
    if (text.slice(from, start).trim().length > 0) seen += 1;
    from = end;
  }
  if (text.slice(from).trim().length > 0) seen += 1;
  return seen;
}

/** Splits `text` after its `n`th paragraph break: `[before, after]` with `before + after === text`. `n <= 0` puts
 * everything after (before any text); a count past the last break puts everything before (after the whole reply). */
export function splitAfterParagraph(text: string, n: number): [string, string] {
  if (n <= 0) return ["", text];
  let seen = 0;
  let from = 0;
  for (const [start, end] of breaks(text)) {
    if (text.slice(from, start).trim().length > 0) seen += 1;
    from = end;
    if (seen >= n) return [text.slice(0, end), text.slice(end)];
  }
  return [text, ""];
}

/** For a placer that is fed released text in pieces: given everything released so far and the next piece, the offset
 * in `piece` just after its first paragraph break that is not inside a code fence, or -1 when there is none. */
export function paragraphCut(released: string, piece: string): number {
  for (const m of piece.matchAll(BREAK)) {
    const start = m.index ?? 0;
    if (insideCodeFence(released + piece.slice(0, start))) continue;
    return start + m[0].length;
  }
  return -1;
}

/** True when `released` is empty or ends at a paragraph break outside a code fence: a block that became ready now
 * can be placed at this point without splitting anything. */
export function atParagraphBoundary(released: string): boolean {
  if (released.trim().length === 0) return true;
  return /\n[ \t]*\n\s*$/.test(released) && !insideCodeFence(released);
}
