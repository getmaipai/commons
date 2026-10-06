// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/chat-folder.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A named group of one person's chat conversations, shown to people as a Project in the chat history column (CHAT-PROJECT-01a). It belongs to one person; a parent may make one for a child. A conversation joins it through Conversation.folder_id. Deleting a folder keeps its conversations (their folder_id goes back to null). Named 'chat folder' on the wire so it is never mistaken for the background-work Project record (project.schema.json). This version carries no instructions or files: a folder only groups conversations.*/
export const ChatFolder = z
  .object({
    /**Stable id, never reused.*/
    id: z
      .string()
      .regex(new RegExp("^folder-[a-z0-9]{6,}$"))
      .describe("Stable id, never reused."),
    /**Whose folder this is. Only this person's conversations may join it.*/
    person: z
      .string()
      .regex(new RegExp("^person-[a-z0-9]{6,}$"))
      .describe(
        "Whose folder this is. Only this person's conversations may join it.",
      ),
    /**What the person calls the project. Trimmed; not unique.*/
    name: z
      .string()
      .min(1)
      .max(80)
      .describe("What the person calls the project. Trimmed; not unique."),
    /**Position among the person's folders, lowest first. Ties sort newest first.*/
    sort_order: z
      .number()
      .int()
      .gte(0)
      .describe(
        "Position among the person's folders, lowest first. Ties sort newest first.",
      )
      .default(0),
    /**hub: authoritative on the hub. local: made on a robot, not yet synced. Mirrors conversation.schema.json's own source field.*/
    source: z
      .enum(["hub", "local"])
      .describe(
        "hub: authoritative on the hub. local: made on a robot, not yet synced. Mirrors conversation.schema.json's own source field.",
      ),
    /**Free text naming who made the folder, for example 'person-a1b2c3 (self)' or 'person-d4e5f6 (parent)'.*/
    provenance: z
      .string()
      .min(1)
      .describe(
        "Free text naming who made the folder, for example 'person-a1b2c3 (self)' or 'person-d4e5f6 (parent)'.",
      ),
    /**Hybrid logical clock: wall_ms:counter:node (7.3).*/
    hlc: z
      .string()
      .regex(new RegExp("^[0-9]+:[0-9]+:[a-z0-9]{6,}$"))
      .describe("Hybrid logical clock: wall_ms:counter:node (7.3)."),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
    /**Set when the folder is deleted, so a syncing client drops it. Its conversations keep existing with folder_id null.*/
    deleted_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Set when the folder is deleted, so a syncing client drops it. Its conversations keep existing with folder_id null.",
          ),
        z
          .null()
          .describe(
            "Set when the folder is deleted, so a syncing client drops it. Its conversations keep existing with folder_id null.",
          ),
      ])
      .describe(
        "Set when the folder is deleted, so a syncing client drops it. Its conversations keep existing with folder_id null.",
      )
      .default(null),
  })
  .strict()
  .describe(
    "A named group of one person's chat conversations, shown to people as a Project in the chat history column (CHAT-PROJECT-01a). It belongs to one person; a parent may make one for a child. A conversation joins it through Conversation.folder_id. Deleting a folder keeps its conversations (their folder_id goes back to null). Named 'chat folder' on the wire so it is never mistaken for the background-work Project record (project.schema.json). This version carries no instructions or files: a folder only groups conversations.",
  );
export type ChatFolder = z.infer<typeof ChatFolder>;
