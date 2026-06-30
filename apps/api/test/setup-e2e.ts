// Vitest e2e setup — hits a real Postgres test DB.
// Run order: docker compose up + `pnpm --filter @nanoproof/api db:migrate -- --schema-name public`,
//            then `pnpm --filter @nanoproof/api test:e2e`.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/nanoproof_test";
