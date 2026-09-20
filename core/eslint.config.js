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
            { name: "../../home", message: "core imports no product" },
            { name: "../../stack", message: "core imports no product" },
          ],
        },
      ],
    },
  },
];
