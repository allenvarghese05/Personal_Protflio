import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // The WebGL scenes (react-three-fiber) build random geometry once in
  // useMemo and mutate three.js objects every frame. That is how R3F is meant
  // to be used, but the React Compiler rules read it as impure render code.
  {
    files: ["src/components/intro/**", "src/components/scene/**"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // local tooling: editor worktrees (full checkouts with their own builds)
    ".claude/**",
  ]),
]);

export default eslintConfig;
