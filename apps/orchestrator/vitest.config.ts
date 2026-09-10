import { defineConfig } from "vitest/config";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://localhost/dvod_test";

export default defineConfig({
  test: {
    environment: "node",
  },
});
