import { app } from './app.js';
import { config } from './config/env.js';
import { prisma } from './config/prisma.js';

async function startServer() {
  try {
    // Verify database connection via Prisma
    await prisma.$connect();
    console.log('[Database] PostgreSQL / Supabase connected successfully via Prisma.');

    const server = app.listen(config.port, () => {
      console.log(`[Server] MediKiosk API server running on port ${config.port} in ${config.env} mode.`);
      console.log(`[Health] Check health at http://localhost:${config.port}/api/health`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal) => {
      console.log(`\n[Server] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        console.log('[Database] Disconnected from Prisma.');
        console.log('[Server] Process terminated.');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('[Server] Forcefully shutting down after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

startServer();
