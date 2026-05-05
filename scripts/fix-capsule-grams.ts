import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Kapsula mahsulotlarining gram miqdorini to\'g\'irlash...');

  // Kapsula mahsulotlarini olish
  const capsuleProducts = await prisma.product.findMany({
    where: {
      name: {
        startsWith: 'Kapsula'
      }
    }
  });

  console.log(`Topilgan kapsula mahsulotlari: ${capsuleProducts.length} ta`);

  let updated = 0;

  for (const product of capsuleProducts) {
    // Gram miqdorini aniqlash
    let grams = 0;
    let newName = product.name;

    // Gram miqdorini nomdan olish
    const gramMatch = product.name.match(/(\d+)\s*gr/);
    if (gramMatch) {
      grams = parseInt(gramMatch[1]);
    }

    // Agar gram miqdori topilmasa, o'lcham bo'yicha aniqlash
    if (grams === 0) {
      if (product.name.includes('15')) grams = 15;
      else if (product.name.includes('21')) grams = 21;
      else if (product.name.includes('26')) grams = 26;
      else if (product.name.includes('30')) grams = 30;
      else if (product.name.includes('36')) grams = 36;
      else if (product.name.includes('52')) grams = 52;
      else if (product.name.includes('70')) grams = 70;
      else if (product.name.includes('75')) grams = 75;
      else if (product.name.includes('80')) grams = 80;
      else if (product.name.includes('85')) grams = 85;
      else if (product.name.includes('86')) grams = 86;
      else if (product.name.includes('135')) grams = 135;
      else if (product.name.includes('250')) grams = 250;
    }

    // Qop sig'imi (dona soni) gram bo'yicha belgilash
    let unitsPerBag = 0;
    if (grams === 15) unitsPerBag = 20000;
    else if (grams === 21) unitsPerBag = 15000;
    else if (grams === 26) unitsPerBag = 12000;
    else if (grams === 30) unitsPerBag = 10000;
    else if (grams === 36) unitsPerBag = 10000;
    else if (grams === 52) unitsPerBag = 6000;
    else if (grams === 70) unitsPerBag = 4500;
    else if (grams === 75) unitsPerBag = 4000;
    else if (grams === 80) unitsPerBag = 4000;
    else if (grams === 85) unitsPerBag = 4000;
    else if (grams === 86) unitsPerBag = 4000;
    else if (grams === 135) unitsPerBag = 2500;
    else if (grams === 250) unitsPerBag = 2000;

    // Qop sig'imi farqi bo'yicha belgilash (3,000 va 2,000)
    if (product.name.includes('2') && grams === 75) unitsPerBag = 3000;
    if (product.name.includes('2') && grams === 80) unitsPerBag = 3000;
    if (product.name.includes('2') && grams === 135) unitsPerBag = 2000;
    if (product.name.includes('+') && grams === 135) unitsPerBag = 2000;

    // Mahsulotni yangilash - gram bo'yicha turga ajratish
    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerBag: 1000, // Default narx
        unitsPerBag,
        bagType: 'Kapsula',
        warehouse: `kapsula-${grams}gr`, // Gram bo'yicha turga ajratish
        currentStock: 100,
        currentUnits: 100 * unitsPerBag,
        minStockLimit: 20,
        optimalStock: 150,
        maxCapacity: 500
      }
    });

    updated++;
    console.log(`✅ ${product.name} - ${grams}gr - ${unitsPerBag} dona/qop - Tur: kapsula-${grams}gr`);
  }

  console.log(`\n🎉 ${updated} ta mahsulot yangilandi`);
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
