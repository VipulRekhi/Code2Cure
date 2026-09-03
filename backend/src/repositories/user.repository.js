import { prisma } from '../config/prisma.js';

export const userRepository = {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      include: {
        patient: true,
        doctor: true,
      },
    });
  },

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        patient: true,
        doctor: true,
      },
    });
  },

  async create(data) {
    const { email, passwordHash, role, patient, doctor } = data;

    return prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        ...(patient && {
          patient: {
            create: {
              patientIdentifier: `PAT-${Date.now().toString().slice(-6)}`,
              firstName: patient.firstName,
              lastName: patient.lastName,
              phone: patient.phone,
              dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth) : null,
              preferredLanguage: patient.preferredLanguage || 'HI',
            },
          },
        }),
        ...(doctor && {
          doctor: {
            create: {
              name: doctor.name,
              specialization: doctor.specialization,
            },
          },
        }),
      },
      include: {
        patient: true,
        doctor: true,
      },
    });
  },
};
