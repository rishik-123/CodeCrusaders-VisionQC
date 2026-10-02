import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to SQLite database file
const dbPath = path.join(__dirname, 'visionqc.db');

let db;

try {
  // Initialize SQLite database (creates visionqc.db if it doesn't exist)
  db = new Database(dbPath, { verbose: null });
  
  // Enable foreign key constraints
  db.pragma('foreign_keys = ON');

  console.log('==================================================');
  console.log('⚡ [SQLite] Connecting to database at:');
  console.log(`   ${dbPath}`);

  // Connection Testing (Temporary operations)
  runConnectionTest(db);

} catch (error) {
  console.error('❌ [SQLite] Failed to connect to database:', error.message);
  process.exit(1);
}

/**
 * Temporary SQLite connection test using SQLite built-ins.
 * Performs queries and temporary table operations, then drops the temp table.
 */
function runConnectionTest(database) {
  try {
    // 1. Get SQLite version
    const versionRow = database.prepare('SELECT sqlite_version() AS version').get();
    console.log(`✔️  [SQLite] Version: ${versionRow.version}`);

    // 2. Query execution test (1 + 1)
    const mathRow = database.prepare('SELECT 1 + 1 AS result').get();
    console.log(`✔️  [SQLite] Simple Query Test (1 + 1): ${mathRow.result}`);

    // 3. Create a temporary table (not saved to disk schema)
    database.exec(`
      CREATE TEMP TABLE IF NOT EXISTS temp_connection_test (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✔️  [SQLite] Temporary test table created.');

    // 4. Insert sample record
    const insertStmt = database.prepare('INSERT INTO temp_connection_test (message) VALUES (?)');
    const insertResult = insertStmt.run('VisionQC Temporary Connection Test');
    console.log(`✔️  [SQLite] Inserted record ID: ${insertResult.lastInsertRowid}`);

    // 5. Retrieve inserted record
    const selectStmt = database.prepare('SELECT * FROM temp_connection_test WHERE id = ?');
    const retrieved = selectStmt.get(insertResult.lastInsertRowid);
    console.log('✔️  [SQLite] Retrieved record:', retrieved);

    // 6. Drop temporary table
    database.exec('DROP TABLE IF EXISTS temp_connection_test;');
    console.log('✔️  [SQLite] Temporary test table cleaned up successfully.');
    console.log('==================================================');
  } catch (err) {
    console.error('❌ [SQLite] Connection test error:', err.message);
  }
}

export default db;
