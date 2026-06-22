// Test ma'lumotlarini o'chirish skripti
// Runs with: node scripts/clear-test-data.mjs
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// .env dan DATABASE_URL o'qish
try {
  const envPath = resolve(__dirname, '../.env');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
} catch (e) {
  console.error('.env fayl topilmadi:', e.message);
}

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  console.log('=== TEST MA\'LUMOTLARINI O\'CHIRISH ===\n');

  // 1. Haydovchilar ro'yxatini ko'rsatish
  const allDrivers = await prisma.driver.findMany({
    select: { id: true, name: true, phone: true, debtToCompany: true, debtToCompanyUSD: true }
  });

  console.log(`Jami haydovchilar: ${allDrivers.length} ta`);
  allDrivers.forEach((d, i) => {
    const debt = [];
    if (d.debtToCompanyUSD > 0) debt.push(`$${d.debtToCompanyUSD}`);
    if (d.debtToCompany > 0) debt.push(`${d.debtToCompany.toLocaleString()} UZS`);
    console.log(`  ${i+1}. ${d.name} | ${d.phone} | Qarz: ${debt.join(' + ') || '0'}`);
  });

  // 2. Sale sonini ko'rsatish
  const saleCount = await prisma.sale.count();
  const txCount = await prisma.cashboxTransaction.count();
  console.log(`\nJami savdolar: ${saleCount} ta`);
  console.log(`Jami kassa yozuvlari: ${txCount} ta`);

  console.log('\nO\'chirish boshlanmoqda...\n');

  // 3. Invoice larni o'chirish (Sale ga bog'liq, cascade yo'q)
  try {
    const invoiceDel = await prisma.invoice.deleteMany({});
    console.log(`✓ Invoice: ${invoiceDel.count} ta o'chirildi`);
  } catch (e) {
    console.log(`  Invoice: ${e.message}`);
  }

  // 4. Barcha savdolarni o'chirish (SaleItem cascade orqali ham o'chadi)
  try {
    // Avval SaleItem
    const siDel = await prisma.saleItem.deleteMany({});
    console.log(`✓ SaleItem: ${siDel.count} ta o'chirildi`);
  } catch (e) {
    console.log(`  SaleItem: ${e.message}`);
  }

  try {
    const saleDel = await prisma.sale.deleteMany({});
    console.log(`✓ Sale: ${saleDel.count} ta o'chirildi`);
  } catch (e) {
    console.log(`  Sale xato: ${e.message}`);
  }

  // 5. Kassa yozuvlarini o'chirish
  try {
    const cashDel = await prisma.cashboxTransaction.deleteMany({});
    console.log(`✓ CashboxTransaction: ${cashDel.count} ta o'chirildi`);
  } catch (e) {
    console.log(`  CashboxTransaction xato: ${e.message}`);
  }

  // 6. Mijoz qarzlarini 0 ga reset qilish
  try {
    const custReset = await prisma.customer.updateMany({
      data: { debtUZS: 0, debtUSD: 0 }
    });
    console.log(`✓ Mijoz balanslar reset: ${custReset.count} ta`);
  } catch (e) {
    console.log(`  Mijoz reset xato: ${e.message}`);
  }

  // 7. Haydovchi qarzlarini 0 ga reset qilish
  try {
    const drvReset = await prisma.driver.updateMany({
      data: { debtToCompany: 0, debtToCompanyUSD: 0 }
    });
    console.log(`✓ Haydovchi balanslar reset: ${drvReset.count} ta`);
  } catch (e) {
    console.log(`  Haydovchi reset xato: ${e.message}`);
  }

  // 8. Barcha haydovchilarni o'chirish (test haydovchilar)
  try {
    const drvDel = await prisma.driver.deleteMany({});
    console.log(`✓ Haydovchilar o'chirildi: ${drvDel.count} ta`);
  } catch (e) {
    console.log(`  Haydovchi o'chirishda xato: ${e.message}`);
  }

  console.log('\n=== TOZALASH TUGADI ===');
  console.log('Mahsulotlar, mijozlar, foydalanuvchilar saqlanib qoldi.\n');

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Xato:', e);
  await prisma.$disconnect();
  process.exit(1);
});
