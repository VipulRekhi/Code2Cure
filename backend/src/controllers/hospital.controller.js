/**
 * Hospital & Department Controller — MediKiosk (Phase 10)
 * Provides active facilities, departments, and doctor directories for patient kiosk routing.
 */

import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const hospitalController = {
  /**
   * GET /api/hospitals
   */
  async getHospitals(req, res, next) {
    try {
      const hospitals = await prisma.hospital.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        include: {
          departments: {
            where: { isActive: true },
            select: {
              id: true,
              code: true,
              name: true,
              opdType: true,
              roomNumber: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: hospitals,
        count: hospitals.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/hospitals/:hospitalId/departments
   */
  async getDepartments(req, res, next) {
    try {
      const { hospitalId } = req.params;

      const hospital = await prisma.hospital.findUnique({
        where: { id: hospitalId },
      });

      if (!hospital) {
        throw new AppError(404, 'Hospital facility not found', 'HOSPITAL_NOT_FOUND');
      }

      const departments = await prisma.department.findMany({
        where: { hospitalId, isActive: true },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: departments,
        hospital: {
          id: hospital.id,
          name: hospital.name,
          code: hospital.code,
        },
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/departments/:departmentId/doctors
   */
  async getDoctors(req, res, next) {
    try {
      const { departmentId } = req.params;

      const department = await prisma.department.findUnique({
        where: { id: departmentId },
        include: { hospital: true },
      });

      if (!department) {
        throw new AppError(404, 'Department not found', 'DEPARTMENT_NOT_FOUND');
      }

      const doctors = await prisma.doctor.findMany({
        where: { departmentId, isActive: true },
        select: {
          id: true,
          name: true,
          specialization: true,
          qualification: true,
          registrationNo: true,
          roomNumber: true,
        },
        orderBy: { name: 'asc' },
      });

      res.status(200).json({
        success: true,
        data: doctors,
        department: {
          id: department.id,
          name: department.name,
          code: department.code,
          opdType: department.opdType,
          roomNumber: department.roomNumber,
          hospitalName: department.hospital.name,
        },
      });
    } catch (error) {
      next(error);
    }
  },
};
