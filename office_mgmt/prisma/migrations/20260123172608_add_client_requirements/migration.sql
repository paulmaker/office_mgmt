-- AlterTable: Add referenceCode to Client
ALTER TABLE "Client" ADD COLUMN "referenceCode" TEXT;

-- CreateIndex: Unique constraint for referenceCode per entity
CREATE UNIQUE INDEX "Client_entityId_referenceCode_key" ON "Client"("entityId", "referenceCode") WHERE "referenceCode" IS NOT NULL;

-- AlterTable: Add car field to Employee
ALTER TABLE "Employee" ADD COLUMN "car" TEXT;

-- AlterTable: Add new fields to CompanyAsset
ALTER TABLE "CompanyAsset" ADD COLUMN "leaseExpiryDate" TIMESTAMP(3);
ALTER TABLE "CompanyAsset" ADD COLUMN "merseyFlow" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "CompanyAsset" ADD COLUMN "companyCar" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Add new fields to Timesheet
ALTER TABLE "Timesheet" ADD COLUMN "expenses" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Timesheet" ADD COLUMN "receiptsReceived" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Timesheet" ADD COLUMN "submittedDate" TIMESTAMP(3);

-- AlterTable: Add new fields to BankTransaction
ALTER TABLE "BankTransaction" ADD COLUMN "reconciliationDate" TIMESTAMP(3);
ALTER TABLE "BankTransaction" ADD COLUMN "reconciledBy" TEXT;
ALTER TABLE "BankTransaction" ADD COLUMN "linkedTimesheetId" TEXT;
ALTER TABLE "BankTransaction" ADD COLUMN "documentUrl" TEXT;

-- AlterTable: Add supplierId to Invoice
ALTER TABLE "Invoice" ADD COLUMN "supplierId" TEXT;

-- CreateTable: InvoiceCode
CREATE TABLE "InvoiceCode" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "prefix" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Supplier
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "vatNumber" TEXT,
    "vatRegistered" BOOLEAN NOT NULL DEFAULT false,
    "paymentTerms" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable: JobPrice
CREATE TABLE "JobPrice" (
    "id" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceCode_entityId_idx" ON "InvoiceCode"("entityId");
CREATE INDEX "InvoiceCode_clientId_idx" ON "InvoiceCode"("clientId");
CREATE UNIQUE INDEX "InvoiceCode_entityId_clientId_key" ON "InvoiceCode"("entityId", "clientId");

-- CreateIndex
CREATE INDEX "Supplier_entityId_idx" ON "Supplier"("entityId");

-- CreateIndex
CREATE INDEX "JobPrice_entityId_idx" ON "JobPrice"("entityId");
CREATE INDEX "JobPrice_clientId_idx" ON "JobPrice"("clientId");
CREATE UNIQUE INDEX "JobPrice_entityId_clientId_jobType_key" ON "JobPrice"("entityId", "clientId", "jobType");

-- AddForeignKey
ALTER TABLE "InvoiceCode" ADD CONSTRAINT "InvoiceCode_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InvoiceCode" ADD CONSTRAINT "InvoiceCode_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPrice" ADD CONSTRAINT "JobPrice_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JobPrice" ADD CONSTRAINT "JobPrice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
