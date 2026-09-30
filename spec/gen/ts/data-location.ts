// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/data-location.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**The bootstrap record of where a machine's household data lives (home docs/dev.md, 'DATA-LOCATION', section (a)): a root folder plus per-class overrides, each with a generation and the identity of the volume it sits on, and the move in progress if there is one. It is data-location.json in the lock's folder, outside every class, because settings live in the database and the database is itself a class. Written atomically by exactly three writers (the installer's init, the hub's adoption step, a move), never by hand. A class absent from classes is treated as { path: null, generation: 1 }, so adding a class to a product needs no record migration. Schema 2 is the per-class record; the first draft's three-group record was never written by any code. Every field is required so a reader has one shape to handle: classes may be empty and move may be null.*/
export const DataLocation = z
  .object({
    /**The record's own version. A reader refuses a record whose schema it does not know.*/
    schema: z
      .literal(2)
      .describe(
        "The record's own version. A reader refuses a record whose schema it does not know.",
      ),
    /**The product's install or checkout root that owns this record. A process whose own root differs (a worktree, a second checkout) treats the record as not its own, never writes it and logs one line saying so.*/
    productRoot: z
      .string()
      .min(1)
      .describe(
        "The product's install or checkout root that owns this record. A process whose own root differs (a worktree, a second checkout) treats the record as not its own, never writes it and logs one line saying so.",
      ),
    /**A ULID minted once, when the household's first folder is created or adopted, and never changed. Every folder marker of this household carries it, so a folder that belongs to another household or another install is recognised on sight.*/
    householdFolderId: z
      .string()
      .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
      .describe(
        "A ULID minted once, when the household's first folder is created or adopted, and never changed. Every folder marker of this household carries it, so a folder that belongs to another household or another install is recognised on sight.",
      ),
    /**The folder every class without an override lives under (joined with the class's default subpath), and whose parent holds the beside-root classes.*/
    root: z
      .object({
        /**An absolute path on this machine.*/
        path: z.string().min(1).describe("An absolute path on this machine."),
        /**The volume the root was on when the record was written.*/
        volume: z
          .object({
            /**The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.*/
            id: z
              .string()
              .min(1)
              .describe(
                "The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.",
              ),
            /**The volume's name as a person knows it. May be empty when the volume has none.*/
            label: z
              .string()
              .describe(
                "The volume's name as a person knows it. May be empty when the volume has none.",
              ),
            /**The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.*/
            relativePath: z
              .string()
              .describe(
                "The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.",
              ),
          })
          .strict()
          .describe("The volume the root was on when the record was written.")
          .optional(),
      })
      .strict()
      .describe(
        "The folder every class without an override lives under (joined with the class's default subpath), and whose parent holds the beside-root classes.",
      ),
    /**Per-class entries, keyed by class id. A class with path null follows the root. A class absent here is the same as { path: null, generation: 1 }.*/
    classes: z
      .record(
        z.string(),
        z
          .object({
            /**An absolute override path, or null to follow the root.*/
            path: z
              .union([
                z
                  .string()
                  .min(1)
                  .describe(
                    "An absolute override path, or null to follow the root.",
                  ),
                z
                  .null()
                  .describe(
                    "An absolute override path, or null to follow the root.",
                  ),
              ])
              .describe(
                "An absolute override path, or null to follow the root.",
              ),
            /**Goes up by one on every move of this class. The folder whose marker matches (householdFolderId, class, generation) is the class's one live folder.*/
            generation: z
              .number()
              .int()
              .gte(1)
              .describe(
                "Goes up by one on every move of this class. The folder whose marker matches (householdFolderId, class, generation) is the class's one live folder.",
              ),
            /**The volume the override path was on when it was written. Omitted when path is null or the writer could not read it.*/
            volume: z
              .object({
                /**The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.*/
                id: z
                  .string()
                  .min(1)
                  .describe(
                    "The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.",
                  ),
                /**The volume's name as a person knows it. May be empty when the volume has none.*/
                label: z
                  .string()
                  .describe(
                    "The volume's name as a person knows it. May be empty when the volume has none.",
                  ),
                /**The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.*/
                relativePath: z
                  .string()
                  .describe(
                    "The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.",
                  ),
              })
              .strict()
              .describe(
                "The volume the override path was on when it was written. Omitted when path is null or the writer could not read it.",
              )
              .optional(),
          })
          .strict()
          .describe(
            "One class's entry: an override path (or null to follow the root), its generation and the volume the override sits on.",
          ),
      )
      .describe(
        "Per-class entries, keyed by class id. A class with path null follows the root. A class absent here is the same as { path: null, generation: 1 }.",
      ),
    /**When the record was last written.*/
    writtenAt: z
      .string()
      .datetime({ offset: true })
      .describe("When the record was last written."),
    /**Which of the three writers wrote it: init (the installer's data-location init), adopt (the hub's one-time adoption of an existing household) or move (the mover, including its rollback).*/
    writtenBy: z
      .enum(["init", "adopt", "move"])
      .describe(
        "Which of the three writers wrote it: init (the installer's data-location init), adopt (the hub's one-time adoption of an existing household) or move (the mover, including its rollback).",
      ),
    /**The move in progress, or null. One move runs at a time. It is recorded before each step starts, so a killed process finds out exactly where it was. Each class in steps has its own copy, verify, switch and retire, so each class's switch is its own commit point. At most one step per class.*/
    move: z
      .union([
        z
          .object({
            /**The move's id (a ULID). It is stamped into the markers the move writes and names each staging folder.*/
            id: z
              .string()
              .regex(new RegExp("^[0-9A-HJKMNP-TV-Z]{26}$"))
              .describe(
                "The move's id (a ULID). It is stamped into the markers the move writes and names each staging folder.",
              ),
            /**How many boots have started on the switched folders without reaching healthy. Two failures in a row roll the offline classes of the move back.*/
            bootAttempts: z
              .number()
              .int()
              .gte(0)
              .describe(
                "How many boots have started on the switched folders without reaching healthy. Two failures in a row roll the offline classes of the move back.",
              ),
            /**One step per class in the move, in the order they are processed.*/
            steps: z
              .array(
                z
                  .object({
                    /**The class id being moved.*/
                    class: z
                      .string()
                      .regex(new RegExp("^[a-z][a-z0-9]*(-[a-z0-9]+)*$"))
                      .describe("The class id being moved."),
                    /**The class's resolved absolute folder before the move.*/
                    from: z
                      .string()
                      .min(1)
                      .describe(
                        "The class's resolved absolute folder before the move.",
                      ),
                    /**The absolute folder the class moves to.*/
                    to: z
                      .string()
                      .min(1)
                      .describe("The absolute folder the class moves to."),
                    /**How this step runs. offline, online and empty are the class's move capability. refetch is chosen per move for a class whose refetch flag is true: nothing is copied, the target starts empty and the pinned set downloads after the switch.*/
                    mode: z
                      .enum(["offline", "online", "empty", "refetch"])
                      .describe(
                        "How this step runs. offline, online and empty are the class's move capability. refetch is chosen per move for a class whose refetch flag is true: nothing is copied, the target starts empty and the pinned set downloads after the switch.",
                      ),
                    /**The staging folder (.maipai-move-<id>-<class>, beside the target on the target's drive) while a copy is under way, or null when there is none (a same-volume rename, an empty target, or before the copy starts).*/
                    staging: z
                      .union([
                        z
                          .string()
                          .min(1)
                          .describe(
                            "The staging folder (.maipai-move-<id>-<class>, beside the target on the target's drive) while a copy is under way, or null when there is none (a same-volume rename, an empty target, or before the copy starts).",
                          ),
                        z
                          .null()
                          .describe(
                            "The staging folder (.maipai-move-<id>-<class>, beside the target on the target's drive) while a copy is under way, or null when there is none (a same-volume rename, an empty target, or before the copy starts).",
                          ),
                      ])
                      .describe(
                        "The staging folder (.maipai-move-<id>-<class>, beside the target on the target's drive) while a copy is under way, or null when there is none (a same-volume rename, an empty target, or before the copy starts).",
                      ),
                    /**Where the step is. planned: accepted, nothing touched. copying: the copy into staging has started. verified: copy checked and renamed into place. switched: the record points at the new folder (the commit point). healthy: the first boot proved the move. deleting-old: the retired old folder is being deleted after the person confirmed.*/
                    state: z
                      .enum([
                        "planned",
                        "copying",
                        "verified",
                        "switched",
                        "healthy",
                        "deleting-old",
                      ])
                      .describe(
                        "Where the step is. planned: accepted, nothing touched. copying: the copy into staging has started. verified: copy checked and renamed into place. switched: the record points at the new folder (the commit point). healthy: the first boot proved the move. deleting-old: the retired old folder is being deleted after the person confirmed.",
                      ),
                    /**The class's record entry before the switch, kept so the automatic rollback before healthy can put path and generation back exactly (a null path means the class followed the root).*/
                    previous: z
                      .object({
                        /**An absolute override path, or null to follow the root.*/
                        path: z
                          .union([
                            z
                              .string()
                              .min(1)
                              .describe(
                                "An absolute override path, or null to follow the root.",
                              ),
                            z
                              .null()
                              .describe(
                                "An absolute override path, or null to follow the root.",
                              ),
                          ])
                          .describe(
                            "An absolute override path, or null to follow the root.",
                          ),
                        /**Goes up by one on every move of this class. The folder whose marker matches (householdFolderId, class, generation) is the class's one live folder.*/
                        generation: z
                          .number()
                          .int()
                          .gte(1)
                          .describe(
                            "Goes up by one on every move of this class. The folder whose marker matches (householdFolderId, class, generation) is the class's one live folder.",
                          ),
                        /**The volume the override path was on when it was written. Omitted when path is null or the writer could not read it.*/
                        volume: z
                          .object({
                            /**The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.*/
                            id: z
                              .string()
                              .min(1)
                              .describe(
                                "The filesystem UUID on macOS and Linux, the volume GUID on Windows, and for a network share the share's own address (//nas/share, nas:/export), which has no UUID.",
                              ),
                            /**The volume's name as a person knows it. May be empty when the volume has none.*/
                            label: z
                              .string()
                              .describe(
                                "The volume's name as a person knows it. May be empty when the volume has none.",
                              ),
                            /**The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.*/
                            relativePath: z
                              .string()
                              .describe(
                                "The folder's path below the volume's mount point, forward slashes, empty when the folder is the volume's top.",
                              ),
                          })
                          .strict()
                          .describe(
                            "The volume the override path was on when it was written. Omitted when path is null or the writer could not read it.",
                          )
                          .optional(),
                      })
                      .strict()
                      .describe(
                        "The class's record entry before the switch, kept so the automatic rollback before healthy can put path and generation back exactly (a null path means the class followed the root).",
                      ),
                  })
                  .strict(),
              )
              .min(1)
              .describe(
                "One step per class in the move, in the order they are processed.",
              ),
          })
          .strict()
          .describe(
            "The move in progress, or null. One move runs at a time. It is recorded before each step starts, so a killed process finds out exactly where it was. Each class in steps has its own copy, verify, switch and retire, so each class's switch is its own commit point. At most one step per class.",
          ),
        z
          .null()
          .describe(
            "The move in progress, or null. One move runs at a time. It is recorded before each step starts, so a killed process finds out exactly where it was. Each class in steps has its own copy, verify, switch and retire, so each class's switch is its own commit point. At most one step per class.",
          ),
      ])
      .describe(
        "The move in progress, or null. One move runs at a time. It is recorded before each step starts, so a killed process finds out exactly where it was. Each class in steps has its own copy, verify, switch and retire, so each class's switch is its own commit point. At most one step per class.",
      ),
  })
  .strict()
  .describe(
    "The bootstrap record of where a machine's household data lives (home docs/dev.md, 'DATA-LOCATION', section (a)): a root folder plus per-class overrides, each with a generation and the identity of the volume it sits on, and the move in progress if there is one. It is data-location.json in the lock's folder, outside every class, because settings live in the database and the database is itself a class. Written atomically by exactly three writers (the installer's init, the hub's adoption step, a move), never by hand. A class absent from classes is treated as { path: null, generation: 1 }, so adding a class to a product needs no record migration. Schema 2 is the per-class record; the first draft's three-group record was never written by any code. Every field is required so a reader has one shape to handle: classes may be empty and move may be null.",
  );
export type DataLocation = z.infer<typeof DataLocation>;
