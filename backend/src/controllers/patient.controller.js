/**
 * Patient Controller — MediKiosk (Phase 10)
 * Persistent patient onboarding, identity lookup, and demographic management.
 * Supports autonomous walk-in registration without requiring web user accounts.
 */

import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

export const patientController = {
  /**
   * POST /api/patients
   * Registers a new persistent patient or updates an existing record.
   */
  async registerOrUpdatePatient(req, res, next) {
    try {
      const {
        id = null,
        firstName,
        lastName,
        fullName,
        dateOfBirth,
        ageYears,
        gender = 'OTHER',
        phone,
        abhaId,
        abhaAddress,
        hospitalUhid,
        address,
        preferredLanguage = 'HI',
        medicalHistory,
        surgicalHistory,
        familyHistory,
        personalHistory,
      } = req.body;

      // Extract / derive clean names
      let fName = (firstName || '').trim();
      let lName = (lastName || '').trim();
      let full = (fullName || '').trim();

      if (!full && (fName || lName)) {
        full = `${fName} ${lName}`.trim();
      } else if (full && (!fName || !lName)) {
        const parts = full.split(' ');
        fName = parts[0] || 'Patient';
        lName = parts.slice(1).join(' ') || '';
      }

      if (!fName) {
        fName = 'Patient';
      }

      // Check for existing patient if matching identifiers provided
      let existing = null;
      if (id) {
        existing = await prisma.patient.findUnique({ where: { id } });
      } else if (hospitalUhid) {
        existing = await prisma.patient.findUnique({ where: { hospitalUhid } });
      } else if (abhaId) {
        existing = await prisma.patient.findUnique({ where: { abhaId } });
      } else if (phone) {
        existing = await prisma.patient.findFirst({ where: { phone } });
      }

      let patientRecord;

      if (existing) {
        // Update existing patient profile
        patientRecord = await prisma.patient.update({
          where: { id: existing.id },
          data: {
            firstName: fName || existing.firstName,
            lastName: lName || existing.lastName,
            fullName: full || existing.fullName,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
            ageYears: ageYears !== undefined ? (ageYears ? parseInt(ageYears, 10) : null) : existing.ageYears,
            gender: gender || existing.gender,
            phone: phone || existing.phone,
            abhaId: abhaId || existing.abhaId,
            abhaAddress: abhaAddress || existing.abhaAddress,
            hospitalUhid: hospitalUhid || existing.hospitalUhid,
            address: address || existing.address,
            preferredLanguage: preferredLanguage || existing.preferredLanguage,
            medicalHistory: medicalHistory !== undefined ? medicalHistory : existing.medicalHistory,
            surgicalHistory: surgicalHistory !== undefined ? surgicalHistory : existing.surgicalHistory,
            familyHistory: familyHistory !== undefined ? familyHistory : existing.familyHistory,
            personalHistory: personalHistory !== undefined ? personalHistory : existing.personalHistory,
          },
        });
      } else {
        // Create new persistent patient
        const newIdentifier = `PAT-${Date.now().toString().slice(-6)}`;
        patientRecord = await prisma.patient.create({
          data: {
            patientIdentifier: newIdentifier,
            firstName: fName,
            lastName: lName,
            fullName: full,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            ageYears: ageYears ? parseInt(ageYears, 10) : null,
            gender,
            phone: phone || null,
            abhaId: abhaId || null,
            abhaAddress: abhaAddress || null,
            hospitalUhid: hospitalUhid || null,
            address: address || null,
            preferredLanguage,
            medicalHistory: medicalHistory || null,
            surgicalHistory: surgicalHistory || null,
            familyHistory: familyHistory || null,
            personalHistory: personalHistory || null,
          },
        });
      }

      res.status(existing ? 200 : 201).json({
        success: true,
        data: {
          ...patientRecord,
          patientCode: patientRecord.patientIdentifier,
        },
        isNew: !existing,
        message: existing ? 'Patient record updated successfully' : 'New patient registered successfully',
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/patients/search?q=...
   * Look up patient by phone number, hospital UHID, ABHA ID, patientIdentifier, or Name.
   */
  async searchPatients(req, res, next) {
    try {
      const { q } = req.query;

      if (!q || !q.trim()) {
        return res.status(200).json({
          success: true,
          data: [],
          total: 0,
        });
      }

      const queryStr = q.trim();

      const patients = await prisma.patient.findMany({
        where: {
          OR: [
            { phone: { contains: queryStr } },
            { hospitalUhid: { equals: queryStr, mode: 'insensitive' } },
            { abhaId: { equals: queryStr, mode: 'insensitive' } },
            { patientIdentifier: { equals: queryStr, mode: 'insensitive' } },
            { fullName: { contains: queryStr, mode: 'insensitive' } },
            { firstName: { contains: queryStr, mode: 'insensitive' } },
            { lastName: { contains: queryStr, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          encounters: {
            take: 3,
            orderBy: { createdAt: 'desc' },
            include: {
              department: true,
              attendingDoctor: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: patients.map((p) => ({ ...p, patientCode: p.patientIdentifier })),
        total: patients.length,
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/patients/:id
   */
  async getPatientById(req, res, next) {
    try {
      const { id } = req.params;

      const patient = await prisma.patient.findUnique({
        where: { id },
        include: {
          encounters: {
            orderBy: { createdAt: 'desc' },
            include: {
              department: true,
              attendingDoctor: true,
              clinicalSessions: {
                select: {
                  id: true,
                  status: true,
                  language: true,
                  opdMode: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!patient) {
        throw new AppError(404, 'Patient not found', 'PATIENT_NOT_FOUND');
      }

      res.status(200).json({
        success: true,
        data: patient,
      });
    } catch (error) {
      next(error);
    }
  },
};
