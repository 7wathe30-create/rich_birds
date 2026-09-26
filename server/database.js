import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export function createDatabase(
  dbPath = process.env.DATABASE_PATH || "data/rich-birds.sqlite",
) {
  const path = resolve(dbPath);
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      address TEXT PRIMARY KEY COLLATE NOCASE,
      nickname TEXT NOT NULL,
      avatar_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS auth_challenges (
      nonce TEXT PRIMARY KEY,
      address TEXT NOT NULL COLLATE NOCASE,
      chain_id INTEGER NOT NULL,
      origin TEXT NOT NULL,
      message TEXT NOT NULL,
      challenge_token_hash TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_challenges_expiry_idx ON auth_challenges(expires_at);
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      address TEXT NOT NULL COLLATE NOCASE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS auth_sessions_expiry_idx ON auth_sessions(expires_at);
  `);
  db.prepare(
    "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(1, ?)",
  ).run(new Date().toISOString());
  const challengeColumns = db
    .prepare("PRAGMA table_info(auth_challenges)")
    .all();
  if (!challengeColumns.some(({ name }) => name === "challenge_token_hash")) {
    db.exec("ALTER TABLE auth_challenges ADD COLUMN challenge_token_hash TEXT");
  }
  db.prepare(
    "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES(2, ?)",
  ).run(new Date().toISOString());
  return db;
}
