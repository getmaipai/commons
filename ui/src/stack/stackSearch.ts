// STACK-MODELS-PAGE-01. The page's one search box. A model matches when every word typed is found in the text the Stack sends with it
// (`search_text`: name, id, repo, family, version, precision in plain words and as the catalog writes it, licence, summary, engine, role)
// or in its feature's name. Case, hyphens, underscores and slashes do not matter ("4 bit" finds "4-bit", "q4 k m" finds "Q4_K_M"); a dot
// stays, so "3.8" finds version 3.8 and not 3 or 8.
import type { StackCandidate, StackChoiceCategory } from "./StackClient";

/** Lowercase, with separators turned into spaces and runs of spaces folded. */
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[-_/:,;()[\]"']+/g, " ").replace(/\s+/g, " ").trim();
}

/** The searchable text of a model: the Stack's `search_text`, or the same fields joined when an older Stack did not send it. */
export function searchTextOf(candidate: StackCandidate): string {
  if (candidate.search_text) return normalize(candidate.search_text);
  return normalize([candidate.label, candidate.id, candidate.repo, candidate.family, candidate.version, candidate.quantization, candidate.quantization_raw, candidate.license, candidate.summary, candidate.engine, candidate.role].filter(Boolean).join(" "));
}

export function queryWords(query: string): string[] {
  return normalize(query).split(" ").filter(Boolean);
}

export interface SearchHit { category: StackChoiceCategory; candidate: StackCandidate }

/** Every model (any feature) that matches all the words in `query`, in the page's own order. An empty query matches nothing. */
export function searchModels(categories: readonly StackChoiceCategory[], query: string): SearchHit[] {
  const words = queryWords(query);
  if (words.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const category of categories) {
    const feature = normalize(`${category.label} ${category.id}`);
    for (const candidate of category.candidates) {
      const text = `${searchTextOf(candidate)} ${feature}`;
      if (words.every((word) => text.includes(word))) hits.push({ category, candidate });
    }
  }
  return hits;
}
