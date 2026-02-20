-- Align with schema: Invoice.outstandingAmount has no @default in schema
ALTER TABLE "Invoice" ALTER COLUMN "outstandingAmount" DROP DEFAULT;
