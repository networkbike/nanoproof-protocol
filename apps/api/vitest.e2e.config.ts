import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.e2e.spec.ts"],
    setupFiles: ["test/setup-e2e.ts"],
    testTimeout: 20_000,
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
  },
  resolve: {
    alias: { "~": new URL("./src/", import.meta.url).pathname },
  },
});
