-- AlterTable
ALTER TABLE "clinical_sessions" ADD COLUMN     "encounterId" TEXT;

-- AlterTable
ALTER TABLE "doctors" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "hospitalId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "registrationNo" TEXT,
ADD COLUMN     "roomNumber" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "abhaAddress" TEXT,
ADD COLUMN     "abhaId" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "ageYears" INTEGER,
ADD COLUMN     "familyHistory" JSONB,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "hospitalUhid" TEXT,
ADD COLUMN     "medicalHistory" JSONB,
ADD COLUMN     "personalHistory" JSONB,
ADD COLUMN     "phoneNumberHash" TEXT,
ADD COLUMN     "surgicalHistory" JSONB,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "hospitals" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "city" TEXT,
    "state" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "opdType" TEXT NOT NULL DEFAULT 'GENERAL',
    "roomNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "hospitalId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "attendingDoctorId" TEXT,
    "tokenNumber" TEXT NOT NULL,
    "opdMode" TEXT NOT NULL DEFAULT 'GENERAL',
    "visitType" TEXT NOT NULL DEFAULT 'WALK_IN',
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "triageTier" TEXT NOT NULL DEFAULT 'NORMAL',
    "priorityReason" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_notes" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "sessionId" TEXT,
    "doctorId" TEXT NOT NULL,
    "noteText" TEXT NOT NULL,
    "noteType" TEXT NOT NULL DEFAULT 'CLINICAL_NOTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_reviews" (
    "id" TEXT NOT NULL,
    "encounterId" TEXT NOT NULL,
    "sessionId" TEXT,
    "doctorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "comments" TEXT,
    "reviewedHistory" BOOLEAN NOT NULL DEFAULT true,
    "reviewedDocuments" BOOLEAN NOT NULL DEFAULT true,
    "reviewedAyush" BOOLEAN NOT NULL DEFAULT false,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doctor_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_code_key" ON "hospitals"("code");

-- CreateIndex
CREATE INDEX "departments_hospitalId_idx" ON "departments"("hospitalId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospitalId_code_key" ON "departments"("hospitalId", "code");

-- CreateIndex
CREATE INDEX "encounters_patientId_idx" ON "encounters"("patientId");

-- CreateIndex
CREATE INDEX "encounters_hospitalId_idx" ON "encounters"("hospitalId");

-- CreateIndex
CREATE INDEX "encounters_departmentId_idx" ON "encounters"("departmentId");

-- CreateIndex
CREATE INDEX "encounters_attendingDoctorId_idx" ON "encounters"("attendingDoctorId");

-- CreateIndex
CREATE INDEX "encounters_status_idx" ON "encounters"("status");

-- CreateIndex
CREATE INDEX "encounters_tokenNumber_idx" ON "encounters"("tokenNumber");

-- CreateIndex
CREATE INDEX "doctor_notes_encounterId_idx" ON "doctor_notes"("encounterId");

-- CreateIndex
CREATE INDEX "doctor_notes_doctorId_idx" ON "doctor_notes"("doctorId");

-- CreateIndex
CREATE INDEX "doctor_reviews_encounterId_idx" ON "doctor_reviews"("encounterId");

-- CreateIndex
CREATE INDEX "doctor_reviews_doctorId_idx" ON "doctor_reviews"("doctorId");

-- CreateIndex
CREATE INDEX "clinical_sessions_encounterId_idx" ON "clinical_sessions"("encounterId");

-- CreateIndex
CREATE INDEX "doctors_hospitalId_idx" ON "doctors"("hospitalId");

-- CreateIndex
CREATE INDEX "doctors_departmentId_idx" ON "doctors"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_abhaId_key" ON "patients"("abhaId");

-- CreateIndex
CREATE UNIQUE INDEX "patients_abhaAddress_key" ON "patients"("abhaAddress");

-- CreateIndex
CREATE UNIQUE INDEX "patients_hospitalUhid_key" ON "patients"("hospitalUhid");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_phoneNumberHash_idx" ON "patients"("phoneNumberHash");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_hospitalId_fkey" FOREIGN KEY ("hospitalId") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_attendingDoctorId_fkey" FOREIGN KEY ("attendingDoctorId") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_sessions" ADD CONSTRAINT "clinical_sessions_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "encounters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_reviews" ADD CONSTRAINT "doctor_reviews_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE CASCADE;
