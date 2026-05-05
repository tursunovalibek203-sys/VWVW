import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Barcha mahsulot narxlarini yangilash...\n');

  // Preformlar (Kapsula)
  const preformUpdates = [
    { searchName: '15 gr', unitsPerBag: 20000, pricePerPiece: 0.02925, description: '15 gr preformlar' },
    { searchName: '21 gr', unitsPerBag: 15000, pricePerPiece: 0.04095, description: '21 gr preformlar' },
    { searchName: '26 gr', unitsPerBag: 12000, pricePerPiece: 0.0507, description: '26 gr preformlar' },
    { searchName: '30 gr', unitsPerBag: 10000, pricePerPiece: 0.0585, description: '30 gr preformlar' },
    { searchName: '36 gr', unitsPerBag: 10000, pricePerPiece: 0.0702, description: '36 gr preformlar' },
    { searchName: '52 gr', unitsPerBag: 6000, pricePerPiece: 0.1283, description: '52 gr preformlar' },
    { searchName: '70 gr', unitsPerBag: 4500, pricePerPiece: 0.163, description: '70 gr preformlar' },
    { searchName: '75 gr', unitsPerBag: 4000, pricePerPiece: 0.147, description: '75 gr preformlar' },
    { searchName: '80 gr', unitsPerBag: 4000, pricePerPiece: 0.157, description: '80 gr preformlar' },
    { searchName: '85 gr', unitsPerBag: 4000, pricePerPiece: 0.166, description: '85 gr preformlar' },
    { searchName: '86 gr', unitsPerBag: 4000, pricePerPiece: 0.167, description: '86 gr preformlar' },
    { searchName: '135 gr', unitsPerBag: 2500, pricePerPiece: 0.265, description: '135 gr preformlar' },
  ];

  console.log('📦 Preformlarni yangilash...');
  for (const update of preformUpdates) {
    console.log(`\n${update.description}...`);
    
    const products = await prisma.product.findMany({
      where: {
        name: {
          contains: update.searchName
        }
      }
    });

    console.log(`   Topildi: ${products.length} ta mahsulot`);

    for (const product of products) {
      const currentTotalUnits = product.currentUnits || product.currentStock * update.unitsPerBag;
      const newBagCount = currentTotalUnits / update.unitsPerBag;
      const newPricePerBag = update.pricePerPiece * update.unitsPerBag;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          unitsPerBag: update.unitsPerBag,
          pricePerBag: newPricePerBag,
          pricePerPiece: update.pricePerPiece,
          currentStock: newBagCount,
          currentUnits: currentTotalUnits,
          minStockLimit: Math.ceil(newBagCount * 0.2),
          optimalStock: Math.ceil(newBagCount * 0.5),
          maxCapacity: Math.ceil(newBagCount * 1.5)
        }
      });

      console.log(`   ✅ ${product.name}: ${newBagCount.toFixed(2)} qop × ${update.unitsPerBag} = ${currentTotalUnits} dona | $${newPricePerBag.toFixed(2)}/qop, $${update.pricePerPiece}/dona`);
    }
  }

  // 28 krishka (bezgaz, gazlik, okm, dkm)
  console.log('\n📦 28 krishkalarni yangilash...');
  
  // 28 bezgaz
  const krishka28Bezgaz = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '28' } },
        { OR: [
          { name: { contains: 'krishka' } },
          { name: { contains: 'qopqoq' } },
          { name: { contains: 'cap' } },
          { name: { contains: 'кришка' } },
          { name: { contains: 'Кришка' } }
        ]}
      ]
    }
  });

  // Filter bezgaz (exclude gaz, dkm, okm)
  const bezgazProducts = krishka28Bezgaz.filter(p => 
    !p.name.toLowerCase().includes('gaz') && 
    !p.name.toLowerCase().includes('газ') &&
    !p.name.toLowerCase().includes('dkm') &&
    !p.name.toLowerCase().includes('okm')
  );

  console.log(`   28 bezgaz: ${bezgazProducts.length} ta`);
  for (const product of bezgazProducts) {
    const unitsPerBag = 5000;
    const pricePerPiece = 0.007;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        unitsPerBag,
        pricePerBag,
        pricePerPiece,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 28 gazlik
  const gazlikProducts = krishka28Bezgaz.filter(p => 
    p.name.toLowerCase().includes('gaz') || p.name.toLowerCase().includes('газ')
  );
  console.log(`   28 gazlik: ${gazlikProducts.length} ta`);
  for (const product of gazlikProducts) {
    const unitsPerBag = 6000;
    const pricePerPiece = 0.008;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        unitsPerBag,
        pricePerBag,
        pricePerPiece,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 28 okm
  const okmProducts = krishka28Bezgaz.filter(p => 
    p.name.toLowerCase().includes('okm')
  );
  console.log(`   28 okm: ${okmProducts.length} ta`);
  for (const product of okmProducts) {
    const unitsPerBag = 6000;
    const pricePerPiece = 0.007;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        unitsPerBag,
        pricePerBag,
        pricePerPiece,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 28 dkm
  const dkmProducts = krishka28Bezgaz.filter(p => 
    p.name.toLowerCase().includes('dkm')
  );
  console.log(`   28 dkm: ${dkmProducts.length} ta`);
  for (const product of dkmProducts) {
    const unitsPerBag = 4000;
    const pricePerPiece = 0.012;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        unitsPerBag,
        pricePerBag,
        pricePerPiece,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 38 krishka
  console.log('\n📦 38 krishkalarni yangilash...');
  const krishka38 = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '38' } },
        { OR: [
          { name: { contains: 'krishka' } },
          { name: { contains: 'qopqoq' } },
          { name: { contains: 'cap' } },
          { name: { contains: 'кришка' } },
          { name: { contains: 'Кришка' } }
        ]}
      ]
    }
  });

  console.log(`   Topildi: ${krishka38.length} ta`);
  for (const product of krishka38) {
    const pricePerPiece = 0.015;
    const unitsPerBag = product.unitsPerBag || 2000;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece,
        pricePerBag,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 38 ruchka
  console.log('\n📦 38 ruchkalarni yangilash...');
  const ruchka38 = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '38' } },
        { OR: [
          { name: { contains: 'ruchka' } },
          { name: { contains: 'handle' } },
          { name: { contains: 'ручка' } },
          { name: { contains: 'Ручка' } }
        ]}
      ]
    }
  });

  console.log(`   Topildi: ${ruchka38.length} ta`);
  for (const product of ruchka38) {
    const pricePerPiece = 0.010;
    const unitsPerBag = product.unitsPerBag || 1000;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece,
        pricePerBag,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  // 28 ruchka
  console.log('\n📦 28 ruchkalarni yangilash...');
  const ruchka28 = await prisma.product.findMany({
    where: {
      AND: [
        { name: { contains: '28' } },
        { OR: [
          { name: { contains: 'ruchka' } },
          { name: { contains: 'handle' } },
          { name: { contains: 'ручка' } },
          { name: { contains: 'Ручка' } }
        ]}
      ]
    }
  });

  console.log(`   Topildi: ${ruchka28.length} ta`);
  for (const product of ruchka28) {
    const pricePerPiece = 0.010;
    const unitsPerBag = product.unitsPerBag || 1000;
    const pricePerBag = pricePerPiece * unitsPerBag;
    const currentTotalUnits = product.currentUnits || product.currentStock * unitsPerBag;
    const newBagCount = currentTotalUnits / unitsPerBag;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        pricePerPiece,
        pricePerBag,
        currentStock: newBagCount,
        currentUnits: currentTotalUnits
      }
    });
    console.log(`   ✅ ${product.name}: $${pricePerPiece}/dona`);
  }

  console.log('\n🎉 Barcha mahsulotlar muvaffaqiyatli yangilandi!');
}

main()
  .catch((e) => {
    console.error('❌ Xatolik:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
