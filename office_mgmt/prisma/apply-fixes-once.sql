-- Run this once per database (e.g. production) to fix JobSubcontractor missing table and Invoice default drift.
-- Safe to run multiple times (idempotent). Does not delete or change existing data.

-- 1. Create JobSubcontractor table if missing (fixes "JobSubcontractor does not exist" on job create)
CREATE TABLE IF NOT EXISTS "JobSubcontractor" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobSubcontractor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JobSubcontractor_jobId_subcontractorId_key" ON "JobSubcontractor"("jobId", "subcontractorId");
CREATE INDEX IF NOT EXISTS "JobSubcontractor_jobId_idx" ON "JobSubcontractor"("jobId");
CREATE INDEX IF NOT EXISTS "JobSubcontractor_subcontractorId_idx" ON "JobSubcontractor"("subcontractorId");
DO $$ BEGIN
  ALTER TABLE "JobSubcontractor" ADD CONSTRAINT "JobSubcontractor_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JobSubcontractor" ADD CONSTRAINT "JobSubcontractor_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Align Invoice.outstandingAmount with schema (drop default only; existing data unchanged)
ALTER TABLE "Invoice" ALTER COLUMN "outstandingAmount" DROP DEFAULT;
