-- AlterTable: Add additionalHours and additionalHoursRate to Timesheet
ALTER TABLE "Timesheet" ADD COLUMN "additionalHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Timesheet" ADD COLUMN "additionalHoursRate" DOUBLE PRECISION NOT NULL DEFAULT 0;
