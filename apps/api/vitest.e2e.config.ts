import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

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
  // CRITICAL: NestJS uses `emitDecoratorMetadata` to wire constructor
  // dependencies via TypeScript's compiler. Vitest's default esbuild
  // transformer drops this metadata (esbuild doesn't run the TS
  // typechecker), so every `@Injectable() constructor(private readonly
  // prisma: PrismaService)` would receive `undefined`. We swap to SWC
  // with decorators + metadata emit turned on, which is the only
  // way DI works in Vitest for NestJS projects.
  plugins: [
    swc.vite({
      module: { type: "es6" },
      jsc: {
        target: "es2022",
        parser: { syntax: "typescript", decorators: true },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        keepClassNames: true,
      },
    }),
  ],
  resolve: {
    alias: { "~": new URL("./src/", import.meta.url).pathname },
  },
});
