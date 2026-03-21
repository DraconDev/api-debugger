import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
    setupFiles: [resolve(__dirname, "tests/vitest-setup.ts")],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
