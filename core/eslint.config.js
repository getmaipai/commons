import tseslint from "typescript-eslint";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@maipai/home", message: "core imports no product" },
            { name: "@maipai/stack", message: "core imports no product" },
            { name: "@maipai/bot", message: "core imports no product" },
            { name: "@maipai/catalog", message: "core imports no product" },
          ],
          // Glob, not a literal path: a literal `../../home` only ever
          // matches a file exactly two directories below `core/` - any
          // other depth (`core/src/sub/file.ts` importing
          // `../../../home/spec`) would import a product straight past
          // the check this rule exists to enforce.
          patterns: [
            { group: ["**/home/**", "**/home"], message: "core imports no product" },
            { group: ["**/stack/**", "**/stack"], message: "core imports no product" },
          ],
        },
      ],
    },
  },
];
