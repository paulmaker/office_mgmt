-- Remove address from Job (was added in 20260208000000_add_job_address)
ALTER TABLE "Job" DROP COLUMN IF EXISTS "address";

-- Add address to JobLineItem
ALTER TABLE "JobLineItem" ADD COLUMN "address" TEXT;
