// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/source.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One citation on an assistant reply: the evidence ladder CHAT-16 phrases factual answers from (media-conversation-program-2026-09-13.md step 4 - a typed source, then websearch, then model knowledge), numbered and rendered as `[N]` markers in the reply text (docs/BACKLOG.md's 'Inline citation markers on sourced answers', the Perplexity-shaped pattern legacy already validated once). Lives on the assistant turn (backend/src/wire.ts's TurnValue, additive when CHAT-16 lands - home is the whole record, no separate hub/robot split for this one), never independently synced or merged, which is why it carries the shared envelope (source, hlc, created_at) but no updated_at: a citation is a snapshot of what was true when the reply was generated, not an editable record.*/
export const Source = z
  .object({
    id: z.string().regex(new RegExp("^src-[a-z0-9]{6,}$")),
    /**Which evidence tier produced this citation. reference is an offline library, shelf is a news item or story, web is SearXNG, archive is an archived page, hosted is an optional hosted search provider, and wikimedia is the live Wikimedia API; existing typed kinds remain supported.*/
    kind: z
      .enum([
        "web",
        "wikidata",
        "wikipedia",
        "weather",
        "package",
        "archive",
        "reference",
        "shelf",
        "hosted",
        "wikimedia",
      ])
      .describe(
        "Which evidence tier produced this citation. reference is an offline library, shelf is a news item or story, web is SearXNG, archive is an archived page, hosted is an optional hosted search provider, and wikimedia is the live Wikimedia API; existing typed kinds remain supported.",
      ),
    /**The cited page or result's own title, exactly as the source gave it, never rewritten by the model.*/
    title: z
      .string()
      .min(1)
      .describe(
        "The cited page or result's own title, exactly as the source gave it, never rewritten by the model.",
      ),
    /**Opened directly by the citation chip, rel="noopener noreferrer" and referrerpolicy="no-referrer" on the client (the privacy page's promise: a cited site learns nothing from the click but the click).*/
    url: z
      .string()
      .url()
      .describe(
        'Opened directly by the citation chip, rel="noopener noreferrer" and referrerpolicy="no-referrer" on the client (the privacy page\'s promise: a cited site learns nothing from the click but the click).',
      ),
    /**The hostname a citation chip shows (e.g. "wikipedia.org"), so a household member sees where an answer came from without hovering the link.*/
    site: z
      .string()
      .min(1)
      .describe(
        'The hostname a citation chip shows (e.g. "wikipedia.org"), so a household member sees where an answer came from without hovering the link.',
      ),
    /**The short passage the evidence was drawn from, when the source has one worth showing; null for a source that is just a link (e.g. a typed weather lookup).*/
    snippet: z
      .union([
        z
          .string()
          .describe(
            "The short passage the evidence was drawn from, when the source has one worth showing; null for a source that is just a link (e.g. a typed weather lookup).",
          ),
        z
          .null()
          .describe(
            "The short passage the evidence was drawn from, when the source has one worth showing; null for a source that is just a link (e.g. a typed weather lookup).",
          ),
      ])
      .describe(
        "The short passage the evidence was drawn from, when the source has one worth showing; null for a source that is just a link (e.g. a typed weather lookup).",
      )
      .default(null),
    /**Free-text provenance: the turn id this citation was gathered for (mirrors memory-record.schema.json's own 'source' field and naming).*/
    source: z
      .string()
      .min(1)
      .describe(
        "Free-text provenance: the turn id this citation was gathered for (mirrors memory-record.schema.json's own 'source' field and naming).",
      ),
    created_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    /**Date of the immutable local snapshot used for this citation.*/
    snapshot_date: z
      .string()
      .date()
      .describe("Date of the immutable local snapshot used for this citation.")
      .optional(),
    /**The source material licence used for attribution.*/
    licence: z
      .enum(["cc-by-sa-4.0", "cc0", "public-domain", "publisher"])
      .describe("The source material licence used for attribution.")
      .optional(),
    /**Home proxy path for a page in a locally installed reference archive.*/
    local_path: z
      .string()
      .min(1)
      .describe(
        "Home proxy path for a page in a locally installed reference archive.",
      )
      .optional(),
    /**Number of distinct registrable publishers represented by a story after wire-copy folding.*/
    publisher_count: z
      .number()
      .int()
      .gte(1)
      .describe(
        "Number of distinct registrable publishers represented by a story after wire-copy folding.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "One citation on an assistant reply: the evidence ladder CHAT-16 phrases factual answers from (media-conversation-program-2026-09-13.md step 4 - a typed source, then websearch, then model knowledge), numbered and rendered as `[N]` markers in the reply text (docs/BACKLOG.md's 'Inline citation markers on sourced answers', the Perplexity-shaped pattern legacy already validated once). Lives on the assistant turn (backend/src/wire.ts's TurnValue, additive when CHAT-16 lands - home is the whole record, no separate hub/robot split for this one), never independently synced or merged, which is why it carries the shared envelope (source, hlc, created_at) but no updated_at: a citation is a snapshot of what was true when the reply was generated, not an editable record.",
  );
export type Source = z.infer<typeof Source>;
