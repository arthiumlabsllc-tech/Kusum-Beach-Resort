import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  apiPrefix: process.env.API_PREFIX || '/api/v1',

  // Database
  databaseUrl: process.env.DATABASE_URL || '',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // MTN MoMo
  mtnMomoBaseUrl: process.env.MTN_MOMO_BASE_URL || 'https://sandbox.momodeveloper.mtn.com',
  mtnMomoSubscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
  mtnMomoPrimaryKey: process.env.MTN_MOMO_PRIMARY_KEY || '',

  // Vodafone Cash
  vodafoneApiUrl: process.env.VODAFONE_API_URL || '',
  vodafoneApiKey: process.env.VODAFONE_API_KEY || '',

  // Breet (Crypto)
  breetApiUrl: process.env.BREET_API_URL || '',
  breetApiKey: process.env.BREET_API_KEY || '',

  // Africa's Talking (SMS)
  africastalkingApiKey: process.env.AFRICASTALKING_API_KEY || '',
  africastalkingUsername: process.env.AFRICASTALKING_USERNAME || 'sandbox',
  africastalkingShortcode: process.env.AFRICASTALKING_SHORTCODE || '',

  // Email (SMTP)
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  emailFrom: process.env.EMAIL_FROM || 'noreply@kusumbeach.com',

  // File Upload
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),

  // Redis
  redisUrl: process.env.REDIS_URL || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
};
