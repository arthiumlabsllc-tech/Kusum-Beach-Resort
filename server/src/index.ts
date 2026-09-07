import app from './app';
import { config } from './config';
import logger from './lib/logger';
import prisma from './lib/prisma';

async function main() {
  try {
    console.log('Starting Kusum Beach API server...');
    console.log('DATABASE_URL:', config.databaseUrl ? config.databaseUrl.substring(0, 30) + '...' : 'NOT SET');
    
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Start server
    app.listen(config.port, () => {
      console.log(`Kusum Beach API server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
      console.log(`API prefix: ${config.apiPrefix}`);
    });
  } catch (error) {
    console.error('FAILED TO START SERVER:', error);
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
