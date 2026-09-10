// pg's named ESM export (`import { Pool } from "pg"`) is unreliable across
// versions - it ships as CJS with irregular dual-package `exports`. Default
// import + destructure is the standard-recommended workaround, independent of
// version.
import pg from "pg";
const { Pool } = pg;

import { DATABASE_URL } from "../config.js";

// Parsed into discrete fields ourselves rather than passed as `connectionString` -
// harmless either way, kept for clarity/URL validation.
const url = new URL(DATABASE_URL);

// Parsing into discrete fields (above) drops query params like `sslmode` and
// `channel_binding` - pg's Pool doesn't read them itself, so a hosted Postgres
// that requires SSL (Neon, Supabase, etc.) needs it turned on explicitly here.
const sslMode = url.searchParams.get("sslmode");
const requiresSsl = sslMode === "require" || sslMode === "verify-full" || sslMode === "verify-ca";

export const pool = new Pool({
  host: url.hostname,
  port: url.port ? Number(url.port) : 5432,
  // Empty username/password (e.g. local "postgres://localhost/dvod_dev", trust
  // auth via the OS user) must become `undefined`, not "" - an explicit empty
  // string user/password is a different (and wrong) thing to pg than "not set".
  user: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  database: url.pathname.replace(/^\//, ""),
  // `rejectUnauthorized: true` is fine (not a downgrade) - Neon's certs chain
  // to a publicly trusted CA, unlike a typical self-signed local Postgres.
  ssl: requiresSsl ? { rejectUnauthorized: true } : undefined,
  // node-postgres has a well-documented issue ("SASL: SCRAM-SERVER-FIRST-MESSAGE:
  // client password must be a string") triggered by several concurrent clients
  // establishing SCRAM auth against a Postgres server at once - exactly what a
  // fresh pool serving several near-simultaneous test queries does. Capping the
  // pool at one connection serializes connection setup and avoids the race; our
  // test workload is small enough that this costs nothing meaningful.
  max: 1,
});
