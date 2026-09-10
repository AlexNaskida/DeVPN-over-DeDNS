import { defineConfig } from "vitest/config";

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://localhost/dvod_test";

export default defineConfig({
  test: {
    environment: "node",
    // Vitest's default "threads" pool (worker_threads) breaks pg's SASL/SCRAM auth
    // in a real, reproducible way — a plain `tsx` script (e.g. our own migrate.ts)
    // connects to the exact same Postgres fine, but the identical code inside a
    // worker thread fails with a misleading "SASL: SCRAM-SERVER-FIRST-MESSAGE:
    // client password must be a string" error. "forks" runs tests in real child
    // processes instead, which don't have this problem.
    pool: "forks",
    // Belt-and-suspenders on top of "forks": force every test file through a single
    // worker process. Multiple forks each opening a fresh pg connection against the
    // same just-started CI postgres container is a second, process-level version of
    // the same concurrent-SASL-handshake race "max: 1" guards against inside one
    // process — this removes the process-level half of that race too.
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
