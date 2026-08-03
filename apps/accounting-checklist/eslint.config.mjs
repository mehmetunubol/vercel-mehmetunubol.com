import { defineConfig, globalIgnores } from "eslint/config";
import nextConfig from "@repo/config/eslint/next";

// Consume the shared Next.js flat config from packages/config so every app
// lints against one consistent baseline (see .cursorrules).
const eslintConfig = defineConfig([
  ...nextConfig,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
