-- Run this manually against your database if the User table is missing password columns.
-- Example: psql $DATABASE_URL -f prisma/add-user-password-columns.sql
-- Or run each statement in your DB client (TablePlus, pgAdmin, etc.)

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "User_resetToken_key" ON "User"("resetToken");
