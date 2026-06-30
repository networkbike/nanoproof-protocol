import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.spec.ts", "src/**/*.spec.ts"],
    exclude: ["node_modules", "dist", "test/**/*.e2e.spec.ts"],
    setupFiles: ["test/setup.ts"],
    coverage: { reporter: ["text", "html"], include: ["src/**/*.ts"] },
    pool: "forks",
  },
  resolve: {
    alias: { "~": new URL("./src/", import.meta.url).pathname },
  },
});
