const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

let pgPool = null;
let sqliteDb = null;
let activeEngine = 'postgres'; // 'postgres' or 'sqlite'

// Initialize SQLite database file in backend directory
const sqliteFilePath = path.join(__dirname, '../../hospital_blood_bank.sqlite');

function getActiveEngine() {
  return activeEngine;
}

// Convert PostgreSQL $1, $2 parameter placeholders to SQLite ? placeholders
function pgToSqliteQuery(sql) {
  let paramIndex = 1;
  let converted = sql.replace(/\$\d+/g, () => '?');
  // Replace ILIKE with LIKE for SQLite
  converted = converted.replace(/\bILIKE\b/gi, 'LIKE');
  // Replace JSONB with TEXT
  converted = converted.replace(/\bJSONB\b/gi, 'TEXT');
  // Replace UUID DEFAULT uuid_generate_v4() with TEXT
  converted = converted.replace(/UUID PRIMARY KEY DEFAULT uuid_generate_v4\(\)/gi, 'TEXT PRIMARY KEY');
  // Replace DATE/TIMESTAMP WITH TIME ZONE
  converted = converted.replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME');
  return converted;
}

async function initDatabase() {
  // 1. Try connecting to PostgreSQL first
  try {
    const testPool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 3000,
      max: 10
    });

    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    pgPool = testPool;
    activeEngine = 'postgres';
    console.log('✅ Connected to PostgreSQL database successfully.');

    // Run PostgreSQL table migrations
    const schemaPath = path.join(__dirname, '../../../database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pgPool.query(schemaSql);
      console.log('✅ PostgreSQL Schema initialized.');
    }
    return;
  } catch (pgError) {
    if (!config.USE_SQLITE_FALLBACK) {
      console.error('❌ Failed to connect to PostgreSQL and fallback is disabled:', pgError.message);
      throw pgError;
    }
    console.warn('⚠️ PostgreSQL not reachable (' + pgError.message + '). Falling back to self-contained SQLite database for seamless development/testing.');
  }

  // 2. Initialize SQLite Fallback
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(sqliteFilePath, async (err) => {
      if (err) {
        console.error('❌ Could not initialize SQLite fallback:', err);
        return reject(err);
      }
      activeEngine = 'sqlite';
      console.log(`✅ Initialized SQLite fallback storage at: ${sqliteFilePath}`);

      // Create SQLite tables matching PostgreSQL schema
      const sqliteInitSql = `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'staff',
          two_factor_secret TEXT,
          two_factor_enabled INTEGER DEFAULT 0,
          two_factor_temp_secret TEXT,
          is_active INTEGER DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS donors (
          id TEXT PRIMARY KEY,
          full_name TEXT NOT NULL,
          phone TEXT UNIQUE NOT NULL,
          email TEXT UNIQUE NOT NULL,
          blood_group TEXT NOT NULL,
          gender TEXT,
          age INTEGER,
          address TEXT,
          camp_location TEXT,
          last_donation_date TEXT NOT NULL,
          next_eligible_date TEXT NOT NULL,
          source_of_entry TEXT DEFAULT 'Manual Entry',
          entered_by_staff_id TEXT,
          entered_by_staff_name TEXT,
          total_donations_count INTEGER DEFAULT 1,
          last_reminder_sent_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS donation_history (
          id TEXT PRIMARY KEY,
          donor_id TEXT NOT NULL,
          donation_date TEXT NOT NULL,
          camp_location TEXT,
          units_donated REAL DEFAULT 1.0,
          source TEXT DEFAULT 'Manual Entry',
          entered_by_staff_id TEXT,
          entered_by_staff_name TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS notification_logs (
          id TEXT PRIMARY KEY,
          donor_id TEXT,
          donor_name TEXT,
          channel TEXT NOT NULL,
          recipient TEXT NOT NULL,
          template_type TEXT NOT NULL,
          status TEXT NOT NULL,
          provider TEXT DEFAULT 'mock',
          response_payload TEXT,
          error_message TEXT,
          sent_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          user_email TEXT,
          action TEXT NOT NULL,
          resource_type TEXT,
          resource_id TEXT,
          ip_address TEXT,
          user_agent TEXT,
          details TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_donors_phone ON donors(phone);
        CREATE INDEX IF NOT EXISTS idx_donors_email ON donors(email);
        CREATE INDEX IF NOT EXISTS idx_donors_next_eligible ON donors(next_eligible_date);
        CREATE INDEX IF NOT EXISTS idx_donors_blood_group ON donors(blood_group);
      `;

      sqliteDb.exec(sqliteInitSql, (initErr) => {
        if (initErr) {
          console.error('Error creating SQLite tables:', initErr);
          return reject(initErr);
        }
        resolve();
      });
    });
  });
}

/**
 * Universal query runner supporting PostgreSQL & SQLite with parameterized values
 * @param {string} sqlText PostgreSQL-style SQL query (using $1, $2, etc.)
 * @param {Array} params Array of parameter values
 */
async function query(sqlText, params = []) {
  if (activeEngine === 'postgres' && pgPool) {
    const res = await pgPool.query(sqlText, params);
    return res;
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    if (!sqliteDb) {
      return reject(new Error('Database not initialized'));
    }

    const sqliteSql = pgToSqliteQuery(sqlText);
    const trimmed = sqlText.trim().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.includes('RETURNING')) {
      // If query has RETURNING clause in SQLite
      if (trimmed.includes('RETURNING')) {
        // Strip RETURNING for SQLite execute then query back if needed
        // For unified compatibility, we can run all() or run()
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      } else {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows: rows || [], rowCount: (rows || []).length });
        });
      }
    } else {
      sqliteDb.run(sqliteSql, params, function (err) {
        if (err) return reject(err);
        resolve({
          rows: [],
          rowCount: this.changes,
          lastID: this.lastID
        });
      });
    }
  });
}

module.exports = {
  initDatabase,
  query,
  getActiveEngine
};
