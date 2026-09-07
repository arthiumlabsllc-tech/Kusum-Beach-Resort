import app from './app';
import { config } from './config';
import logger from './lib/logger';
import prisma from './lib/prisma';

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected successfully');

    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 Kusum Beach API server running on port ${config.port}`);
      logger.info(`📍 Environment: ${config.nodeEnv}`);
      logger.info(`🌐 API prefix: ${config.apiPrefix}`);
      logger.info(`🏥 Health check: http://localhost:${config.port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
