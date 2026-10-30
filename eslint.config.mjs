import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// New React hook rules catch existing patterns that should be refactored
// separately. Keep the findings visible without blocking this upgrade.
const legacyHookRules = {
  "react-hooks/static-components": "warn",
  "react-hooks/set-state-in-effect": "warn",
};

const tunedVitals = nextVitals.map((entry) => (
  entry.plugins?.["react-hooks"]
    ? { ...entry, rules: { ...entry.rules, ...legacyHookRules } }
    : entry
));

export default defineConfig([
  ...tunedVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "warn",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
