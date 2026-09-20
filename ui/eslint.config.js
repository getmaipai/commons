// The kit's own ESLint gate (docs/UI.md > The kit: "the kit ships the ESLint
// config every repo and catalog CI run: no other component libraries, no
// raw colors, no inline layout outside the primitives, icons only from
// lucide by name"). A consumer extends it as `@maipai/ui/eslint.config.js`
// (the real file path - this package ships no `exports` field, so no
// subpath is ever accidentally blocked for a future consumer).
import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
import betterTailwindcss from "eslint-plugin-better-tailwindcss";
import reactHooks from "eslint-plugin-react-hooks";

// The kit's primitives (src/ui/*) are vendored shadcn-on-Radix: they import
// lucide-react and @radix-ui/* by design, the exact same pattern Home's
// config exempts for `src/kit/ui/**`. The restricted-import rules below are
// for everything that builds on top of the primitives, so src/ui is
// exempted by file override, not by an inline disable.
export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "jsx-a11y": jsxA11y,
      "better-tailwindcss": betterTailwindcss,
      "react-hooks": reactHooks,
    },
    settings: {
      // The kit's token set is declared in src/tokens.css; the Tailwind
      // entry points there so `no-unknown-classes` can resolve kit classes
      // (bg-primary, text-foreground, ...) against it.
      "better-tailwindcss": { entryPoint: "src/tokens.css" },
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Unused-var underscore exemption matches Home's own config (a test
      // mock callback parameter is only asserted on through
      // `mock.calls`, not called by its name).
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // Only the two classic correctness rules (Home's own config takes the
      // same stance): react-hooks@7's "recommended" set is the full
      // React Compiler rule set, which would flag this kit's existing
      // data-fetch shape wholesale.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              message:
                "Icons are lucide, by name: import from @maipai/ui/src/icons (getIcon / icons), never lucide-react directly.",
            },
            {
              name: "radix-ui",
              message:
                "The kit's shadcn primitives (src/ui/*) are the only place @radix-ui/* is imported; consumers compose the kit, not Radix directly.",
            },
            {
              name: "@radix-ui/*",
              message:
                "The kit's shadcn primitives (src/ui/*) are the only place @radix-ui/* is imported; consumers compose the kit, not Radix directly.",
            },
            {
              name: "@mui/*",
              message: "one component library: the kit's shadcn primitives",
            },
            {
              name: "@chakra-ui/*",
              message: "one component library: the kit's shadcn primitives",
            },
            {
              name: "antd",
              message: "one component library: the kit's shadcn primitives",
            },
            {
              name: "@headlessui/*",
              message: "one component library: the kit's shadcn primitives",
            },
            {
              name: "react-bootstrap",
              message: "one component library: the kit's shadcn primitives",
            },
          ],
        },
      ],
      // A JSX `style` attribute with a raw color literal (#, rgb(, hsl(,
      // oklch()): docs/UI.md > Design tokens, "no raw values in packages".
      // Var-driven inline styles (e.g. `var(${hue})`) are legitimate -
      // the tokens.css palette flows through them - so the selector only
      // flags a literal containing one of the four color-syntax markers.
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXAttribute[name.name='style'][value.type='ObjectExpression']:has(> Property[value.value.type='Literal'][value.value.value=/#|rgb\\(|hsl\\(|oklch\\(/])",
          message: "no raw colors: use a token",
        },
      ],
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-conflicting-classes": "error",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: "\\[(#[0-9a-fA-F]{3,8}|rgba?\\(|hsl\\(|oklch\\()",
              message:
                "No raw colors: use a token (docs/UI.md > Design tokens).",
            },
          ],
        },
      ],
    },
  },
  {
    // Vendored shadcn primitives: they import lucide-react and @radix-ui/*
    // by design (the kit owns the primitives; the restricted-import rules
    // target code built on top of them). The icon registry src/icons.ts is
    // the kit's own name -> component layer, so it imports lucide-react by
    // design too.
    files: ["src/ui/**/*.tsx", "src/icons.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    // The @assistant-ui/react wrappers (moved here from Home's own
    // src/kit/assistant-ui at ui-v0.2.0, unchanged except imports):
    // generated/vendored registry code, not hand-authored kit primitives
    // - the same exemption class Home's own pre-adoption config gave this
    // exact directory. `aui-*`/`shimmer` are @assistant-ui/react-markdown's
    // own CSS-module class names (its own stylesheet, not a Tailwind
    // utility, imported directly as `@assistant-ui/react-markdown/styles/
    // dot.css`), tool-fallback/reasoning/tool-group use raw `radix-ui` and
    // `lucide-react` the same way src/ui's own primitives do,
    // thread-list.aui.tsx's autoFocus on its own rename input is
    // intentional (opening a rename immediately puts focus in it), and
    // the remaining a11y-nuance rules are exactly what Home's own
    // pre-adoption config exempted for this same directory (input-group's
    // click-to-focus convenience handler, markdown-text's passthrough
    // heading/anchor renderers).
    files: ["src/assistant-ui/**/*.tsx"],
    rules: {
      "no-restricted-imports": "off",
      "better-tailwindcss/no-unknown-classes": "off",
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-noninteractive-element-interactions": "off",
      "jsx-a11y/heading-has-content": "off",
      "jsx-a11y/anchor-has-content": "off",
    },
  },
];
