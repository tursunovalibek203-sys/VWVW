import { prisma } from './prisma';

/**
 * Invoice raqamini generatsiya qilish
 */
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `INV-${year}${month}${day}-${random}`;
}

/**
 * Sotuv uchun invoice yaratish
 */
export async function createInvoiceForSale(saleId: string): Promise<any> {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        product: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!sale) {
      throw new Error('Sotuv topilmadi');
    }

    // Invoice raqamini generatsiya qilish
    let invoiceNumber = generateInvoiceNumber();
    
    // Unique ekanligini tekshirish
    let exists = await prisma.invoice.findUnique({
      where: { invoiceNumber }
    });
    
    while (exists) {
      invoiceNumber = generateInvoiceNumber();
      exists = await prisma.invoice.findUnique({
        where: { invoiceNumber }
      });
    }

    // Invoice yaratish
    const invoiceData: any = {
      saleId: sale.id,
      invoiceNumber,
      totalAmount: sale.totalAmount,
      currency: sale.currency,
      sentToTelegram: false
    };
    
    if (sale.customerId) {
      invoiceData.customerId = sale.customerId;
    }
    
    const invoice = await prisma.invoice.create({
      data: invoiceData,
      include: {
        sale: {
          include: {
            customer: true,
            product: true,
            items: {
              include: { product: true }
            }
          }
        }
      }
    });

    console.log(`✅ Invoice yaratildi: ${invoiceNumber}`);
    return invoice;
  } catch (error) {
    console.error('Invoice yaratishda xatolik:', error);
    throw error;
  }
}

/**
 * Invoice matnini generatsiya qilish (Telegram uchun)
 */
export function generateInvoiceText(invoice: any): string {
  const sale = invoice.sale;
  const customer = sale.customer;

  // Mahsulotlar ro'yxati
  let productsText = '';
  if (sale.items && sale.items.length > 0) {
    productsText = sale.items.map((item: any, index: number) => 
      `${index + 1}. ${item.product.name}\n   ${item.quantity} qop x ${item.pricePerBag} USD = ${item.subtotal} USD`
    ).join('\n\n');
  } else if (sale.product) {
    productsText = `1. ${sale.product.name}\n   ${sale.quantity} qop x ${sale.pricePerBag} USD = ${sale.totalAmount} USD`;
  }

  // To'lov ma'lumotlari
  let paymentInfo = '';
  if (sale.paymentDetails) {
    try {
      const details = JSON.parse(sale.paymentDetails);
      const parts = [];
      if (details.uzs) parts.push(`Naqd: ${details.uzs.toLocaleString()} so'm`);
      if (details.usd) parts.push(`Karta: ${details.usd} USD`);
      if (details.click) parts.push(`CLICK: ${details.click.toLocaleString()} so'm`);
      paymentInfo = parts.join('\n');
    } catch (e) {
      paymentInfo = `To'langan: ${sale.paidAmount} USD`;
    }
  } else {
    paymentInfo = `To'langan: ${sale.paidAmount} USD`;
  }

  // Qarz
  const debt = sale.totalAmount - sale.paidAmount;

  const text = `
╔═══════════════════════════╗
║       HISOB-FAKTURA       ║
╚═══════════════════════════╝

📄 **Invoice:** ${invoice.invoiceNumber}
📅 **Sana:** ${new Date(invoice.createdAt).toLocaleString('uz-UZ')}

👤 **MIJOZ:**
Ism: ${customer.name}
Tel: ${customer.phone}
${customer.address ? `Manzil: ${customer.address}` : ''}

📦 **MAHSULOTLAR:**
${productsText}

━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **JAMI:** ${sale.totalAmount} USD

💳 **TO'LOV:**
${paymentInfo}

${debt > 0 ? `⚠️ **QARZ:** ${debt.toFixed(2)} USD` : '✅ **TO\'LIQ TO\'LANGAN**'}

━━━━━━━━━━━━━━━━━━━━━━━━━━

🏢 **KOMPANIYA:**
Lux Pet Plast
Tel: +998 XX XXX XX XX
Telegram: @luxpetplast

Xaridingiz uchun rahmat! 🙏
  `;

  return text;
}
