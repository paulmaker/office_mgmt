-- CreateEnum
CREATE TYPE "TimesheetRateType" AS ENUM ('HOURLY', 'DAILY');

-- AlterTable
ALTER TABLE "Timesheet" ADD COLUMN "rateType" "TimesheetRateType" NOT NULL DEFAULT 'HOURLY',
ADD COLUMN "daysWorked" DOUBLE PRECISION;
