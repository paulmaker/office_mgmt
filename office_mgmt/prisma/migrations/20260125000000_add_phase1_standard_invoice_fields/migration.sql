-- AlterTable: Add Phase 1 standard invoice fields
-- Phase 1: Critical Standard Fields for generic system

-- Date tracking
ALTER TABLE "Invoice" ADD COLUMN "sentDate" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "receivedDate" TIMESTAMP(3);

-- Job linking
ALTER TABLE "Invoice" ADD COLUMN "jobId" TEXT;

-- Discount fields
ALTER TABLE "Invoice" ADD COLUMN "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "discountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "discountType" TEXT;

-- Payment tracking
ALTER TABLE "Invoice" ADD COLUMN "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "outstandingAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN "paymentReference" TEXT;

-- References
ALTER TABLE "Invoice" ADD COLUMN "purchaseOrderNumber" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "scheme" TEXT;

-- Description
ALTER TABLE "Invoice" ADD COLUMN "description" TEXT;

-- Add foreign key for jobId
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add indexes for performance
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- AlterTable: Add job balance tracking
ALTER TABLE "Job" ADD COLUMN "balance" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD COLUMN "lastBalanceUpdate" TIMESTAMP(3);
