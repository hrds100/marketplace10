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
  // PR A (crm-v2 rebuild): the new dialer must NOT import any code
  // from the old smsv2 dialer — that's the whole point of the
  // clean-slate rebuild. If we ever accidentally re-import an old
  // module, lint fails before review.
  {
    files: ["src/features/crm-v2/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/features/smsv2/components/dialer/**",
                "@/features/smsv2/components/live-call/**",
                "@/features/smsv2/components/softphone/**",
                "../../smsv2/components/dialer/**",
                "../../smsv2/components/live-call/**",
                "../../smsv2/components/softphone/**",
                "../../../smsv2/components/dialer/**",
                "../../../smsv2/components/live-call/**",
                "../../../smsv2/components/softphone/**",
              ],
              message:
                "crm-v2 must not import from the old smsv2 dialer. The whole point of the rebuild is no shared logic.",
            },
          ],
        },
      ],
    },
  },
);
