import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAllData() {
  console.log('🧹 Barcha ma\'lumotlarni tozalash boshlandi...');
  
  try {
    // 1. Chat lar (eng avval foreign key larni o'chirish)
    const deletedDriverChats = await prisma.driverChat.deleteMany({});
    console.log(`✅ DriverChat lar o'chirildi: ${deletedDriverChats.count} ta`);
    
    const deletedCustomerChats = await prisma.customerChat.deleteMany({});
    console.log(`✅ CustomerChat lar o'chirildi: ${deletedCustomerChats.count} ta`);
    
    // 2. Payment larni o'chirish
    const deletedPayments = await prisma.payment.deleteMany({});
    console.log(`✅ To\'lovlar o'chirildi: ${deletedPayments.count} ta`);
    
    // 3. SaleItem larni o'chirish
    const deletedSaleItems = await prisma.saleItem.deleteMany({});
    console.log(`✅ SaleItem lar o'chirildi: ${deletedSaleItems.count} ta`);
    
    // 4. OrderItem larni o'chirish
    const deletedOrderItems = await prisma.orderItem.deleteMany({});
    console.log(`✅ OrderItem lar o'chirildi: ${deletedOrderItems.count} ta`);
    
    // 5. ProductionPlan larni o'chirish
    const deletedProductionPlans = await prisma.productionPlan.deleteMany({});
    console.log(`✅ ProductionPlan lar o'chirildi: ${deletedProductionPlans.count} ta`);
    
    // 6. Invoice larni o'chirish (Sales dan oldin)
    const deletedInvoices = await prisma.invoice.deleteMany({});
    console.log(`✅ Invoice lar o'chirildi: ${deletedInvoices.count} ta`);
    
    // 7. Delivery larni o'chirish (Sales dan oldin)
    const deletedDeliveries = await prisma.delivery.deleteMany({});
    console.log(`✅ Delivery lar o'chirildi: ${deletedDeliveries.count} ta`);
    
    // 8. DeliveryAssignment larni o'chirish
    const deletedDeliveryAssignments = await prisma.deliveryAssignment.deleteMany({});
    console.log(`✅ DeliveryAssignment lar o'chirildi: ${deletedDeliveryAssignments.count} ta`);
    
    // 9. Sales larni o'chirish
    const deletedSales = await prisma.sale.deleteMany({});
    console.log(`✅ Sotuvlar o'chirildi: ${deletedSales.count} ta`);
    
    // 10. Order larni o'chirish
    const deletedOrders = await prisma.order.deleteMany({});
    console.log(`✅ Buyurtmalar o'chirildi: ${deletedOrders.count} ta`);
    
    // 11. Batch larni o'chirish (Product dan oldin)
    const deletedBatches = await prisma.batch.deleteMany({});
    console.log(`✅ Batch lar o'chirildi: ${deletedBatches.count} ta`);
    
    // 12. StockAlert larni o'chirish (Product dan oldin)
    const deletedStockAlerts = await prisma.stockAlert.deleteMany({});
    console.log(`✅ StockAlert lar o'chirildi: ${deletedStockAlerts.count} ta`);
    
    // 13. StockMovement larni o'chirish (Product dan oldin)
    const deletedStockMovements = await prisma.stockMovement.deleteMany({});
    console.log(`✅ StockMovement lar o'chirildi: ${deletedStockMovements.count} ta`);
    
    // 14. Mahsulotlarni o'chirish
    const deletedProducts = await prisma.product.deleteMany({});
    console.log(`✅ Mahsulotlar o'chirildi: ${deletedProducts.count} ta`);
    
    // 15. Customer larni o'chirish (admin ni saqlab qolish uchun)
    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        email: {
          not: 'admin@aziztrades.com'
        }
      }
    });
    console.log(`✅ Mijozlar o'chirildi: ${deletedCustomers.count} ta (admin saqlanib qoldi)`);
    
    // 16. Audit larni o'chirish
    const deletedAudits = await prisma.auditLog.deleteMany({});
    console.log(`✅ Audit jurnallari o'chirildi: ${deletedAudits.count} ta`);
    
    console.log('🎉 Barcha ma\'lumotlar muvaffaqiyatli tozalandi!');
    console.log('👤 Faqat admin foydalanuvchi saqlanib qoldi');
    console.log('🔧 SystemSettings o\'zgarishsiz qoldi');
    
  } catch (error) {
    console.error('❌ Xatolik yuz berdi:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Scriptni ishga tushirish
clearAllData().catch(console.error);
