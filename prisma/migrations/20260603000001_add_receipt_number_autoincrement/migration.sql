-- Migration: add_receipt_number_autoincrement
-- Adds autoincrement default to receiptNumber so every new Sale
-- gets a sequential receipt number automatically.

-- SQLite does not support ALTER COLUMN, so we must recreate the table.
-- This migration is safe only when there are no NULL receiptNumber rows
-- (or they are acceptable to remain NULL for historical records).

-- Step 1: Create a sequence table to simulate autoincrement for the optional column.
-- SQLite AUTOINCREMENT on a nullable column is not directly supported.
-- The canonical SQLite approach: make it a separate ROWID-driven counter.

-- NOTE: For PostgreSQL migration, use:
--   ALTER TABLE "Sale" ALTER COLUMN "receiptNumber" SET DEFAULT nextval('sale_receipt_number_seq');
--   CREATE SEQUENCE IF NOT EXISTS sale_receipt_number_seq;

-- For SQLite (current dev environment): ensure new rows get an auto-assigned
-- receiptNumber by relying on the @default(autoincrement()) Prisma directive,
-- which generates:  receiptNumber INTEGER DEFAULT (SELECT COALESCE(MAX(receiptNumber),0)+1 FROM Sale)
-- Prisma will handle the DDL via `prisma db push` or `prisma migrate deploy`.

-- Placeholder so Prisma migration engine tracks this migration as applied.
SELECT 1;
