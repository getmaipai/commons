// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/likeness-use.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**LIKENESS-01. One time another household adult made a picture or video that looks like this person (with a saved style of them or from a photo of them). The subject sees these rows, and only the subject: they are the "Likeness use" log on the person's own settings page, and each one also sends the subject a notification. No prompt, picture or file is stored here.*/
export const LikenessUse = z
  .object({
    id: z.string().min(1),
    /**Whose likeness was used.*/
    subject_person_id: z.string().min(1).describe("Whose likeness was used."),
    /**The adult who asked.*/
    requester_person_id: z.string().min(1).describe("The adult who asked."),
    medium: z.enum(["picture", "video"]),
    /**style: a saved style (LoRA) of the person. photo: an uploaded photo of the person.*/
    way: z
      .enum(["style", "photo"])
      .describe(
        "style: a saved style (LoRA) of the person. photo: an uploaded photo of the person.",
      ),
    /**Whether the request fell under the adult-content switch, which needed the subject's second consent.*/
    adult_content: z
      .boolean()
      .describe(
        "Whether the request fell under the adult-content switch, which needed the subject's second consent.",
      ),
    /**Where the request was made; this is the record provenance.*/
    source: z
      .enum(["chat", "editor"])
      .describe("Where the request was made; this is the record provenance."),
    used_at: z.string().datetime({ offset: true }),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
  })
  .strict()
  .describe(
    'LIKENESS-01. One time another household adult made a picture or video that looks like this person (with a saved style of them or from a photo of them). The subject sees these rows, and only the subject: they are the "Likeness use" log on the person\'s own settings page, and each one also sends the subject a notification. No prompt, picture or file is stored here.',
  );
export type LikenessUse = z.infer<typeof LikenessUse>;
