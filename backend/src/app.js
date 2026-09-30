/**
 * ============================================================================
 * File: backend/src/app.js
 * Purpose: Express Application Configuration & Middleware Pipeline
 * ----------------------------------------------------------------------------
 * Description:
 * Creates and configures the core Express.js HTTP application instance.
 * All cross-cutting concerns (security, CORS, rate limiting, routing)
 * are assembled in this file before the server begins listening for requests.
 *
 * Middleware Layers Applied (in order):
 * 1. Helmet        — Injects secure HTTP security response headers
 * 2. CORS          — Restricts cross-origin access to allowed frontend origins only
 * 3. Body Parsers  — Parses incoming JSON and URL-encoded request bodies (max 5MB)
 * 4. Rate Limiter  — Prevents abuse and DDoS attacks on all /api/* endpoints
 * 5. API Routes    — Maps route modules to /api/* path prefixes
 * 6. 404 Handler   — Returns structured error for unknown routes
 * 7. Global Error  — Catches and formats all unhandled Express errors
 * ============================================================================
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route module imports — each handles a specific clinical domain
const authRoutes = require('./routes/authRoutes');           // Login, 2FA, JWT management
const donorRoutes = require('./routes/donorRoutes');         // Donor CRUD, eligibility, reminders
const excelRoutes = require('./routes/excelRoutes');         // Excel import preview & commit
const notificationRoutes = require('./routes/notificationRoutes'); // Reminder dispatch & logs
const dashboardRoutes = require('./routes/dashboardRoutes'); // Blood stock metrics
const settingsRoutes = require('./routes/settingsRoutes');   // System config & cron triggers
const auditRoutes = require('./routes/auditRoutes');         // Security audit event logs

const app = express();

// ============================================================
// 1. Security HTTP Headers — Helmet Middleware
// ============================================================
// Helmet automatically sets headers like X-Frame-Options, X-XSS-Protection,
// Content-Security-Policy to defend against common web attacks
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", config.FRONTEND_URL, "http://localhost:5173", "http://localhost:5000"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

// ============================================================
// 2. CORS — Cross-Origin Resource Sharing Policy
// ============================================================
// Restricts API access to only pre-registered frontend origins
const allowedOrigins = [
  config.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no Origin header (e.g. server-to-server, curl, mobile)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
        return callback(null, true);
      }
      return callback(new Error('CORS blocked: Origin not allowed by hospital security policy.'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  })
);

// ============================================================
// 3. Body Parsing Middleware
// ============================================================
// Limits request body size to 5MB to prevent large payload denial-of-service attacks
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ============================================================
// 4. Rate Limiter — Throttle API abuse attempts
// ============================================================
// Applies rate limiting to all API routes (e.g. max 100 req / 15 min per IP)
app.use('/api/', apiLimiter);

// ============================================================
// 5. Health Check Endpoint — Used by monitoring tools & probes
// ============================================================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Hospital Blood Bank API',
    security: {
      rateLimiting: 'active',
      twoFactorAuth: 'enforced',
      cors: 'restricted',
      parameterizedQueries: 'enforced'
    }
  });
});

// ============================================================
// 6. API Route Mounts — Domain-Specific Route Registration
// ============================================================
app.use('/api/auth', authRoutes);               // Authentication & 2FA endpoints
app.use('/api/donors', donorRoutes);            // Donor management endpoints
app.use('/api/excel', excelRoutes);             // Excel migration endpoints
app.use('/api/notifications', notificationRoutes); // Reminder channel endpoints
app.use('/api/dashboard', dashboardRoutes);     // Clinical overview metrics
app.use('/api/settings', settingsRoutes);       // Hospital system configuration
app.use('/api/audit', auditRoutes);             // Security audit log endpoints

// ============================================================
// 7. 404 Catch-All — Unknown Route Responses
// ============================================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// ============================================================
// 8. Centralized Error Handler — Catches all unhandled Express errors
// ============================================================
// Shows full stack traces in development, redacts them in production
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const isDev = config.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : 'An internal hospital server error occurred. Please contact IT.',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    ...(isDev && { stack: err.stack })
  });
});

module.exports = app;
