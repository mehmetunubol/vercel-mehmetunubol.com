import nextPlugin from "@next/eslint-plugin-next";
import { baseConfig } from "./eslint.config.js";

/**
 * Shared ESLint flat config for Next.js apps in the monorepo.
 * Layers the Next.js plugin (core-web-vitals) on top of the shared base so
 * every app lints against one consistent ruleset.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nextConfig = [
  ...baseConfig,
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default nextConfig;
