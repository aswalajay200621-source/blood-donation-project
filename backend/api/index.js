/**
 * ============================================================================
 * File: backend/api/index.js
 * Purpose: Vercel Serverless Function Entrypoint
 * ----------------------------------------------------------------------------
 * Description:
 * Exports the Express app instance wrapped with lazy database initialization.
 * When deployed as a Vercel Serverless Function, this handler initializes
 * the database connection pool on the first warm request and services all
 * incoming API traffic.
 * ============================================================================
 */

const app = require('../src/app');
const { initDatabase } = require('../src/db/db');

let isInitialized = false;
let initPromise = null;

module.exports = async (req, res) => {
  // Ensure database pool is connected before handling any requests
  if (!isInitialized) {
    if (!initPromise) {
      initPromise = initDatabase()
        .then(() => {
          isInitialized = true;
        })
        .catch((err) => {
          console.error('❌ Failed to initialize database in Vercel serverless function:', err);
          initPromise = null; // Reset to allow retry on subsequent requests
          throw err;
        });
    }
    await initPromise;
  }

  // Forward request to Express application
  return app(req, res);
};
