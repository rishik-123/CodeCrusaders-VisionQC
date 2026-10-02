import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const databasePath = path.join(__dirname, "visionqc.db");

if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const db = new Database(databasePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// USERS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL COLLATE NOCASE UNIQUE,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// SESSION TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expired_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_expired
  ON sessions(expired_at);
`);

// PRODUCTS TABLE
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    product_id TEXT NOT NULL,
    manufacturer TEXT,
    description TEXT,
    material TEXT,
    length REAL,
    width REAL,
    height REAL,
    dimension_unit TEXT NOT NULL DEFAULT 'mm',
    product_color TEXT,
    user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, product_id)
  );

  CREATE INDEX IF NOT EXISTS idx_products_user_created
  ON products(user_id, created_at DESC);
`);

// Persistent, user-scoped AI Copilot conversations.
db.exec(`
  CREATE TABLE IF NOT EXISTS copilot_conversations (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT,
    product_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_copilot_conversations_user_updated
    ON copilot_conversations(user_id, updated_at DESC);

  CREATE TABLE IF NOT EXISTS copilot_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES copilot_conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_copilot_messages_conversation_created
    ON copilot_messages(conversation_id, created_at, id);
`);

console.log("==================================================");
console.log("[SQLite] Connected to database:");
console.log(databasePath);
console.log("[SQLite] Users table initialized");
console.log("[SQLite] Sessions table initialized");
console.log("[SQLite] Products table initialized");
console.log("[SQLite] Copilot conversation tables initialized");
console.log("==================================================");

export { db };
export default db;
