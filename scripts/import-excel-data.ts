import XLSX from 'xlsx';
import path from 'path';
import { prisma } from '../server/utils/prisma';

async function importExcelData() {
  try {
    console.log('📥 Excel файллардан маълумот импорт қилинмоқда...\n');

    // Import Customers
    console.log('👥 Мижозлар импорт қилинмоқда...');
    const customerFile = path.join(process.cwd(), 'exsel', 'клиентлар (3).xlsx');
    const customerWb = XLSX.readFile(customerFile);
    const customerWs = customerWb.Sheets[customerWb.SheetNames[0]];
    const customerData = XLSX.utils.sheet_to_json(customerWs);

    // Parse customers - skip header row
    const customers = customerData
      .filter((row: any) => row.__EMPTY_1 && typeof row.__EMPTY_1 === 'string' && row.__EMPTY_1 !== 'Корхона номи')
      .map((row: any, idx: number) => ({
        name: row.__EMPTY_1?.trim() || `Customer ${idx + 1}`,
        phone: '',
        email: '',
        address: '',
        debt: 0,
        active: true,
      }));

    console.log(`  → ${customers.length} та мижоз найда`);

    // Import to database
    for (const customer of customers) {
      try {
        await prisma.customer.create({
          data: {
            ...customer,
            email: `${customer.name.replace(/\s+/g, '_').toLowerCase()}@luxpetplast.uz`,
          },
        });
      } catch (error: any) {
        // Skip if customer already exists
        if (!error.message.includes('Unique constraint')) {
          console.error(`  ⚠️  ${customer.name} қўшишда хато: ${error.message}`);
        }
      }
    }
    console.log('  ✅ Мижозлар қўшилди\n');

    // Import Products
    console.log('📦 Махсулотлар импорт қилинмоқда...');
    const productFile = path.join(process.cwd(), 'exsel', 'КРИШКА РУЧКА-март (3).xlsx');
    const productWb = XLSX.readFile(productFile);
    const productWs = productWb.Sheets[productWb.SheetNames[0]];
    const productData = XLSX.utils.sheet_to_json(productWs);

    // Parse products - filter valid rows with material names
    const products = productData
      .filter((row: any) => row['Материаллар номи'] && typeof row['Материаллар номи'] === 'string')
      .map((row: any, idx: number) => ({
        name: `${row['Материаллар номи']?.trim() || 'Unknown'}_${idx}`,
        bagType: 'STANDARD',
        minStockLimit: 10,
        optimalStock: 50,
        maxCapacity: 1000,
        currentStock: row['Жами кирим'] ? Number(row['Жами кирим']) : 0,
        pricePerBag: 0,
        warehouse: 'krishka',
        active: true,
      }))
      .filter((p) => p.name !== 'undefined_0' && p.name !== 'Unknown_0');

    console.log(`  → ${products.length} та махсулот найда`);

    // Import to database
    for (const product of products) {
      try {
        await prisma.product.create({
          data: product,
        });
      } catch (error: any) {
        // Skip if product already exists
        if (!error.message.includes('Unique constraint')) {
          console.error(`  ⚠️  ${product.name} қўшишда хато: ${error.message}`);
        }
      }
    }
    console.log('  ✅ Махсулотлар қўшилди\n');

    console.log('✅ Импорт муваффақ ўтди!');
    console.log(`   📊 ${customers.length} та мижоз`);
    console.log(`   📦 ${products.length} та махсулот`);
  } catch (error) {
    console.error('❌ Импорт хатосы:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importExcelData();
