-- Add unique constraint to receiptNumber
-- This migration makes receiptNumber auto-increment and unique

-- Step 1: Find the current max receiptNumber
-- Step 2: Create a sequence starting from that value
-- Step 3: Add unique constraint

-- For PostgreSQL:
-- ALTER TABLE "Sale" ALTER COLUMN "receiptNumber" DROP DEFAULT;
-- CREATE SEQUENCE IF NOT EXISTS "Sale_receiptNumber_seq" START WITH (SELECT COALESCE(MAX("receiptNumber"), 0) + 1 FROM "Sale");
-- ALTER TABLE "Sale" ALTER COLUMN "receiptNumber" SET DEFAULT nextval('"Sale_receiptNumber_seq"');
-- ALTER TABLE "Sale" ADD CONSTRAINT "Sale_receiptNumber_key" UNIQUE ("receiptNumber");

-- For SQLite (development):
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table
-- This will be handled by Prisma migrate

-- Run: npx prisma migrate dev --name add_receipt_unique_constraint
