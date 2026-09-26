const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const donorRoutes = require('./routes/donorRoutes');
const excelRoutes = require('./routes/excelRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const auditRoutes = require('./routes/auditRoutes');

const app = express();

// 1. Security HTTP Headers with Helmet
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

// 2. Strict CORS Configuration
const allowedOrigins = [
  config.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000'
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
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

// 3. Body Parsing with Safe Payload Limits (Prevent Large Payload DoS)
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// 4. Rate Limiter for general endpoints
app.use('/api/', apiLimiter);

// 5. Health Check Endpoint
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

// 6. Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/excel', excelRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);

// 7. 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Resource not found: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND'
  });
});

// 8. Centralized Global Error Handler
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
