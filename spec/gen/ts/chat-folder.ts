// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/chat-folder.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**A named group of one person's chat conversations, shown to people as a Project in the chat history column (CHAT-PROJECT-01a, PROJECTS-P1). It belongs to one person; a parent may make one for a child. A conversation joins it through Conversation.folder_id. Deleting a folder keeps its conversations (their folder_id goes back to null). Named 'chat folder' on the wire so it is never mistaken for the background-work Project record (project.schema.json). Since spec-v0.1.90 it also carries a colour, an icon, a description, instructions, a pin, an archive stamp, a memory mode and a share list, all optional with defaults so a v0.1.87 record still validates. Project files are not on the record yet.*/
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
    /**A palette name, never a hex. Maps one to one to the kit's --hue-* tokens; neutral is the muted foreground.*/
    color: z
      .enum([
        "neutral",
        "blue",
        "violet",
        "teal",
        "orange",
        "pink",
        "red",
        "green",
        "yellow",
      ])
      .describe(
        "A palette name, never a hex. Maps one to one to the kit's --hue-* tokens; neutral is the muted foreground.",
      )
      .default("neutral"),
    /**A name from vocab/project-icons.json (a fixed list, no uploads, no emoji). Every name exists in the kit's icon registry.*/
    icon: z
      .string()
      .regex(new RegExp("^[a-z0-9]+(-[a-z0-9]+)*$"))
      .describe(
        "A name from vocab/project-icons.json (a fixed list, no uploads, no emoji). Every name exists in the kit's icon registry.",
      )
      .default("folder"),
    /**Shown to people only, never sent to the model. A minor's description passes the output floor on save.*/
    description: z
      .string()
      .max(500)
      .describe(
        "Shown to people only, never sent to the model. A minor's description passes the output floor on save.",
      )
      .default(""),
    /**Notes the model follows in this project's chats. Enters the prompt after the person's own custom instructions, as labelled data that never outranks the safety floor or the age band. Passes the output floor on save for a minor project or editor.*/
    instructions: z
      .string()
      .max(1500)
      .describe(
        "Notes the model follows in this project's chats. Enters the prompt after the person's own custom instructions, as labelled data that never outranks the safety floor or the age band. Passes the output floor on save for a minor project or editor.",
      )
      .default(""),
    /**Pinned to the top of the project list.*/
    pinned: z
      .boolean()
      .describe("Pinned to the top of the project list.")
      .default(false),
    /**When it was pinned; null when not pinned. Pinned projects sort by this, newest pin first.*/
    pinned_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "When it was pinned; null when not pinned. Pinned projects sort by this, newest pin first.",
          ),
        z
          .null()
          .describe(
            "When it was pinned; null when not pinned. Pinned projects sort by this, newest pin first.",
          ),
      ])
      .describe(
        "When it was pinned; null when not pinned. Pinned projects sort by this, newest pin first.",
      )
      .default(null),
    /**Set when the project is archived: hidden from the default list, kept with its chats and settings. Distinct from deleted_at.*/
    archived_at: z
      .union([
        z
          .string()
          .datetime({ offset: true })
          .describe(
            "Set when the project is archived: hidden from the default list, kept with its chats and settings. Distinct from deleted_at.",
          ),
        z
          .null()
          .describe(
            "Set when the project is archived: hidden from the default list, kept with its chats and settings. Distinct from deleted_at.",
          ),
      ])
      .describe(
        "Set when the project is archived: hidden from the default list, kept with its chats and settings. Distinct from deleted_at.",
      )
      .default(null),
    /**shared: chats here read and write the person's normal memory. project_only: only memories written in this project are used here, and they are used nowhere else. A record without the field reads as shared (what every project did before this field); the hub writes project_only for a new project. A shared project (non-empty shares) is always project_only.*/
    memory_mode: z
      .enum(["shared", "project_only"])
      .describe(
        "shared: chats here read and write the person's normal memory. project_only: only memories written in this project are used here, and they are used nowhere else. A record without the field reads as shared (what every project did before this field); the hub writes project_only for a new project. A shared project (non-empty shares) is always project_only.",
      )
      .default("shared"),
    /**Household members this project is shared with. Teens' and children's projects follow the band rules: a child's project is parent-managed, a teen shares only by their own choice, a child is added only by a parent.*/
    shares: z
      .array(
        z
          .object({
            /**A household member the owner shared this project with. Unique within the list.*/
            person: z
              .string()
              .regex(new RegExp("^person-[a-z0-9]{6,}$"))
              .describe(
                "A household member the owner shared this project with. Unique within the list.",
              ),
            /**can_use: start chats in the project and use its instructions. can_edit: also change its name, icon, colour, description and instructions. Only the owner (or a parent for a child's project) changes the list, the memory mode, the archive or the delete.*/
            role: z
              .enum(["can_use", "can_edit"])
              .describe(
                "can_use: start chats in the project and use its instructions. can_edit: also change its name, icon, colour, description and instructions. Only the owner (or a parent for a child's project) changes the list, the memory mode, the archive or the delete.",
              ),
          })
          .strict(),
      )
      .max(20)
      .describe(
        "Household members this project is shared with. Teens' and children's projects follow the band rules: a child's project is parent-managed, a teen shares only by their own choice, a child is added only by a parent.",
      )
      .default([]),
  })
  .strict()
  .describe(
    "A named group of one person's chat conversations, shown to people as a Project in the chat history column (CHAT-PROJECT-01a, PROJECTS-P1). It belongs to one person; a parent may make one for a child. A conversation joins it through Conversation.folder_id. Deleting a folder keeps its conversations (their folder_id goes back to null). Named 'chat folder' on the wire so it is never mistaken for the background-work Project record (project.schema.json). Since spec-v0.1.90 it also carries a colour, an icon, a description, instructions, a pin, an archive stamp, a memory mode and a share list, all optional with defaults so a v0.1.87 record still validates. Project files are not on the record yet.",
  );
export type ChatFolder = z.infer<typeof ChatFolder>;
