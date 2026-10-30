import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  reservationExpiryMinutes: parseInt(process.env.RESERVATION_EXPIRY_MINUTES || '5', 10),
  expiryCleanupIntervalSeconds: parseInt(process.env.EXPIRY_CLEANUP_INTERVAL_SECONDS || '10', 10),
} as const;
