import { defineConfig } from "@lingui/cli"

// I18N-K1. The kit's own catalogs: ids start with `ui.` so a Home string can never shadow one. `en-GB` holds only what
// differs and falls through to `en-US`; `es` falls through to `en-US`, so an untranslated id shows in English, never as a key.
// The locale list and chains are declared once, in src/kitLocales.ts.
import { KIT_FALLBACKS, KIT_LOCALES } from "./src/kitLocales"

export default defineConfig({
  locales: [...KIT_LOCALES],
  sourceLocale: "en-US",
  fallbackLocales: KIT_FALLBACKS,
  compileNamespace: "ts",
  catalogs: [{ path: "<rootDir>/locales/{locale}/messages", include: ["<rootDir>/src"], exclude: ["**/*.test.*"] }],
})
