import { Pool } from "pg";
import { DATABASE_URL } from "../config.js";

// Parsed into discrete fields ourselves rather than passed as `connectionString` —
// pg's own connection-string parser has a known issue ("SASL:
// SCRAM-SERVER-FIRST-MESSAGE: client password must be a string") under concurrent
// pool connection setup, which real CI runs with concurrent tests actually hit.
// Discrete fields sidestep that parser entirely.
const url = new URL(DATABASE_URL);

export const pool = new Pool({
  host: url.hostname,
  port: url.port ? Number(url.port) : 5432,
  // Empty username/password (e.g. local "postgres://localhost/dvod_dev", trust
  // auth via the OS user) must become `undefined`, not "" — an explicit empty
  // string user/password is a different (and wrong) thing to pg than "not set".
  user: url.username ? decodeURIComponent(url.username) : undefined,
  password: url.password ? decodeURIComponent(url.password) : undefined,
  database: url.pathname.replace(/^\//, ""),
});
