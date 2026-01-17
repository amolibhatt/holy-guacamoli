import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["server/**/*.test.ts"],
    globals: false,
    environment: "node",
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
