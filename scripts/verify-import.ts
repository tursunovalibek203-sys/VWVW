import { prisma } from '../server/utils/prisma';

async function verify() {
  const customers = await prisma.customer.count();
  const products = await prisma.product.count();
  
  console.log('✅ Маълумот қўшув муваффақ ўтди!');
  console.log('   👥 Жами мижоз:', customers);
  console.log('   📦 Жами махсулот:', products);
  
  const recentCustomers = await prisma.customer.findMany({ take: 5 });
  console.log('\nСўнгги мижозлар:');
  recentCustomers.forEach((c, i) => {
    console.log(`  ${i+1}. ${c.name}`);
  });
}

verify().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
