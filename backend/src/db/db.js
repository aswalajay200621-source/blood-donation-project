/**
 * ============================================================================
 * File: backend/src/db/db.js
 * Purpose: Database Abstraction Layer — PostgreSQL & SQLite Dual-Engine Support
 * ----------------------------------------------------------------------------
 * Description:
 * This module provides a unified database interface that supports both
 * PostgreSQL (production) and SQLite (development fallback) databases.
 *
 * How It Works:
 * 1. On startup, attempts to connect to PostgreSQL using the DATABASE_URL.
 * 2. If PostgreSQL is unreachable, automatically falls back to a local SQLite
 *    file (`hospital_blood_bank.sqlite`) for zero-dependency development.
 * 3. Exports a single `query(sql, params)` function that transparently handles
 *    the differences between both engines (syntax conversion, parameterization).
 *
 * Tables Managed:
 * - `users`             — Clinical staff accounts and authentication credentials
 * - `donors`            — Registered blood donors with eligibility metadata
 * - `donation_history`  — Historical record of every donation event per donor
 * - `notification_logs` — Delivery logs for WhatsApp/Email reminder dispatches
 * - `audit_logs`        — Security and compliance event audit trail
 * - `system_settings`   — Hospital system configuration key-value store
 * ============================================================================
 */

const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');
let sqlite3 = null;

// Active database connection objects (only one will be used at runtime)
let pgPool = null;
let sqliteDb = null;
let activeEngine = 'postgres'; // Either 'postgres' or 'sqlite'

// Path to the local SQLite fallback database file
const sqliteFilePath = path.join(__dirname, '../../hospital_blood_bank.sqlite');

/**
 * Returns the current active database engine name ('postgres' or 'sqlite')
 */
function getActiveEngine() {
  return activeEngine;
}

/**
 * Converts PostgreSQL positional parameter syntax ($1, $2...) and data types
 * to SQLite-compatible equivalents (?, LIKE, TEXT, DATETIME, etc.)
 *
 * @param {string} sql - Original PostgreSQL SQL string
 * @returns {string} SQLite-compatible SQL string
 */
function pgToSqliteQuery(sql) {
  let converted = sql.replace(/\$\d+/g, () => '?'); // $1 → ?
  converted = converted.replace(/\bILIKE\b/gi, 'LIKE');  // Case-insensitive LIKE
  converted = converted.replace(/\bJSONB\b/gi, 'TEXT');  // JSON type as TEXT
  converted = converted.replace(/UUID PRIMARY KEY DEFAULT uuid_generate_v4\(\)/gi, 'TEXT PRIMARY KEY');
  converted = converted.replace(/TIMESTAMP WITH TIME ZONE/gi, 'DATETIME');
  return converted;
}

/**
 * Initializes the database connection and runs schema migrations.
 * Prefers PostgreSQL and silently falls back to SQLite if unavailable.
 */
async function initDatabase() {
  // === Attempt 1: Connect to PostgreSQL ===
  try {
    const testPool = new Pool({
      connectionString: config.DATABASE_URL,
      connectionTimeoutMillis: 3000,
      max: 10
    });

    const client = await testPool.connect();
    await client.query('SELECT 1'); // Connectivity test
    client.release();
    pgPool = testPool;
    activeEngine = 'postgres';
    console.log('✅ Connected to PostgreSQL database successfully.');

    // Run PostgreSQL schema file to create/migrate tables
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

  // === Attempt 2: Initialize SQLite Fallback ===
  return new Promise((resolve, reject) => {
    try {
      if (!sqlite3) sqlite3 = require('sqlite3').verbose();
    } catch (reqErr) {
      console.error('❌ SQLite3 module not available in this environment:', reqErr.message);
      return reject(reqErr);
    }
    sqliteDb = new sqlite3.Database(sqliteFilePath, async (err) => {
      if (err) {
        console.error('❌ Could not initialize SQLite fallback:', err);
        return reject(err);
      }
      activeEngine = 'sqlite';
      console.log(`✅ Initialized SQLite fallback storage at: ${sqliteFilePath}`);

      // Create all tables in SQLite using equivalent schema definitions
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
 * Universal Parameterized Query Runner
 * Abstracts the differences between PostgreSQL and SQLite query APIs.
 * Always use parameterized values (params array) — never string-interpolate SQL.
 *
 * @param {string} sqlText - PostgreSQL-style SQL (e.g. "SELECT * FROM donors WHERE phone=$1")
 * @param {Array}  params  - Array of parameter values matching positional placeholders
 * @returns {Promise<{rows: Array, rowCount: number}>} Query result rows
 */
async function query(sqlText, params = []) {
  // Route to PostgreSQL if active
  if (activeEngine === 'postgres') {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: config.DATABASE_URL,
        connectionTimeoutMillis: 5000,
        max: 10
      });
    }
    const res = await pgPool.query(sqlText, params);
    return res;
  }

  // Route to SQLite fallback
  return new Promise((resolve, reject) => {
    if (!sqliteDb) {
      return reject(new Error('Database not initialized'));
    }

    // Convert PostgreSQL syntax to SQLite-compatible syntax
    const sqliteSql = pgToSqliteQuery(sqlText);
    const trimmed = sqlText.trim().toUpperCase();

    if (trimmed.startsWith('SELECT') || trimmed.startsWith('WITH') || trimmed.includes('RETURNING')) {
      // SELECT and RETURNING queries — fetch all rows
      sqliteDb.all(sqliteSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: (rows || []).length });
      });
    } else {
      // INSERT / UPDATE / DELETE mutations — use .run()
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
