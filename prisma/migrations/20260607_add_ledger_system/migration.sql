-- CreateTable: Ledger (Daftar)
CREATE TABLE IF NOT EXISTS "Ledger" (
    "id"          TEXT NOT NULL,
    "type"        TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "currency"    TEXT NOT NULL DEFAULT 'UZS',
    "totalDebit"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCredit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dueDate"     TIMESTAMP(3),
    "notes"       TEXT,
    "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
    "userId"      TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LedgerEntry (Daftar yozuvi)
CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id"        TEXT NOT NULL,
    "ledgerId"  TEXT NOT NULL,
    "entryType" TEXT NOT NULL,
    "amount"    DOUBLE PRECISION NOT NULL,
    "currency"  TEXT NOT NULL DEFAULT 'UZS',
    "dueDate"   TIMESTAMP(3),
    "paidDate"  TIMESTAMP(3),
    "notes"     TEXT,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_ledgerId_fkey"
    FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ledger_type_idx"   ON "Ledger"("type");
CREATE INDEX IF NOT EXISTS "Ledger_status_idx" ON "Ledger"("status");
CREATE INDEX IF NOT EXISTS "Ledger_userId_idx" ON "Ledger"("userId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_ledgerId_idx"  ON "LedgerEntry"("ledgerId");
CREATE INDEX IF NOT EXISTS "LedgerEntry_entryType_idx" ON "LedgerEntry"("entryType");
