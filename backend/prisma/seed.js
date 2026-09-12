/**
 * Safe Demo User, Hospital, Department, Doctor, Patient & Encounter Seed Script
 * Phase 10: Connected Institutional Framework (ESM)
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding safe institutional database records...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Hospital: District Civil Hospital, Pune
  const hospital = await prisma.hospital.upsert({
    where: { code: 'HOSP-PUNE-01' },
    update: {
      name: 'District Civil Hospital, Pune',
      location: 'Aundh, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      isActive: true,
    },
    create: {
      code: 'HOSP-PUNE-01',
      name: 'District Civil Hospital, Pune',
      location: 'Aundh, Pune',
      city: 'Pune',
      state: 'Maharashtra',
      isActive: true,
    },
  });
  console.log('[Seed] Hospital ready:', hospital.name);

  // 2. Departments
  const generalDept = await prisma.department.upsert({
    where: {
      hospitalId_code: {
        hospitalId: hospital.id,
        code: 'GEN-MED-01',
      },
    },
    update: {
      name: 'General Medicine',
      opdType: 'GENERAL',
      roomNumber: 'OPD Room 3',
      isActive: true,
    },
    create: {
      hospitalId: hospital.id,
      code: 'GEN-MED-01',
      name: 'General Medicine',
      opdType: 'GENERAL',
      roomNumber: 'OPD Room 3',
      isActive: true,
    },
  });

  const ayushDept = await prisma.department.upsert({
    where: {
      hospitalId_code: {
        hospitalId: hospital.id,
        code: 'AYU-KAYA-01',
      },
    },
    update: {
      name: 'Ayurvedic OPD / Kayachikitsa',
      opdType: 'AYUSH',
      roomNumber: 'OPD Room 7',
      isActive: true,
    },
    create: {
      hospitalId: hospital.id,
      code: 'AYU-KAYA-01',
      name: 'Ayurvedic OPD / Kayachikitsa',
      opdType: 'AYUSH',
      roomNumber: 'OPD Room 7',
      isActive: true,
    },
  });

  const orthoDept = await prisma.department.upsert({
    where: {
      hospitalId_code: {
        hospitalId: hospital.id,
        code: 'ORTHO-01',
      },
    },
    update: {
      name: 'Orthopaedics OPD',
      opdType: 'SPECIALTY',
      roomNumber: 'OPD Room 12',
      isActive: true,
    },
    create: {
      hospitalId: hospital.id,
      code: 'ORTHO-01',
      name: 'Orthopaedics OPD',
      opdType: 'SPECIALTY',
      roomNumber: 'OPD Room 12',
      isActive: true,
    },
  });

  const pediatricsDept = await prisma.department.upsert({
    where: {
      hospitalId_code: {
        hospitalId: hospital.id,
        code: 'PEDI-01',
      },
    },
    update: {
      name: 'Pediatrics OPD',
      opdType: 'SPECIALTY',
      roomNumber: 'OPD Room 5',
      isActive: true,
    },
    create: {
      hospitalId: hospital.id,
      code: 'PEDI-01',
      name: 'Pediatrics OPD',
      opdType: 'SPECIALTY',
      roomNumber: 'OPD Room 5',
      isActive: true,
    },
  });
  console.log('[Seed] Departments ready: General Medicine, AYUSH, Orthopaedics, Pediatrics');

  // 3. Doctor 1: Dr. Priya Deshmukh (General Medicine)
  const doctorUser1 = await prisma.user.upsert({
    where: { email: 'doctor@medikiosk.local' },
    update: {},
    create: {
      email: 'doctor@medikiosk.local',
      passwordHash,
      role: 'DOCTOR',
    },
  });

  const doctor1 = await prisma.doctor.upsert({
    where: { userId: doctorUser1.id },
    update: {
      hospitalId: hospital.id,
      departmentId: generalDept.id,
      name: 'Dr. Priya Deshmukh',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      registrationNo: 'MMC-2018-0914',
      roomNumber: 'OPD Room 3',
      isActive: true,
    },
    create: {
      userId: doctorUser1.id,
      hospitalId: hospital.id,
      departmentId: generalDept.id,
      name: 'Dr. Priya Deshmukh',
      specialization: 'General Medicine',
      qualification: 'MBBS, MD (General Medicine)',
      registrationNo: 'MMC-2018-0914',
      roomNumber: 'OPD Room 3',
      isActive: true,
    },
  });
  console.log('[Seed] Doctor 1 ready:', doctor1.name);

  // 4. Doctor 2: Dr. Rajesh Joshi (AYUSH / Kayachikitsa)
  const doctorUser2 = await prisma.user.upsert({
    where: { email: 'ayush.doctor@medikiosk.local' },
    update: {},
    create: {
      email: 'ayush.doctor@medikiosk.local',
      passwordHash,
      role: 'DOCTOR',
    },
  });

  const doctor2 = await prisma.doctor.upsert({
    where: { userId: doctorUser2.id },
    update: {
      hospitalId: hospital.id,
      departmentId: ayushDept.id,
      name: 'Dr. Rajesh Joshi',
      specialization: 'Kayachikitsa / Ayurveda',
      qualification: 'BAMS, MD (Ayurveda - Kayachikitsa)',
      registrationNo: 'BCAM-2015-4421',
      roomNumber: 'OPD Room 7',
      isActive: true,
    },
    create: {
      userId: doctorUser2.id,
      hospitalId: hospital.id,
      departmentId: ayushDept.id,
      name: 'Dr. Rajesh Joshi',
      specialization: 'Kayachikitsa / Ayurveda',
      qualification: 'BAMS, MD (Ayurveda - Kayachikitsa)',
      registrationNo: 'BCAM-2015-4421',
      roomNumber: 'OPD Room 7',
      isActive: true,
    },
  });
  console.log('[Seed] Doctor 2 ready:', doctor2.name);

  // 5. Admin User
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

  // 6. Demo Seed Patient 1 (Aarav Sharma - General Medicine Case)
  const demoPatient1 = await prisma.patient.upsert({
    where: { patientIdentifier: 'DEMO-PAT-001' },
    update: {
      fullName: 'Aarav Sharma',
      ageYears: 42,
      gender: 'MALE',
      hospitalUhid: 'UHID-2026-001',
      phone: '+919876543210',
      preferredLanguage: 'MR',
    },
    create: {
      patientIdentifier: 'DEMO-PAT-001',
      firstName: 'Aarav',
      lastName: 'Sharma',
      fullName: 'Aarav Sharma',
      dateOfBirth: new Date('1984-05-15'),
      ageYears: 42,
      gender: 'MALE',
      phone: '+919876543210',
      hospitalUhid: 'UHID-2026-001',
      preferredLanguage: 'MR',
      medicalHistory: ['Hypertension', 'Type 2 Diabetes'],
      surgicalHistory: ['Appendectomy (2018)'],
      familyHistory: 'Father had heart disease',
    },
  });

  // 7. Demo Encounter 1
  const demoEncounter1 = await prisma.encounter.upsert({
    where: { id: 'demo-enc-gm-001' },
    update: {},
    create: {
      id: 'demo-enc-gm-001',
      patientId: demoPatient1.id,
      hospitalId: hospital.id,
      departmentId: generalDept.id,
      attendingDoctorId: doctor1.id,
      tokenNumber: 'GM-001',
      opdMode: 'GENERAL',
      visitType: 'WALK_IN',
      status: 'WAITING',
      triageTier: 'NORMAL',
    },
  });
  console.log('[Seed] Demo Patient & Encounter ready:', demoEncounter1.tokenNumber);

  console.log('[Seed] Institutional seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
