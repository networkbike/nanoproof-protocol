// Vitest unit setup — load env defaults so services that read ConfigModule work.
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.DATABASE_URL ??= "postgresql://postgres:postgres@localhost:5432/nanoproof_test";
