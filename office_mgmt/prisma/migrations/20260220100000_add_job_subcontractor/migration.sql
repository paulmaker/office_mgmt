-- CreateTable: JobSubcontractor (join table for Job <-> Subcontractor many-to-many)
-- Idempotent so it works when table is missing (production) or already exists (e.g. dev).
CREATE TABLE IF NOT EXISTS "JobSubcontractor" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "subcontractorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobSubcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS supported in PostgreSQL 9.5+)
CREATE UNIQUE INDEX IF NOT EXISTS "JobSubcontractor_jobId_subcontractorId_key" ON "JobSubcontractor"("jobId", "subcontractorId");
CREATE INDEX IF NOT EXISTS "JobSubcontractor_jobId_idx" ON "JobSubcontractor"("jobId");
CREATE INDEX IF NOT EXISTS "JobSubcontractor_subcontractorId_idx" ON "JobSubcontractor"("subcontractorId");

-- AddForeignKey (ignore if constraint already exists)
DO $$ BEGIN
  ALTER TABLE "JobSubcontractor" ADD CONSTRAINT "JobSubcontractor_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "JobSubcontractor" ADD CONSTRAINT "JobSubcontractor_subcontractorId_fkey" FOREIGN KEY ("subcontractorId") REFERENCES "Subcontractor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
