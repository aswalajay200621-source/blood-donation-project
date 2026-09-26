require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/hospital_blood_bank',
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: parseInt(process.env.PG_PORT || '5432', 10),
  PG_USER: process.env.PG_USER || 'postgres',
  PG_PASSWORD: process.env.PG_PASSWORD || 'postgres',
  PG_DATABASE: process.env.PG_DATABASE || 'hospital_blood_bank',
  USE_SQLITE_FALLBACK: process.env.USE_SQLITE_FALLBACK !== 'false',

  // JWT
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_secret_hospital_access_token_key_change_in_prod',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_secret_hospital_refresh_token_key_change_in_prod',
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // 2FA
  TWO_FACTOR_APP_NAME: process.env.TWO_FACTOR_APP_NAME || 'HospitalBloodBank',

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10),
  LOGIN_RATE_LIMIT_MAX: parseInt(process.env.LOGIN_RATE_LIMIT_MAX || '100', 10), // 100 attempts in dev; override via env in prod
  LOGIN_RATE_LIMIT_WINDOW_MS: parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '900000', 10),

  // Email
  EMAIL_ENABLED: process.env.EMAIL_ENABLED === 'true',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.hospital.med',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || '"Apex Hospital Blood Center" <donations@hospital.med>',

  // WhatsApp
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'mock',
  WHATSAPP_ENABLED: process.env.WHATSAPP_ENABLED !== 'false',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY || 'mock_key',
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || '109283746592817',
  WHATSAPP_TEMPLATE_3MONTH: process.env.WHATSAPP_TEMPLATE_3MONTH || 'donor_eligibility_reminder_v1',
  WHATSAPP_TEMPLATE_THANKYOU: process.env.WHATSAPP_TEMPLATE_THANKYOU || 'donor_appreciation_receipt_v1'
};
