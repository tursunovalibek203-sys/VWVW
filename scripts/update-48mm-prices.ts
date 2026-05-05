import { prisma } from '../server/utils/prisma';

async function update48mmPrices() {
  console.log('Updating 48mm products prices...');
  
  try {
    // 48mm Ruchkalar - donasini 0.16, 1000 dona/qop
    const handles48 = [
      { name: 'Ruchka 48 Ko\'k', pricePerPiece: 0.16, unitsPerBag: 0 },
      { name: 'Ruchka 48 Sariq', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Yashil', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Apelsin (to\'q sariq)', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Qizil', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Oq', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Qora', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Donya (Brend)', pricePerPiece: 0.16, unitsPerBag: 1000 },
      { name: 'Ruchka 48 Bekajon (Brend)', pricePerPiece: 0.16, unitsPerBag: 1000 }
    ];
    
    for (const handle of handles48) {
      const product = await prisma.product.findFirst({
        where: { name: handle.name }
      });
      
      if (product) {
        const pricePerBag = handle.pricePerPiece * handle.unitsPerBag; // 0.017 * 1000 = 17
        
        await prisma.product.update({
          where: { id: product.id },
          data: {
            pricePerPiece: handle.pricePerPiece,
            pricePerBag: pricePerBag,
            unitsPerBag: handle.unitsPerBag
          }
        });
        
        console.log(`Updated ${handle.name}: dona=${handle.pricePerPiece}$, qop=${pricePerBag}$, 1 qop=${handle.unitsPerBag} ta`);
      } else {
        console.log(`Product not found: ${handle.name}`);
      }
    }
    
    // 48mm Krishkalar - donasini 0.012, 2000 dona/qop
    const caps48 = [
      { name: 'Qopqoq 48 Ko\'k', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Sariq', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Yashil', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Apelsin (to\'q sariq)', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Qizil', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Oq', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Salat rang', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Donya (Brend)', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Bekajon (Brend)', pricePerPiece: 0.012, unitsPerBag: 2000 },
      { name: 'Qopqoq 48 Sayhun (Brend)', pricePerPiece: 0.012, unitsPerBag: 2000 }
    ];
    
    for (const cap of caps48) {
      const product = await prisma.product.findFirst({
        where: { name: cap.name }
      });
      
      if (product) {
        const pricePerBag = cap.pricePerPiece * cap.unitsPerBag; // 0.013 * 2000 = 26
        
        await prisma.product.update({
          where: { id: product.id },
          data: {
            pricePerPiece: cap.pricePerPiece,
            pricePerBag: pricePerBag,
            unitsPerBag: cap.unitsPerBag
          }
        });
        
        console.log(`Updated ${cap.name}: dona=${cap.pricePerPiece}$, qop=${pricePerBag}$, 1 qop=${cap.unitsPerBag} ta`);
      } else {
        console.log(`Product not found: ${cap.name}`);
      }
    }
    
    console.log('\nAll 48mm products updated successfully!');
    
  } catch (error) {
    console.error('Error updating prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

update48mmPrices();
