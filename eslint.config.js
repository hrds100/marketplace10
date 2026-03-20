import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "dist",
      // shadcn/ui generated components — not hand-written, exclude from linting
      "src/components/ui/**",
      // Legacy app (JSX without TS, causes parse errors)
      "legacy/**",
      // Supabase edge functions (Deno runtime, different TS context)
      "supabase/functions/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Legacy any usage in Supabase query handlers — tracked as tech debt, not blocking
      "@typescript-eslint/no-explicit-any": "warn",
      // Empty object types appear in generated/extended interfaces — warn only
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
);
