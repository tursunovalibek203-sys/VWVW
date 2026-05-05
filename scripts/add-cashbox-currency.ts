import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding currency column to CashboxTransaction...');
  
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "CashboxTransaction" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'UZS'
    `);
    console.log('✅ CashboxTransaction.currency column added');
    
    await prisma.$executeRawUnsafe(`
      UPDATE "CashboxTransaction" SET "currency" = 'UZS' WHERE "currency" IS NULL
    `);
    console.log('✅ Existing records updated');
    
    // Check paymentMethod column too
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "CashboxTransaction" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CASH'
      `);
      console.log('✅ CashboxTransaction.paymentMethod column added');
    } catch (e) {
      console.log('⚠️ paymentMethod column may already exist');
    }
    
    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
