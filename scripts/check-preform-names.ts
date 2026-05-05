import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Preformlarni qidirish...\n');

  // Barcha mahsulotlarni olish
  const allProducts = await prisma.product.findMany({
    select: {
      name: true,
      pricePerPiece: true,
      pricePerBag: true,
      unitsPerBag: true
    }
  });

  // Preform bo'lishi mumkin bo'lgan mahsulotlar (gr, gr, gramm, preform, преформ)
  const preforms = allProducts.filter(p => 
    p.name.toLowerCase().includes('gr') || 
    p.name.toLowerCase().includes('гр') ||
    p.name.toLowerCase().includes('preform') ||
    p.name.toLowerCase().includes('преформ')
  );

  console.log(`Topildi: ${preforms.length} ta preform:\n`);
  preforms.forEach(p => {
    console.log(`- ${p.name}`);
    console.log(`  pricePerPiece: ${p.pricePerPiece}, pricePerBag: ${p.pricePerBag}, unitsPerBag: ${p.unitsPerBag}`);
  });

  // 28 ruchka va 38 ruchka
  const ruchka28 = allProducts.filter(p => 
    p.name.includes('28') && (p.name.toLowerCase().includes('ruchka') || p.name.includes('Ручка'))
  );
  console.log(`\n28 ruchka: ${ruchka28.length} ta`);
  ruchka28.forEach(p => console.log(`- ${p.name}`));

  const ruchka38 = allProducts.filter(p => 
    p.name.includes('38') && (p.name.toLowerCase().includes('ruchka') || p.name.includes('Ручка'))
  );
  console.log(`\n38 ruchka: ${ruchka38.length} ta`);
  ruchka38.forEach(p => console.log(`- ${p.name}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
