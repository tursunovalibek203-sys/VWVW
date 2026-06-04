-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- Add the missing 'color' column to Product (if not already there)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_fromCurrency_toCurrency_isActive_key" ON "ExchangeRate"("fromCurrency", "toCurrency", "isActive");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_toCurrency_idx" ON "ExchangeRate"("fromCurrency", "toCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_isActive_idx" ON "ExchangeRate"("isActive");
