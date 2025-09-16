import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Prevent loading project PostCSS config during tests
  css: {
    postcss: {},
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
