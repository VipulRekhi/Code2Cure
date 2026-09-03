import { prisma } from '../config/prisma.js';

export const healthController = {
  async getHealth(req, res) {
    res.status(200).json({
      success: true,
      data: {
        status: 'ok',
        service: 'medikiosk-api',
        timestamp: new Date().toISOString(),
      },
      message: 'Service is healthy',
    });
  },

  async getDbHealth(req, res, next) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({
        success: true,
        data: {
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
        },
        message: 'Database is healthy and connected',
      });
    } catch (error) {
      next(error);
    }
  },
};
