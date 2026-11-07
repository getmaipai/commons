/* I18N-K1. How the kit speaks the person's language. One mechanism: the kit reads Lingui's global `i18n` from
 * `@lingui/core`, which Home also uses (a peer dependency, so both are the same module). Home calls `loadKitCatalog(locale)`
 * once before it activates a locale; after that every kit string follows Home's active locale. With no Home (the
 * kit's showcase, a catalog package's tests) nothing is loaded and no locale is active, and the kit renders its English
 * text from a private English instance, never an error.
 *
 *   import { i18n } from "@/kit/i18n"
 *   i18n._({ id: "ui.Send message", message: "Send message" })           // id = "ui." + the English text
 *   i18n._({ id: "ui.Hello {name}", message: "Hello {name}", values: { name } })
 *
 * Call it while rendering (never in a module-level constant: that freezes the language at load). Kit catalogs live in
 * ui/locales/<locale>/messages.po (compiled to messages.ts beside it); `bun run i18n:extract` and `bun run i18n:compile`. */
import { i18n as lingui, setupI18n, type I18n, type MessageDescriptor } from "@lingui/core"
import { messages as englishMessages } from "../locales/en-US/messages"
import { kitChain, type KitLocale } from "@/kit/kitLocales"

const english = setupI18n({ locale: "en-US", messages: { "en-US": englishMessages } })

export const i18n = {
  /** The translation of a kit message in the active locale; English when no locale is active. */
  _(descriptor: MessageDescriptor): string {
    return (lingui.locale ? lingui : english)._(descriptor)
  },
}

type Catalog = Parameters<I18n["load"]>[1]
const loaders: Record<KitLocale, () => Promise<{ messages: Catalog }>> = {
  "en-US": async () => ({ messages: englishMessages }),
  "en-GB": () => import("../locales/en-GB/messages"),
  es: () => import("../locales/es/messages"),
}

/** Load the kit's catalogs for `locale` (and its fallbacks, nearest last so they win) into Lingui under that same locale id. Call it before `i18n.activate(locale)`. A mode locale such as `es-x-child` loads its base language. Never throws: a failed chunk leaves the kit in English. */
export async function loadKitCatalog(locale: string, instance: I18n = lingui): Promise<void> {
  try {
    const merged: Catalog = {}
    for (const id of [...kitChain(locale)].reverse()) Object.assign(merged, (await loaders[id]()).messages)
    instance.load(locale, merged)
  } catch (error) {
    console.error("[ui] kit catalog load failed; the kit stays in English", error)
  }
}

/** The BCP 47 tag for `Intl` formatters: the active locale (a mode locale such as `es-x-child` reads as `es`), `en-US` when none is active. */
export function kitLocaleTag(): string {
  return (lingui.locale || "en-US").replace(/-x-(child|teen)$/, "")
}
