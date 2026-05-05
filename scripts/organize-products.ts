import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function organizeProducts() {
  console.log('🔄 Mahsulotlarni tartibga solish boshlandi...\n');

  try {
    // 1. Barcha mahsulotlarni olish
    const products = await prisma.product.findMany({
      orderBy: { name: 'asc' }
    });

    console.log(`📦 Jami ${products.length} ta mahsulot topildi\n`);

    // 2. Ombor bo'yicha guruhlash
    const byWarehouse = {
      preform: products.filter(p => p.warehouse === 'preform'),
      krishka: products.filter(p => p.warehouse === 'krishka'),
      ruchka: products.filter(p => p.warehouse === 'ruchka'),
      other: products.filter(p => !p.warehouse || p.warehouse === 'other')
    };

    console.log('📊 Ombor bo\'yicha taqsimot:');
    console.log(`   Preforma: ${byWarehouse.preform.length} ta`);
    console.log(`   Qopqoq: ${byWarehouse.krishka.length} ta`);
    console.log(`   Ruchka: ${byWarehouse.ruchka.length} ta`);
    console.log(`   Boshqa: ${byWarehouse.other.length} ta\n`);

    // 3. Preformalarni gram bo'yicha tartibga solish
    const preformGroups: { [key: string]: typeof products } = {};
    byWarehouse.preform.forEach(p => {
      const match = p.name.match(/(\d+)\s*(gr|g|гр|г)/i);
      const size = match ? match[1] : 'Unknown';
      if (!preformGroups[size]) preformGroups[size] = [];
      preformGroups[size].push(p);
    });

    console.log('🏷️  Preforma o\'lchamlari:');
    Object.keys(preformGroups)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach(size => {
        console.log(`   ${size}gr: ${preformGroups[size].length} ta tur`);
      });

    // 4. BagType larni yangilash - gram bo'yicha
    let updatedCount = 0;
    const updates: { id: string; bagType: string }[] = [];

    for (const [size, items] of Object.entries(preformGroups)) {
      for (const product of items) {
        // Skip if already has a proper bagType (not Boshqa or Unknowngr)
        if (product.bagType && product.bagType !== 'Boshqa' && product.bagType !== 'Unknowngr' && !product.bagType.includes('Unknown')) {
          continue;
        }
        const newBagType = size === 'Unknown' ? 'Boshqa' : `${size}gr`;
        if (product.bagType !== newBagType) {
          updates.push({ id: product.id, bagType: newBagType });
        }
      }
    }

    // 5. Krishka va ruchkalarni bagType bo'yicha tartibga solish
    for (const product of [...byWarehouse.krishka, ...byWarehouse.ruchka]) {
      const sizeMatch = product.name.match(/(\d+)(mm|мм)/i);
      const size = sizeMatch ? sizeMatch[1] : 'Other';
      const newBagType = product.warehouse === 'krishka' 
        ? `Qopqoq ${size}mm`
        : `Ruchka ${size}mm`;
      
      if (product.bagType !== newBagType) {
        updates.push({ id: product.id, bagType: newBagType });
      }
    }

    // Batch update
    console.log(`\n📝 ${updates.length} ta mahsulot yangilanmoqda...`);
    for (const update of updates) {
      await prisma.product.update({
        where: { id: update.id },
        data: { bagType: update.bagType }
      });
      updatedCount++;
      if (updatedCount % 10 === 0) {
        console.log(`   ${updatedCount}/${updates.length} yangilandi...`);
      }
    }

    console.log(`\n✅ ${updatedCount} ta mahsulot tartibga solindi!`);
    console.log('\n🎉 Mahsulotlar muvaffaqiyatli tartibga solindi!');

  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

organizeProducts()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
