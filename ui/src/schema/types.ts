import { z } from "zod";

// Mirrors spec/ui/schema.json field-for-field (docs/plans/session-b-ui.md
// step 5's own catalog/schema agreement test, catalog.test.ts, checks the
// two never drift apart). Zod here, not the JSON Schema itself, because
// nobody constructs a UiNode object graph in TypeScript at runtime the
// way spec/schemas/*.schema.json's record types are constructed - a page
// is authored as JSON and only ever READ, so this exists purely to give
// the interpreter (SchemaPage.tsx) real types and a runtime parse it can
// trust, not to replace ajv's own JSON Schema validation (spec/tests/ts/
// ui-schema.test.ts, the conformance suite pages/*.json run through
// before this ever sees them). spec/ui/README.md has the full reasoning
// for keeping both.
export const BindingSchema = z.object({
  source: z.enum(["route", "host", "package"]),
  path: z.string().min(1),
  stream: z.boolean().default(false),
  // Source "package" only: the JSON body of the data call (literals or "$state.<name>").
  params: z.record(z.string(), z.unknown()).optional(),
});
export type Binding = z.infer<typeof BindingSchema>;

// z.lazy for the two genuinely recursive shapes (Action nests one Action
// inside confirm.on_confirm; UiNode nests itself in page.body/section.
// children/split_view/detail_pane.body) - the same reason schema.json's
// own $ref: "#" is recursive, and the same reason (spec/ui/README.md)
// json-schema-to-zod codegen doesn't work here: hand-written, not
// generated.
export const ActionSchema: z.ZodType<Action> = z.lazy(() =>
  z
    .union([
      z.object({ navigate: z.object({ to: z.string(), state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }) }),
      z.object({
        call: z.object({
          target: z.string(),
          method: z.enum(["POST", "PATCH", "DELETE"]).default("POST"),
          args: z.record(z.string(), z.unknown()).optional(),
          then: z.object({ navigate: z.object({ to: z.string(), state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }) }).optional(),
        }),
      }),
      z.object({ play: z.object({ media_id: z.string().min(1), position_s: z.union([z.number().min(0), z.string()]).optional() }) }),
      z.object({ confirm: z.object({ prompt: z.string(), on_confirm: ActionSchema }) }),
      z.object({ ask: z.object({ prompt: z.string(), expects: z.string() }) }),
    ])
    .refine((a) => Object.keys(a).length === 1, "exactly one action kind"),
);
export type Action =
  | { navigate: { to: string; state?: Record<string, string | number | boolean> } }
  | { call: { target: string; method?: "POST" | "PATCH" | "DELETE"; args?: Record<string, unknown>; then?: { navigate: { to: string; state?: Record<string, string | number | boolean> } } } }
  | { play: { media_id: string; position_s?: number | string } }
  | { confirm: { prompt: string; on_confirm: Action } }
  | { ask: { prompt: string; expects: string } };

export const BatchActionSchema = z.object({
  label: z.string(),
  scope: z.enum(["selected", "all"]),
  variant: z.enum(["default", "destructive"]).default("default"),
  action: ActionSchema,
});
export type BatchAction = z.infer<typeof BatchActionSchema>;

export const EmptyStateNodeSchema = z.object({
  type: z.literal("empty_state"),
  icon: z.string(),
  text: z.string(),
  action: ActionSchema.optional(),
  /** The button's own words for the action (spec `empty_state.action_label`); without it the kit derives a plain label. */
  action_label: z.string().min(1).max(40).optional(),
});
export type EmptyStateNode = z.infer<typeof EmptyStateNodeSchema>;

export const ProgressNodeSchema = z.object({
  type: z.literal("progress"),
  mode: z.enum(["spinner", "determinate"]),
  bind: BindingSchema.optional(),
});
export type ProgressNode = z.infer<typeof ProgressNodeSchema>;

/** The three creation sharing operations are host-owned calls, never navigation or another action kind. */
const ShareCallActionSchema = z.object({
  call: z.object({ target: z.string(), method: z.enum(["POST", "PATCH", "DELETE"]).default("POST"), args: z.record(z.string(), z.unknown()).optional() }),
}).strict();
export const ShareChangeSchema = z.object({
  add: ShareCallActionSchema,
  remove: ShareCallActionSchema,
  make_private: ShareCallActionSchema,
});
export type ShareChange = z.infer<typeof ShareChangeSchema>;

/** Shape returned by a `creation_header` binding. Null or missing display fields use plain fallbacks. */
export interface CreationHeaderData {
  title?: string | null;
  creator?: { name?: string | null; avatar_url?: string | null; label?: string | null; href?: string | null; link_label?: string | null } | null;
  made_at?: string | null;
  description?: string | null;
  art?: string | null;
  meta?: string | null;
  footer_lines?: string[] | null;
  visibility?: {
    mode?: "private" | "shared";
    people?: Array<{ id: string; name?: string | null; avatar_url?: string | null }>;
    can_manage?: boolean;
  } | null;
  candidates?: Array<{ id: string; name?: string | null; avatar_url?: string | null }>;
}

export const CreationHeaderNodeSchema = z.object({
  type: z.literal("creation_header"),
  bind: BindingSchema,
  share_change: ShareChangeSchema,
  candidates_bind: BindingSchema.optional(),
  heading_level: z.enum(["h1", "h2"]).default("h1"),
  variant: z.enum(["full", "byline", "collection"]).default("full"),
  fields: z.object({ art: z.string().min(1).default("art"), meta: z.string().min(1).default("meta"), footer_lines: z.string().min(1).default("footer_lines") }).strict().optional(),
  primary: z.object({ label: z.string().min(1), icon: z.string().optional(), action: ActionSchema }).optional(),
  shuffle: z.object({ label: z.string().min(1), icon: z.string().optional(), labeled: z.boolean().optional(), action: ActionSchema }).optional(),
  more: z.array(z.object({ label: z.string().min(1), icon: z.string().optional(), action: ActionSchema })).optional(),
  part: z.enum(["header", "footer"]).default("header"),
});
export type CreationHeaderNode = z.infer<typeof CreationHeaderNodeSchema>;

export const FormNodeSchema = z.object({
  type: z.literal("form"),
  fields: z
    .array(
      z.object({
        name: z.string(),
        selector: z.enum(["number", "select", "text", "boolean", "duration", "time", "entity", "area", "person", "media"]),
        placeholder: z.string().optional(),
      }),
    )
    .min(1),
  on_submit: ActionSchema,
});
export type FormNode = z.infer<typeof FormNodeSchema>;

export const MessageThreadNodeSchema = z.object({ type: z.literal("message_thread") });
export type MessageThreadNode = z.infer<typeof MessageThreadNodeSchema>;

export const SettingsEditorNodeSchema = z.object({ type: z.literal("settings_editor") });
export type SettingsEditorNode = z.infer<typeof SettingsEditorNodeSchema>;

export const ListNodeSchema = z.object({
  type: z.literal("list"),
  bind: BindingSchema,
  item_key_field: z.string(),
  item_label_field: z.string(),
  item_subtitle_field: z.string().optional(),
  item_badge_field: z.string().optional(),
  item_badge_label: z.string().optional(),
  item_media_field: z.string().optional(),
  row_toggle: z
    .object({
      field: z.string().min(1),
      on_label: z.string().min(1),
      off_label: z.string().min(1),
      action: ActionSchema,
    })
    .optional(),
  row_action: z
    .object({
      icon: z.string(),
      label: z.string(),
      action: ActionSchema,
    })
    .optional(),
  batch: z
    .object({
      select_label: z.string().default("Select"),
      actions: z.array(BatchActionSchema).min(1),
    })
    .optional(),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type ListNode = z.infer<typeof ListNodeSchema>;

export const CardGridNodeSchema = z.object({
  type: z.literal("card_grid"),
  bind: BindingSchema,
  item_key_field: z.string(),
  item_label_field: z.string(),
  on_select: ActionSchema.optional(),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type CardGridNode = z.infer<typeof CardGridNodeSchema>;

export const MediaShelfNodeSchema = z.object({
  type: z.literal("media_shelf"),
  heading: z.string().min(1).max(60).optional(),
  bind: BindingSchema,
  item_key_field: z.string(),
  item_label_field: z.string(),
  item_subtitle_field: z.string().optional(),
  item_media_field: z.string(),
  item_progress_field: z.string().optional(),
  item_badge_field: z.string().optional(),
  item_meta_field: z.string().optional(),
  aspect: z.enum(["wide", "square", "poster"]).default("wide"),
  // MEDIA-POLISH-01: the frameless row, the vertical (Up next) list, hiding an empty shelf and the See all link.
  variant: z.enum(["card", "plain"]).default("card"),
  orientation: z.enum(["horizontal", "vertical"]).default("horizontal"),
  layout: z.enum(["rail", "grid"]).optional(),
  art_shape: z.enum(["default", "circle"]).optional(),
  density: z.enum(["default", "compact"]).optional(),
  item_highlight_field: z.string().optional(),
  item_index_field: z.string().optional(),
  row_actions: z.array(z.object({
    icon: z.string().min(1),
    label: z.string().min(1),
    label_field: z.string().min(1).optional(),
    action: ActionSchema,
  }).strict()).max(2).optional(),
  // MUSIC-KIT-01: the modern music look.
  card_radius: z.enum(["default", "tight"]).optional(),
  press_scale: z.boolean().optional(),
  on_play: ActionSchema.optional(),
  play_label: z.string().min(1).max(80).optional(),
  hide_when_empty: z.boolean().default(false),
  see_all: z.object({ label: z.string().min(1).max(40), icon: z.string().optional(), action: ActionSchema }).optional(),
  // VIDEO-UI-05 (K12): day groups, the tile-size slider and the favorite heart (spec/ui/schema.json `media_shelf`).
  group_by_field: z.string().min(1).optional(),
  group_noun: z.object({ one: z.string().min(1).max(24), other: z.string().min(1).max(24) }).strict().optional(),
  size_control: z.boolean().optional(),
  favorite: z.object({ field: z.string().min(1), action: ActionSchema }).strict().optional(),
  // VIDEO-UI-14: a muted loop over the poster (`item_loop_field` is the clip's same-origin path).
  media_loop: z.boolean().optional(),
  item_loop_field: z.string().optional(),
  on_select: ActionSchema.optional(),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type MediaShelfNode = z.infer<typeof MediaShelfNodeSchema>;

// MEDIA-PLAYER-01: the Billboard and the Player as nodes (spec/ui/schema.json `billboard`, `player`).
export const BillboardActionSchema = z.object({
  label: z.string().min(1).max(40),
  icon: z.string().optional(),
  action: ActionSchema,
});
export type BillboardActionNode = z.infer<typeof BillboardActionSchema>;

export const BillboardNodeSchema = z.object({
  type: z.literal("billboard"),
  bind: BindingSchema,
  label: z.string().min(1).max(60).optional(),
  size: z.enum(["card", "hero", "banner"]).default("card"),
  autoplay: z.boolean().default(true),
  item_key_field: z.string(),
  item_title_field: z.string(),
  item_subtitle_field: z.string().optional(),
  item_eyebrow_field: z.string().optional(),
  item_art_field: z.string().optional(),
  primary: BillboardActionSchema,
  secondary: z.array(BillboardActionSchema).max(2).optional(),
  hide_when_empty: z.boolean().default(false),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type BillboardNode = z.infer<typeof BillboardNodeSchema>;

export const PLAYER_FIELDS = ["id", "src", "title", "subtitle", "poster", "chapters", "captions", "thumbnails", "position", "completed", "up_next", "description", "facts", "lyrics", "timed_lyrics"] as const;

export const PlayerNodeSchema = z.object({
  type: z.literal("player"),
  bind: BindingSchema,
  kind: z.enum(["video", "audio"]).default("video"),
  layout: z.enum(["video", "audio", "mini"]).optional(),
  lyrics_enabled: z.boolean().optional(),
  // MUSIC-KIT-01
  art_spring: z.boolean().optional(),
  lyrics_blur: z.boolean().optional(),
  lyrics_empty_text: z.string().optional(),
  on_lyrics_open: ActionSchema.optional(),
  autoplay_next: z.boolean().default(false),
  fields: z.object(Object.fromEntries(PLAYER_FIELDS.map((f) => [f, z.string().min(1).optional()])) as Record<(typeof PLAYER_FIELDS)[number], z.ZodOptional<z.ZodString>>).strict().optional(),
  on_progress: ActionSchema.optional(),
  on_next: ActionSchema.optional(),
  // MEDIA-POLISH-01: the title block and the actions row under the picture.
  details: z.boolean().default(false),
  details_show: z.array(z.enum(["title", "facts", "description", "chapters"])).default(["title", "facts", "description", "chapters"]).refine((items) => new Set(items).size === items.length, "details_show items must be unique").optional(),
  actions: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        icon: z.string().optional(),
        field: z.string().min(1).optional(),
        on_label: z.string().min(1).max(40).optional(),
        busy_label: z.string().min(1).max(40).optional(),
        action: ActionSchema,
      }),
    )
    .max(6)
    .optional(),
  // The actions row wraps onto more lines instead of scrolling sideways (a narrow column or a phone).
  actions_wrap: z.boolean().optional(),
  edit: z.object({
    label: z.string().min(1), title: z.string().optional(),
    fields: z.array(z.object({ name: z.string().min(1), label: z.string().min(1), kind: z.enum(["text", "textarea", "cover"]) })).min(1),
    visible_field: z.string().optional(), on_save: z.object({ call: z.object({ target: z.string(), method: z.enum(["POST", "PATCH", "DELETE"]).optional(), args: z.record(z.string(), z.unknown()).optional() }) }), cover_choices_field: z.string().optional(), on_upload: z.object({ call: z.object({ target: z.string(), method: z.enum(["POST", "PATCH", "DELETE"]).optional(), args: z.record(z.string(), z.unknown()).optional() }) }).optional(),
  }).optional(),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type PlayerNode = z.infer<typeof PlayerNodeSchema>;
export type PlayerActionNode = NonNullable<PlayerNode["actions"]>[number];

export const ReaderNodeSchema = z.object({
  type: z.literal("reader"),
  bind: BindingSchema,
  format: z.enum(["epub", "pdf"]).optional(),
  theme: z.enum(["paper", "sepia", "night"]).optional(),
  font_size: z.number().int().min(0).max(6).optional(),
  fields: z.object({
    id: z.string().min(1).optional(), src: z.string().min(1).optional(), title: z.string().min(1).optional(),
    format: z.string().min(1).optional(), locator: z.string().min(1).optional(),
  }).strict().optional(),
  on_locator: ActionSchema.optional(),
  on_close: ActionSchema.optional(),
  empty_state: EmptyStateNodeSchema.optional(),
}).strict();
export type ReaderNode = z.infer<typeof ReaderNodeSchema>;

export const DetailPaneNodeSchema: z.ZodType<DetailPaneNode> = z.lazy(() =>
  z.object({
    type: z.literal("detail_pane"),
    title: z.string(),
    subtitle: z.string().optional(),
    body: z.array(UiNodeSchema).min(1),
  }),
);
export interface DetailPaneNode {
  type: "detail_pane";
  title: string;
  subtitle?: string;
  body: UiNode[];
}

// MEDIA-POLISH-01: two forms, list and detail (an index beside one item) or main and aside (a player with Up next).
export const SplitViewNodeSchema: z.ZodType<SplitViewNode> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal("split_view"),
      list: z.union([ListNodeSchema, CardGridNodeSchema]),
      detail: DetailPaneNodeSchema,
    }),
    z.object({
      type: z.literal("split_view"),
      main: z.array(UiNodeSchema).min(1),
      aside: z.array(UiNodeSchema).min(1),
      aside_label: z.string().min(1).max(60).optional(),
      aside_sheet: z.literal("phone").optional(),
      aside_side: z.enum(["start", "end"]).optional(),
      aside_width: z.enum(["default", "wide"]).optional(),
      main_surface: z.enum(["page", "stage"]).optional(),
    }),
  ]),
);
export type SplitViewNode =
  | { type: "split_view"; list: ListNode | CardGridNode; detail: DetailPaneNode }
  | { type: "split_view"; main: UiNode[]; aside: UiNode[]; aside_label?: string; aside_sheet?: "phone"; aside_side?: "start" | "end"; aside_width?: "default" | "wide"; main_surface?: "page" | "stage" };

export const WidgetCardNodeSchema = z.object({
  type: z.literal("widget_card"),
  bind: BindingSchema,
});
export type WidgetCardNode = z.infer<typeof WidgetCardNodeSchema>;

export const WidgetRowNodeSchema = z.object({
  type: z.literal("widget_row"),
  bind: BindingSchema,
});
export type WidgetRowNode = z.infer<typeof WidgetRowNodeSchema>;

// APP-KIND-01/02: the two nodes a package app adds. Both bind to a package data call.
export const PackageBindingSchema = BindingSchema.refine((b) => b.source === "package", "a package node binds source package");

/** WEATHER-FIX-01: what a package page says when its data call cannot draw blocks for a stated reason, in the page's
 * own words: the call needs the person to choose something (`needs_place`), the source is unreachable (`down`) or too
 * slow (`timed_out`). Each button is one of: go to a screen of this app (`navigate`), ask the browser for the device
 * location and write it to the page state `locate.state` (`locate`), or ask again (`retry`). */
export const DataStateSchema = z.object({
  icon: z.string().optional(),
  title: z.string().min(1).max(60).optional(),
  text: z.string().min(1).max(300),
  actions: z
    .array(
      z.union([
        z.object({ label: z.string().min(1).max(40), icon: z.string().optional(), navigate: z.object({ to: z.string().min(1) }).strict() }).strict(),
        z.object({ label: z.string().min(1).max(40), icon: z.string().optional(), locate: z.object({ state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40) }).strict() }).strict(),
        z.object({ label: z.string().min(1).max(40), icon: z.string().optional(), retry: z.literal(true) }).strict(),
      ]),
    )
    .max(3)
    .optional(),
}).strict();
export type DataState = z.infer<typeof DataStateSchema>;

export const AnswerBlocksNodeSchema = z.object({
  type: z.literal("answer_blocks"),
  bind: PackageBindingSchema,
  kinds: z.array(z.string()).min(1).optional(),
  filter_state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40).optional(),
  empty_state: EmptyStateNodeSchema.optional(),
  states: z.object({ needs_place: DataStateSchema, down: DataStateSchema, timed_out: DataStateSchema }).partial().strict().optional(),
  actions: z
    .object({
      open: ActionSchema,
      open_channel: ActionSchema,
      save: ActionSchema,
      follow: ActionSchema,
      feedback: ActionSchema,
      summarize: ActionSchema,
      reset_mix: ActionSchema,
      listen: ActionSchema,
      discuss: ActionSchema,
    })
    .partial()
    .strict()
    .optional(),
});
export type AnswerBlocksNode = z.infer<typeof AnswerBlocksNodeSchema>;

export const PickerNodeSchema = z.object({
  type: z.literal("picker"),
  variant: z.enum(["select", "pill"]).optional(),
  state: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  bind: PackageBindingSchema.optional(),
  item_key_field: z.string().optional(),
  item_label_field: z.string().optional(),
  leading: z
    .array(
      z.object({
        value: z.string().min(1),
        label: z.string().min(1),
        icon: z.string().optional(),
        needs: z.literal("geolocation").optional(),
      }),
    )
    .optional(),
});
export type PickerNode = z.infer<typeof PickerNodeSchema>;

/** NEWS-LOOK-02: a search field that writes page state and fires `submit` with `{q}`; recents are bound rows. */
export const SearchNodeSchema = z.object({
  type: z.literal("search"),
  state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40).optional(),
  label: z.string().min(1).max(40).optional(),
  placeholder: z.string().min(1).max(60).optional(),
  recents: PackageBindingSchema.optional(),
  item_key_field: z.string().optional(),
  item_label_field: z.string().optional(),
  submit: ActionSchema.optional(),
  clear_recents: ActionSchema.optional(),
});
export type SearchNode = z.infer<typeof SearchNodeSchema>;

/** VIDEO-CREATE-01: a prompt box with chips, an optional tier segment and one Make button; `submit` fires once with every chosen value. */
export const PromptBarNodeSchema = z.object({
  type: z.literal("prompt_bar"),
  label: z.string().min(1).max(40),
  placeholder: z.string().min(1).max(120).optional(),
  prompt_state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40).optional(),
  max_length: z.number().int().min(1).max(4000).optional(),
  chips: z
    .array(
      z.object({
        state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40),
        label: z.string().min(1).max(40),
        options: z
          .array(
            z.object({
              value: z.union([z.string(), z.number()]),
              label: z.string().min(1).max(40),
              media: z.string().min(1).max(200).regex(/^(?!.*\.\.)[A-Za-z0-9_][A-Za-z0-9_./-]*$/).optional(),
            }),
          )
          .min(1)
          .max(24),
        variant: z.enum(["dropdown", "cards"]).optional(),
        default: z.union([z.string(), z.number()]).optional(),
        presentation: z.enum(["inline", "popover"]).optional(),
        group: z.string().min(1).max(24).optional(),
        fold: z.boolean().optional(),
        trigger: z.enum(["default", "banner"]).optional(),
        popover_size: z.enum(["default", "wide"]).optional(),
      }),
    )
    .max(6)
    .optional(),
  references: z
    .array(
      z.object({
        state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40),
        label: z.string().min(1).max(40),
        kind: z.enum(["picture", "character", "place", "audio", "video"]),
        placement: z.enum(["row", "in_field", "tile"]).optional(),
        hint: z.string().min(1).max(80).optional(),
      }),
    )
    .max(6)
    .optional(),
  tier: z
    .object({
      presentation: z.enum(["segment", "cards"]).optional(),
      state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40),
      label: z.string().min(1).max(40).optional(),
      default: z.enum(["standard", "boost", "max"]).optional(),
      tiers: z
        .array(
          z.object({
            id: z.enum(["standard", "boost", "max"]),
            label: z.string().min(1).max(24),
            hint: z.string().max(80).optional(),
            disabled_reason: z.string().max(120).optional(),
            confirm: z.string().max(200).optional(),
          }),
        )
        .min(1)
        .max(3),
    })
    .optional(),
  submit_label: z.string().min(1).max(24).optional(),
  placement: z.enum(["inline", "panel"]).optional(),
  field_size: z.enum(["default", "large"]).optional(),
  suggestions: z.array(z.object({ label: z.string().min(1).max(40), text: z.string().min(1).max(300) })).max(4).optional(),
  submit_detail: z.object({ state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40), placement: z.enum(["below", "in_button"]).optional(), labels: z.record(z.string(), z.string().min(1).max(80)) }).optional(),
  starts: z.enum(["picture", "video"]).optional(),
  submit: ActionSchema,
});
export type PromptBarNode = z.infer<typeof PromptBarNodeSchema>;

// MUSIC-KIT-01: the music page blocks (ui/src/primitives/MusicBlocks.tsx) as nodes (spec/ui/schema.json).
export const QuickTilesNodeSchema = z.object({
  type: z.literal("quick_tiles"),
  bind: BindingSchema,
  label: z.string().min(1).max(60),
  item_key_field: z.string(),
  item_label_field: z.string(),
  item_media_field: z.string(),
  max: z.number().int().min(1).max(12).optional(),
  on_select: ActionSchema.optional(),
  on_play: ActionSchema.optional(),
  play_label: z.string().min(1).max(80).optional(),
  hide_when_empty: z.boolean().default(false),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type QuickTilesNode = z.infer<typeof QuickTilesNodeSchema>;

export const TopResultNodeSchema = z.object({
  type: z.literal("top_result"),
  bind: BindingSchema,
  item_label_field: z.string(),
  item_eyebrow_field: z.string().optional(),
  item_subtitle_field: z.string().optional(),
  item_media_field: z.string().optional(),
  art_shape: z.enum(["default", "circle"]).optional(),
  on_select: ActionSchema.optional(),
  on_play: ActionSchema.optional(),
  play_label: z.string().min(1).max(80).optional(),
  hide_when_empty: z.boolean().default(false),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type TopResultNode = z.infer<typeof TopResultNodeSchema>;

export const CategoryTilesNodeSchema = z.object({
  type: z.literal("category_tiles"),
  bind: BindingSchema,
  label: z.string().min(1).max(60),
  item_key_field: z.string(),
  item_label_field: z.string(),
  item_color_field: z.string().optional(),
  item_media_field: z.string().optional(),
  on_select: ActionSchema.optional(),
  hide_when_empty: z.boolean().default(false),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type CategoryTilesNode = z.infer<typeof CategoryTilesNodeSchema>;

export const TrackRowsNodeSchema = z.object({
  type: z.literal("track_rows"),
  bind: BindingSchema,
  label: z.string().min(1).max(60),
  item_key_field: z.string(),
  item_label_field: z.string(),
  item_subtitle_field: z.string().optional(),
  item_number_field: z.string().optional(),
  item_meta_field: z.string().optional(),
  item_group_field: z.string().optional(),
  item_highlight_field: z.string().optional(),
  on_play: ActionSchema,
  play_label: z.string().min(1).max(80).optional(),
  row_actions: z.array(z.object({
    icon: z.string().min(1),
    label: z.string().min(1),
    action: ActionSchema,
  }).strict()).max(2).optional(),
  hide_when_empty: z.boolean().default(false),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type TrackRowsNode = z.infer<typeof TrackRowsNodeSchema>;

/** VIDEO-UI-04 (K9, K10): the result feed. Mirrors spec/ui/schema.json `result_feed`; `starts` is the K8 marker. */
const FeedStartsSchema = z.enum(["picture", "video"]);
export const FeedHandlerSchema = z
  .object({
    starts: FeedStartsSchema.optional(),
    navigate: z.object({ to: z.string(), state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }).optional(),
    call: z
      .object({
        target: z.string(),
        method: z.enum(["POST", "PATCH", "DELETE"]).default("POST"),
        args: z.record(z.string(), z.unknown()).optional(),
        then: z.object({ navigate: z.object({ to: z.string(), state: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional() }) }).optional(),
      })
      .optional(),
    confirm: z.object({ prompt: z.string(), on_confirm: ActionSchema }).optional(),
  })
  .strict()
  .refine((h) => [h.navigate, h.call, h.confirm].filter((v) => v !== undefined).length === 1, "exactly one of navigate, call, confirm");
export type FeedHandler = z.infer<typeof FeedHandlerSchema>;
export const FEED_HANDLER_KEYS = ["stop", "retry", "make_another", "render", "another_still", "edit_words", "favorite"] as const;
export type FeedHandlerKey = (typeof FEED_HANDLER_KEYS)[number];

export const ResultFeedNodeSchema = z.object({
  type: z.literal("result_feed"),
  bind: BindingSchema,
  fields: z
    .object({
      key: z.string().optional(),
      words: z.string(),
      tags: z.string().optional(),
      references: z.string().optional(),
      status: z.string(),
      progress: z.string().optional(),
      phase: z.string().optional(),
      queue_position: z.string().optional(),
      started_at: z.string().optional(),
      error: z.string().optional(),
      poster: z.string().optional(),
      src: z.string().optional(),
      favorite: z.string().optional(),
      created_at: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
    })
    .strict(),
  filters: z
    .array(
      z.object({
        kind: z.enum(["toggle", "select"]),
        state: z.string().regex(/^[a-z][a-z0-9_]*$/).max(40),
        label: z.string().min(1).max(40),
        options: z.array(z.object({ value: z.string(), label: z.string().min(1).max(40) }).strict()).min(2).max(8).optional(),
        group: z.boolean().default(false),
      }).strict(),
    )
    .max(4)
    .optional(),
  handlers: z
    .object({
      stop: FeedHandlerSchema.optional(),
      retry: FeedHandlerSchema.optional(),
      make_another: FeedHandlerSchema.optional(),
      render: FeedHandlerSchema.optional(),
      another_still: FeedHandlerSchema.optional(),
      edit_words: FeedHandlerSchema.optional(),
      favorite: FeedHandlerSchema.optional(),
    })
    .strict()
    .optional(),
  actions: z
    .array(
      z.object({
        label: z.string().min(1).max(40),
        icon: z.string().optional(),
        starts: FeedStartsSchema.optional(),
        when: z.array(z.enum(["draft", "ready", "failed", "cancelled"])).min(1).optional(),
        action: ActionSchema,
      }).strict(),
    )
    .max(4)
    .optional(),
  actions_variant: z.enum(["default", "icons"]).default("default"),
  actions_inline: z.number().int().min(1).max(8).optional(),
  // VIDEO-UI-14: the media-first feed and the one View button for the filters.
  look: z.enum(["default", "media"]).default("default"),
  filters_presentation: z.enum(["inline", "popover"]).default("inline"),
  poll_while: z
    .object({
      statuses: z.array(z.enum(["queued", "generating"])).min(1),
      record: z.object({ path: z.string().regex(/^[a-z][a-z0-9-]*$/).max(40), params: z.record(z.string(), z.unknown()).optional() }).strict(),
    })
    .strict(),
  empty_state: EmptyStateNodeSchema.optional(),
});
export type ResultFeedNode = z.infer<typeof ResultFeedNodeSchema>;

export const SectionNodeSchema: z.ZodType<SectionNode> = z.lazy(() =>
  z.object({
    type: z.literal("section"),
    heading: z.string().optional(),
    condition: z.string().optional(),
    children: z.array(UiNodeSchema).min(1),
  }),
);
export interface SectionNode {
  type: "section";
  heading?: string;
  condition?: string;
  children: UiNode[];
}

export const PageNodeSchema: z.ZodType<PageNode> = z.lazy(() =>
  z.object({
    type: z.literal("page"),
    id: z.string().min(1),
    title: z.string().min(1),
    tone: z.enum(["default", "cinema"]).default("default"),
    body: z.array(UiNodeSchema).min(1),
  }),
);
export interface PageNode {
  type: "page";
  id: string;
  title: string;
  /** Deprecated: ignored; every page follows the selected theme. */
  tone?: "default" | "cinema";
  body: UiNode[];
}

export const TabsNodeSchema: z.ZodType<TabsNode> = z.lazy(() =>
  z.object({
    type: z.literal("tabs"),
    state: z.string().min(1).optional(),
    tabs: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), body: z.array(UiNodeSchema).min(1) })).min(2),
  }),
);
export interface TabsNode {
  type: "tabs";
  state?: string;
  tabs: Array<{ id: string; label: string; body: UiNode[] }>;
}

export type UiNode =
  | PageNode
  | SectionNode
  | MessageThreadNode
  | SettingsEditorNode
  | FormNode
  | EmptyStateNode
  | ProgressNode
  | CreationHeaderNode
  | ListNode
  | CardGridNode
  | MediaShelfNode
  | BillboardNode
  | PlayerNode
  | ReaderNode
  | DetailPaneNode
  | SplitViewNode
  | WidgetCardNode
  | WidgetRowNode
  | AnswerBlocksNode
  | PickerNode
  | SearchNode
  | PromptBarNode
  | QuickTilesNode
  | TopResultNode
  | CategoryTilesNode
  | TrackRowsNode
  | ResultFeedNode
  | TabsNode;

export const UiNodeSchema: z.ZodType<UiNode> = z.lazy(() =>
  z.union([
    PageNodeSchema,
    SectionNodeSchema,
    MessageThreadNodeSchema,
    SettingsEditorNodeSchema,
    FormNodeSchema,
    EmptyStateNodeSchema,
    ProgressNodeSchema,
    CreationHeaderNodeSchema,
    ListNodeSchema,
    CardGridNodeSchema,
    MediaShelfNodeSchema,
    BillboardNodeSchema,
    PlayerNodeSchema,
    ReaderNodeSchema,
    DetailPaneNodeSchema,
    SplitViewNodeSchema,
    WidgetCardNodeSchema,
    WidgetRowNodeSchema,
    AnswerBlocksNodeSchema,
    PickerNodeSchema,
    SearchNodeSchema,
    PromptBarNodeSchema,
    QuickTilesNodeSchema,
    TopResultNodeSchema,
    CategoryTilesNodeSchema,
    TrackRowsNodeSchema,
    ResultFeedNodeSchema,
    TabsNodeSchema,
  ]),
);

/** Every node `type` the schema declares - the catalog.test.ts agreement
 * test walks this list and checks the catalog has a renderer for each. */
export const NODE_TYPES = [
  "page",
  "section",
  "message_thread",
  "settings_editor",
  "form",
  "empty_state",
  "progress",
  "creation_header",
  "list",
  "card_grid",
  "media_shelf",
  "billboard",
  "player",
  "reader",
  "detail_pane",
  "split_view",
  "widget_card",
  "widget_row",
  "answer_blocks",
  "picker",
  "search",
  "tabs",
  "prompt_bar",
  "quick_tiles",
  "top_result",
  "category_tiles",
  "track_rows",
  "result_feed",
] as const;
