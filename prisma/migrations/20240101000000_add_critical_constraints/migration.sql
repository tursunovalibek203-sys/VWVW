-- Migration: Add Critical Database Constraints
-- Purpose: Prevent data corruption and ensure integrity

-- 1. CRITICAL: Prevent negative stock (prevents overselling)
ALTER TABLE "Product" ADD CONSTRAINT "product_stock_non_negative" 
CHECK ("currentStock" >= 0);

ALTER TABLE "Product" ADD CONSTRAINT "product_units_non_negative" 
CHECK ("currentUnits" >= 0);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_stock_non_negative" 
CHECK ("currentStock" >= 0);

ALTER TABLE "ProductVariant" ADD CONSTRAINT "variant_units_non_negative" 
CHECK ("currentUnits" >= 0);

-- 2. Ensure receipt numbers are unique (already in schema but enforce)
-- This is handled by @unique in schema

-- 3. Add indexes for concurrent access performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_product_stock_lookup" 
ON "Product" ("id", "currentStock", "currentUnits");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sale_receipt_lookup" 
ON "Sale" ("receiptNumber");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sale_customer_date" 
ON "Sale" ("customerId", "createdAt");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_saleitem_sale" 
ON "SaleItem" ("saleId", "productId");

-- 4. Ensure money fields are non-negative where applicable
ALTER TABLE "Sale" ADD CONSTRAINT "sale_total_non_negative" 
CHECK ("totalAmount" >= 0);

ALTER TABLE "Sale" ADD CONSTRAINT "sale_paid_non_negative" 
CHECK ("paidAmount" >= 0);

ALTER TABLE "Product" ADD CONSTRAINT "product_price_non_negative" 
CHECK ("pricePerBag" >= 0 AND "pricePerPiece" >= 0);
