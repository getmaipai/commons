// GENERATED FILE. Do not edit by hand.
// Source: spec/schemas/data-class.schema.json
// Regenerate with: cd spec && bun run gen:ts

import { z } from "zod";

/**One declaration of a class of data a product keeps on a person's machine: a folder whose contents share one owner, one size and access profile, one durability need and one rule for what happens when it is missing (home docs/dev.md, 'DATA-LOCATION'). Each class has exactly one location, chosen at install and movable later, so every consumer (the path resolver, the installer, the Storage page, the mover, the describe-before-delete step, the backup) reads the same declaration. This schema is the shape only: each product declares its own list (Home's is backend/src/lib/dataClasses.ts, the Stack's is served at GET /stack/v1/storage/classes) and commons never holds a product's layout. Enum values follow the design record exactly. A hold-class declaration carries an empty degrades list. A class with no capability requirement carries an empty needs list.*/
export const DataClass = z
  .object({
    /**The class's stable name, lowercase words joined by hyphens (records, people-files, stack-models). It is the key in a location record's classes object and the class field of a folder marker, and is never reused for a different kind of data.*/
    id: z
      .string()
      .regex(new RegExp("^[a-z][a-z0-9]*(-[a-z0-9]+)*$"))
      .describe(
        "The class's stable name, lowercase words joined by hyphens (records, people-files, stack-models). It is the key in a location record's classes object and the class field of a folder marker, and is never reused for a different kind of data.",
      ),
    /**The product that owns the class and its location record. No folder is ever shared between products.*/
    product: z
      .enum(["home", "stack", "bot"])
      .describe(
        "The product that owns the class and its location record. No folder is ever shared between products.",
      ),
    /**The plain name a person sees on the Storage page and in the installer ('AI models', 'Household records').*/
    title: z
      .string()
      .min(1)
      .describe(
        "The plain name a person sees on the Storage page and in the installer ('AI models', 'Household records').",
      ),
    /**One or two plain sentences saying what lives here and why a person might place it apart from the rest.*/
    help: z
      .string()
      .min(1)
      .describe(
        "One or two plain sentences saying what lives here and why a person might place it apart from the rest.",
      ),
    /**The disclosure level of the class's row on the Storage page (the same three levels as a setting): basic rows are shown, advanced rows are folded, expert rows sit under Developer tools.*/
    level: z
      .enum(["basic", "advanced", "expert"])
      .describe(
        "The disclosure level of the class's row on the Storage page (the same three levels as a setting): basic rows are shown, advanced rows are folded, expert rows sit under Developer tools.",
      ),
    /**Where the class lives when its record entry has no override: the base folder joined with the subpath. Every default equals the layout the product had before locations existed, so adopting an existing install moves no file.*/
    default: z
      .object({
        /**root: under the record's root path. beside-root: under the root path's parent, as the two backup classes are today, so moving the root never shifts them.*/
        base: z
          .enum(["root", "beside-root"])
          .describe(
            "root: under the record's root path. beside-root: under the root path's parent, as the two backup classes are today, so moving the root never shifts them.",
          ),
        /**A relative path of forward-slash-separated names, joined to the base. The empty string means the base folder itself (records lives in the root itself). It never starts with a slash, never contains a backslash or a colon, and never has a '.' or '..' segment, so no default can leave its base.*/
        subpath: z
          .string()
          .regex(
            new RegExp(
              "^(?:(?:[^/\\\\:.][^/\\\\:]*|\\.[^/\\\\:.][^/\\\\:]*|\\.\\.[^/\\\\:]+)(?:/(?:[^/\\\\:.][^/\\\\:]*|\\.[^/\\\\:.][^/\\\\:]*|\\.\\.[^/\\\\:]+))*)?$",
            ),
          )
          .describe(
            "A relative path of forward-slash-separated names, joined to the base. The empty string means the base folder itself (records lives in the root itself). It never starts with a slash, never contains a backslash or a colon, and never has a '.' or '..' segment, so no default can leave its base.",
          ),
      })
      .strict()
      .describe(
        "Where the class lives when its record entry has no override: the base folder joined with the subpath. Every default equals the layout the product had before locations existed, so adopting an existing install moves no file.",
      ),
    /**What the folder holds, in the words the describe step and the Storage page show (file and folder names, one line).*/
    holds: z
      .string()
      .min(1)
      .describe(
        "What the folder holds, in the words the describe step and the Storage page show (file and folder names, one line).",
      ),
    /**The size profile as prose a person can read ('MB to a few GB', '4 to 40 GB each', 'grows with retention'). The number the placement check enforces is largestFileBytes.*/
    size: z
      .string()
      .min(1)
      .describe(
        "The size profile as prose a person can read ('MB to a few GB', '4 to 40 GB each', 'grows with retention'). The number the placement check enforces is largestFileBytes.",
      ),
    /**The access profile as prose ('small random writes, fsync on every commit', 'written once, read at boot'). It is why a slow or network disk suits one class and not another.*/
    access: z
      .string()
      .min(1)
      .describe(
        "The access profile as prose ('small random writes, fsync on every commit', 'written once, read at boot'). It is why a slow or network disk suits one class and not another.",
      ),
    /**What losing the folder costs. irreplaceable: the household's own data, gone without a backup. rebuildable: recoverable, but only by downloading or recomputing something costly. disposable: rebuilt for free.*/
    durability: z
      .enum(["irreplaceable", "rebuildable", "disposable"])
      .describe(
        "What losing the folder costs. irreplaceable: the household's own data, gone without a backup. rebuildable: recoverable, but only by downloading or recomputing something costly. disposable: rebuilt for free.",
      ),
    /**How a lost folder is made whole. none: it cannot be. download: fetched again from its pinned source. recompute: derived again from another class. empty: it simply starts empty.*/
    rebuild: z
      .enum(["none", "download", "recompute", "empty"])
      .describe(
        "How a lost folder is made whole. none: it cannot be. download: fetched again from its pinned source. recompute: derived again from another class. empty: it simply starts empty.",
      ),
    /**The most sensitive thing the folder can hold, one value, strongest wins in the order none, personal, biometric, keys. The describe step names these classes by name and the placement check warns about the wrong disk for them. What else the class holds is in its holds text.*/
    sensitive: z
      .enum(["none", "personal", "biometric", "keys"])
      .describe(
        "The most sensitive thing the folder can hold, one value, strongest wins in the order none, personal, biometric, keys. The describe step names these classes by name and the placement check warns about the wrong disk for them. What else the class holds is in its holds text.",
      ),
    /**The filesystem capabilities the class requires of its location, probed at the target. sqlite: reliable fsync and byte-range locks. private: owner-only permissions the filesystem enforces. exec: a mount that allows executing files. large-files: files over 4 GB. symlinks and hardlinks: as named. Empty when the class needs nothing beyond writing.*/
    needs: z
      .array(
        z.enum([
          "sqlite",
          "private",
          "exec",
          "large-files",
          "symlinks",
          "hardlinks",
        ]),
      )
      .describe(
        "The filesystem capabilities the class requires of its location, probed at the target. sqlite: reliable fsync and byte-range locks. private: owner-only permissions the filesystem enforces. exec: a mount that allows executing files. large-files: files over 4 GB. symlinks and hardlinks: as named. Empty when the class needs nothing beyond writing.",
      ),
    /**What a boot does when the class's folder is absent or its marker does not match. hold: the product refuses to run (hold mode) and never creates or replaces the folder. degrade: the product runs with this class's features off and a health item raised.*/
    whenMissing: z
      .enum(["hold", "degrade"])
      .describe(
        "What a boot does when the class's folder is absent or its marker does not match. hold: the product refuses to run (hold mode) and never creates or replaces the folder. degrade: the product runs with this class's features off and a health item raised.",
      ),
    /**The feature codes turned off while a degrade class is missing. Empty for a hold class, which turns the whole product off instead.*/
    degrades: z
      .array(z.string().min(1))
      .describe(
        "The feature codes turned off while a degrade class is missing. Empty for a hold class, which turns the whole product off instead.",
      ),
    /**How a move of the class runs. offline: the product stops for the move. online: the product stays up and pauses only the class's own users. empty: nothing is copied, the target starts empty. Starting empty and downloading again is the separate refetch flag, chosen per move.*/
    move: z
      .enum(["offline", "online", "empty"])
      .describe(
        "How a move of the class runs. offline: the product stops for the move. online: the product stays up and pauses only the class's own users. empty: nothing is copied, the target starts empty. Starting empty and downloading again is the separate refetch flag, chosen per move.",
      ),
    /**True when a move may skip the copy: the target starts empty and the product downloads the pinned set into it after the switch ('download again instead of copying').*/
    refetch: z
      .boolean()
      .describe(
        "True when a move may skip the copy: the target starts empty and the product downloads the pinned set into it after the switch ('download again instead of copying').",
      ),
    /**How the class enters the household backup. hot: copied into every archive. cold: copied on a slower cadence. exclude: never in the archive. library: listed in the archive, not copied. kit: only in the emergency kit, never in the archive. none: not applicable (the backup classes themselves).*/
    backup: z
      .enum(["hot", "cold", "exclude", "library", "kit", "none"])
      .describe(
        "How the class enters the household backup. hot: copied into every archive. cold: copied on a slower cadence. exclude: never in the archive. library: listed in the archive, not copied. kit: only in the emergency kit, never in the archive. none: not applicable (the backup classes themselves).",
      ),
    /**The size in bytes of the largest single file the class is expected to hold, read from pinned sizes, so the placement check can refuse a filesystem with a smaller file limit. Omitted when the class holds no file near a filesystem limit.*/
    largestFileBytes: z
      .number()
      .int()
      .gte(0)
      .describe(
        "The size in bytes of the largest single file the class is expected to hold, read from pinned sizes, so the placement check can refuse a filesystem with a smaller file limit. Omitted when the class holds no file near a filesystem limit.",
      )
      .optional(),
  })
  .strict()
  .describe(
    "One declaration of a class of data a product keeps on a person's machine: a folder whose contents share one owner, one size and access profile, one durability need and one rule for what happens when it is missing (home docs/dev.md, 'DATA-LOCATION'). Each class has exactly one location, chosen at install and movable later, so every consumer (the path resolver, the installer, the Storage page, the mover, the describe-before-delete step, the backup) reads the same declaration. This schema is the shape only: each product declares its own list (Home's is backend/src/lib/dataClasses.ts, the Stack's is served at GET /stack/v1/storage/classes) and commons never holds a product's layout. Enum values follow the design record exactly. A hold-class declaration carries an empty degrades list. A class with no capability requirement carries an empty needs list.",
  );
export type DataClass = z.infer<typeof DataClass>;
