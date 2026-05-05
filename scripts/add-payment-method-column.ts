import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Adding paymentMethod column to Sale table...');
  
  try {
    // Execute raw SQL to add the column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'CASH'
    `);
    console.log('✅ Column added successfully');
    
    // Update existing records
    await prisma.$executeRawUnsafe(`
      UPDATE "Sale" SET "paymentMethod" = 'CASH' WHERE "paymentMethod" IS NULL
    `);
    console.log('✅ Existing records updated');
    
    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
