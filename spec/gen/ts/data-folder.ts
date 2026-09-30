// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/data-folder.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The visible marker file, maipai-folder.json, at the top of every class folder (home docs/dev.md, 'DATA-LOCATION', section (a)). It says which household, which class and which generation of that class the folder is, and whether a move has retired it. Exactly one folder on a machine matches (householdFolderId, class, generation) for a class, and that folder is the class's live one; a retired folder is refused and never used. The file is visible on purpose, so a person who opens the folder is told what it is. It carries no volume identity: the location record does.*/
export const DataFolder = z
  .object({
    /**The marker's own version. Nothing wrote an earlier shape, so it starts at 1.*/
    schema: z
      .literal(1)
      .describe(
        "The marker's own version. Nothing wrote an earlier shape, so it starts at 1.",
      ),
    /**The product that owns the folder.*/
    product: z
      .enum(["home", "stack", "bot"])
      .describe("The product that owns the folder."),
    /**The class id (see data-class.schema.json) of the data the folder holds.*/
    class: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9]*(-[a-z0-9]+)*$"))
      .describe(
        "The class id (see data-class.schema.json) of the data the folder holds.",
      ),
    /**The household's folder id from the location record (a ULID). A folder whose id differs belongs to another household or install.*/
    householdFolderId: z
      .string()
      .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
      .describe(
        "The household's folder id from the location record (a ULID). A folder whose id differs belongs to another household or install.",
      ),
    /**The class's generation this folder is the live one for. Goes up by one on every move of the class, and a moved-to folder is stamped with the new number.*/
    generation: z
      .number()
      .int()
      .gte(1)
      .describe(
        "The class's generation this folder is the live one for. Goes up by one on every move of the class, and a moved-to folder is stamped with the new number.",
      ),
    /**When the marker was written.*/
    createdAt: z
      .string()
      .datetime({ offset: true })
      .describe("When the marker was written."),
    /**The id of the move (a ULID) that created this folder, when a move did. Absent for a folder made by the installer or adoption.*/
    moveId: z
      .string()
      .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
      .describe(
        "The id of the move (a ULID) that created this folder, when a move did. Absent for a folder made by the installer or adoption.",
      )
      .optional(),
    /**Present only after a confirmed move left this folder behind. Nothing else in the marker changes when it is set. A retired folder is never used, and only a folder retired by a given move is ever offered for deletion by that move.*/
    retired: z
      .object({
        /**When the folder was retired.*/
        at: z
          .string()
          .datetime({ offset: true })
          .describe("When the folder was retired."),
        /**The absolute path the class's data moved to.*/
        movedTo: z
          .string()
          .min(1)
          .describe("The absolute path the class's data moved to."),
        /**The move (a ULID) that retired the folder.*/
        moveId: z
          .string()
          .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
          .describe("The move (a ULID) that retired the folder."),
      })
      .strict()
      .describe(
        "Present only after a confirmed move left this folder behind. Nothing else in the marker changes when it is set. A retired folder is never used, and only a folder retired by a given move is ever offered for deletion by that move.",
      )
      .optional(),
    /**A plain sentence for a person who opens the folder: 'This folder holds part of a MaiPai Home household's data (class: people-files). MaiPai uses it while Settings > Storage lists it; do not delete or move it by hand.'*/
    note: z
      .string()
      .min(1)
      .describe(
        "A plain sentence for a person who opens the folder: 'This folder holds part of a MaiPai Home household's data (class: people-files). MaiPai uses it while Settings > Storage lists it; do not delete or move it by hand.'",
      ),
  })
  .strict()
  .describe(
    "The visible marker file, maipai-folder.json, at the top of every class folder (home docs/dev.md, 'DATA-LOCATION', section (a)). It says which household, which class and which generation of that class the folder is, and whether a move has retired it. Exactly one folder on a machine matches (householdFolderId, class, generation) for a class, and that folder is the class's live one; a retired folder is refused and never used. The file is visible on purpose, so a person who opens the folder is told what it is. It carries no volume identity: the location record does.",
  );
export type DataFolder = z.infer<typeof DataFolder>;
