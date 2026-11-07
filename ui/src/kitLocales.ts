/* I18N-K1. The locales the kit has catalogs for and the chain each one falls through, declared once. lingui.config.ts,
 * i18n.ts and the tests read this file. Home's own list (frontend/src/supportedLocales.ts) must match it. */
export const KIT_LOCALES = ["en-US", "en-GB", "es"] as const
export type KitLocale = (typeof KIT_LOCALES)[number]

export const KIT_FALLBACKS: Record<string, string> = { "en-GB": "en-US", es: "en-US" }

/** The locale itself, then each fallback, nearest first. A locale the kit does not know (or a child or teen mode locale such as `es-x-child`) resolves through its base language. */
export function kitChain(locale: string): KitLocale[] {
  const base = locale.replace(/-x-(child|teen)$/, "")
  const known = (KIT_LOCALES as readonly string[]).includes(base) ? (base as KitLocale) : base.startsWith("es") ? "es" : base.startsWith("en-GB") ? "en-GB" : "en-US"
  const chain: KitLocale[] = [known]
  for (let next = KIT_FALLBACKS[known]; next; next = KIT_FALLBACKS[next]) chain.push(next as KitLocale)
  return chain
}
