-- Add paymentMethod column to Sale table
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CASH';

-- Update existing records to have default value
UPDATE "Sale" SET "paymentMethod" = 'CASH' WHERE "paymentMethod" IS NULL;
