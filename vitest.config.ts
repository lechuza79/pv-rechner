import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Vitest covers unit tests for pure functions in lib/.
    // Playwright covers browser end-to-end tests in e2e/ — exclude that dir
    // so vitest doesn't try to load Playwright's spec files (different runner).
    include: ["lib/**/*.test.ts", "lib/**/*.test.tsx"],
    exclude: ["e2e/**", "node_modules/**", ".next/**", ".next-dev/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Begründung in test-stubs/server-only.ts: Ohne diesen Ersatz scheitert
      // jeder Test, der ein server-only-Modul mitzieht.
      "server-only": path.resolve(__dirname, "test-stubs/server-only.ts"),
    },
  },
});
