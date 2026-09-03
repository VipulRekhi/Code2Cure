/**
 * Safe Demo User & Patient Seed Script (Phase 3 JavaScript ESM)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding safe development database records...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Patient User
  const patientUser = await prisma.user.upsert({
    where: { email: 'patient@medikiosk.local' },
    update: {},
    create: {
      email: 'patient@medikiosk.local',
      passwordHash,
      role: 'PATIENT',
      patient: {
        create: {
          patientIdentifier: 'DEMO-PAT-001',
          firstName: 'Aarav',
          lastName: 'Sharma',
          phone: '+919876543210',
          preferredLanguage: 'MR',
        },
      },
    },
  });
  console.log('[Seed] Patient user ready:', patientUser.email);

  // 2. Doctor User
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@medikiosk.local' },
    update: {},
    create: {
      email: 'doctor@medikiosk.local',
      passwordHash,
      role: 'DOCTOR',
      doctor: {
        create: {
          name: 'Dr. Priya Kulkarni',
          specialization: 'General Medicine',
        },
      },
    },
  });
  console.log('[Seed] Doctor user ready:', doctorUser.email);

  // 3. Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@medikiosk.local' },
    update: {},
    create: {
      email: 'admin@medikiosk.local',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('[Seed] Admin user ready:', adminUser.email);

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
