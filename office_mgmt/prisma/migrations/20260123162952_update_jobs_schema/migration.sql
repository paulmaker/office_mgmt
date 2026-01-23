/*
  Warnings:

  - You are about to drop the column `employeeId` on the `Job` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Job" DROP CONSTRAINT "Job_employeeId_fkey";

-- AlterTable
ALTER TABLE "Job" DROP COLUMN "employeeId";

-- CreateTable
CREATE TABLE "JobEmployee" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLineItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobEmployee_jobId_idx" ON "JobEmployee"("jobId");

-- CreateIndex
CREATE INDEX "JobEmployee_employeeId_idx" ON "JobEmployee"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "JobEmployee_jobId_employeeId_key" ON "JobEmployee"("jobId", "employeeId");

-- CreateIndex
CREATE INDEX "JobLineItem_jobId_idx" ON "JobLineItem"("jobId");

-- AddForeignKey
ALTER TABLE "JobEmployee" ADD CONSTRAINT "JobEmployee_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobEmployee" ADD CONSTRAINT "JobEmployee_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLineItem" ADD CONSTRAINT "JobLineItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
