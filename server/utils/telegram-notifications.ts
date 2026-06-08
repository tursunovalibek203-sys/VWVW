import { prisma } from './prisma';
import { botManager } from '../bot/bot-manager';
import { sendSaleReceiptToTopic } from './telegram-forum';

/**
 * Mijozga sotuv haqida xabar yuborish
 */
export async function notifyCustomerSale(saleId: string) {
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

    if (!sale || !sale.customer) {
      console.log('❌ Sale yoki customer topilmadi');
      return;
    }

    const { telegramChatId, telegramTopicId } = sale.customer;

    // Ikkalasi ham yo'q — yuborish kerak emas
    if (!telegramChatId && !telegramTopicId) {
      console.log(`ℹ️ ${sale.customer.name}: Telegram ulanmagan, chek yuborilmadi`);
      return;
    }

    // === SHAXSIY XABAR — faqat telegramChatId belgilangan bo'lsa ===
    if (telegramChatId) {
      const customerBot = botManager.getBot('super-customer') || botManager.getBot('customer-enhanced') || botManager.getBot('customer');
      if (customerBot) {
        // Mahsulotlar ro'yxati
        let productsText = '';
        if (sale.items && sale.items.length > 0) {
          productsText = sale.items.map((item, index) =>
            `${index + 1}. ${item.product?.name || 'Noma\'lum'} - ${item.quantity} qop x ${item.pricePerBag} = ${item.subtotal} USD`
          ).join('\n');
        } else if (sale.product) {
          productsText = `1. ${sale.product.name} - ${sale.quantity} qop x ${sale.pricePerBag} = ${sale.totalAmount} USD`;
        }

        let paymentInfo = '';
        if (sale.paymentDetails) {
          try {
            const details = JSON.parse(sale.paymentDetails);
            const parts = [];
            if (details.uzs) parts.push(`💵 Naqd: ${details.uzs.toLocaleString()} so'm`);
            if (details.usd) parts.push(`💳 Karta: ${details.usd} USD`);
            if (details.click) parts.push(`📱 CLICK: ${details.click.toLocaleString()} so'm`);
            paymentInfo = parts.join('\n');
          } catch {
            paymentInfo = `💰 To'langan: ${sale.paidAmount} USD`;
          }
        } else {
          paymentInfo = `💰 To'langan: ${sale.paidAmount} USD`;
        }

        const debt = sale.totalAmount - sale.paidAmount;
        const statusEmoji = { 'PAID': '✅', 'PARTIAL': '⚠️', 'UNPAID': '❌' }[sale.paymentStatus] || '❓';
        const statusText = { 'PAID': "To'liq to'langan", 'PARTIAL': "Qisman to'langan", 'UNPAID': "To'lanmagan" }[sale.paymentStatus] || sale.paymentStatus;

        const message = `
🛒 **YANGI SOTUV**

👤 **Mijoz:** ${sale.customer.name}
📅 **Sana:** ${new Date(sale.createdAt).toLocaleString('uz-UZ')}

📦 **Mahsulotlar:**
${productsText}

💰 **Jami:** ${sale.totalAmount} USD

${paymentInfo}

${statusEmoji} **Holat:** ${statusText}${debt > 0 ? `\n\n⚠️ **Qarz:** ${debt.toFixed(2)} USD` : ''}

${debt > 0 ? '📞 Qarzni to\'lash uchun biz bilan bog\'laning.' : '✅ Rahmat! Xaridingiz uchun tashakkur!'}

📱 Savollar uchun: /help
        `;

        await customerBot.sendMessage(telegramChatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ Shaxsiy xabar yuborildi: ${sale.customer.name}`);
      } else {
        console.log('❌ Customer bot ishlamayapti — shaxsiy xabar yuborilmadi');
      }
    }

    // === FORUM TOPIC — faqat telegramTopicId belgilangan bo'lsa ===
    if (telegramTopicId) {
      sendSaleReceiptToTopic(saleId).catch(err =>
        console.error('Forum topicga chek yuborishda xatolik:', err)
      );
    }
  } catch (error) {
    console.error('Mijozga xabar yuborishda xatolik:', error);
  }
}

/**
 * Admin'ga kunlik hisobot yuborish
 */
export async function sendDailyReport() {
  try {
    const adminBot = botManager.getBot('admin');
    if (!adminBot) {
      console.log('Admin bot not available');
      return;
    }

    const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_ID?.split(',') || [];
    if (adminChatIds.length === 0) {
      console.log('Admin chat IDs not configured');
      return;
    }

    // Bugungi sotuvlar
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPaid = sales.reduce((sum, sale) => sum + sale.paidAmount, 0);
    const totalDebt = totalRevenue - totalPaid;

    const paidSales = sales.filter(s => s.paymentStatus === 'PAID').length;
    const partialSales = sales.filter(s => s.paymentStatus === 'PARTIAL').length;
    const unpaidSales = sales.filter(s => s.paymentStatus === 'UNPAID').length;

    // Top mijozlar
    const customerSales = sales.reduce((acc: Record<string, any>, sale) => {
      const key = sale.customerId || 'unknown';
      if (!key) return acc;
      if (!acc[key]) {
        acc[key] = {
          name: sale.customer?.name || 'Noma\'lum',
          count: 0,
          total: 0
        };
      }
      acc[key].count++;
      acc[key].total += sale.totalAmount;
      return acc;
    }, {});

    const topCustomers = Object.values(customerSales)
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 5)
      .map((c: any, i) => `${i + 1}. ${c.name} - ${c.total.toFixed(2)} USD (${c.count} ta)`)
      .join('\n');

    const message = `
📊 **KUNLIK HISOBOT**
📅 ${today.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

💰 **SOTUVLAR:**
📦 Jami sotuvlar: ${totalSales} ta
💵 Jami summa: ${totalRevenue.toFixed(2)} USD
✅ To'langan: ${totalPaid.toFixed(2)} USD
⚠️ Qarz: ${totalDebt.toFixed(2)} USD

📈 **HOLAT:**
✅ To'liq to'langan: ${paidSales} ta
⚠️ Qisman: ${partialSales} ta
❌ To'lanmagan: ${unpaidSales} ta

👥 **TOP MIJOZLAR:**
${topCustomers || 'Bugun sotuvlar yo\'q'}

---
🤖 Avtomatik hisobot
    `;

    for (const chatId of adminChatIds) {
      if (chatId.trim()) {
        try {
          await adminBot.sendMessage(chatId.trim(), message, {
            parse_mode: 'Markdown'
          });
        } catch (error) {
          console.error(`Admin ${chatId} ga xabar yuborishda xatolik:`, error);
        }
      }
    }

    console.log('✅ Kunlik hisobot yuborildi');
  } catch (error) {
    console.error('Kunlik hisobot yuborishda xatolik:', error);
  }
}

/**
 * Admin'ga low stock ogohlantirish
 */
export async function notifyLowStock(productId: string) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return;

    const adminBot = botManager.getBot('admin');
    if (!adminBot) return;

    const adminChatIds = process.env.TELEGRAM_ADMIN_CHAT_ID?.split(',') || [];

    const stockPercentage = (product.currentStock / product.optimalStock) * 100;
    const urgency = stockPercentage < 20 ? '🚨 JUDA MUHIM' : '⚠️ OGOHLANTIRISH';

    const message = `
${urgency}

📦 **OMBOR KAMAYDI**

🏷️ **Mahsulot:** ${product.name}
📊 **Joriy zaxira:** ${product.currentStock} qop
⚠️ **Minimal limit:** ${product.minStockLimit} qop
✅ **Optimal:** ${product.optimalStock} qop
📈 **Foiz:** ${stockPercentage.toFixed(1)}%

${stockPercentage < 20 ? '🚨 Shoshilinch buyurtma bering!' : '⚠️ Tez orada buyurtma bering!'}

📞 Yetkazuvchi bilan bog'laning
    `;

    for (const chatId of adminChatIds) {
      if (chatId.trim()) {
        try {
          await adminBot.sendMessage(chatId.trim(), message, {
            parse_mode: 'Markdown'
          });
        } catch (error) {
          console.error(`Admin ${chatId} ga xabar yuborishda xatolik:`, error);
        }
      }
    }

    console.log(`✅ Low stock ogohlantirish yuborildi: ${product.name}`);
  } catch (error) {
    console.error('Low stock ogohlantirish yuborishda xatolik:', error);
  }
}

/**
 * Mijozga qarz eslatmasi yuborish
 */
export async function sendDebtReminder(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        sales: {
          where: {
            paymentStatus: { in: ['PARTIAL', 'UNPAID'] }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!customer || !customer.telegramChatId || customer.debt <= 0) {
      return;
    }

    const customerBot = botManager.getBot('super-customer') || botManager.getBot('customer-enhanced') || botManager.getBot('customer');
    if (!customerBot) {
      console.log('❌ Customer bot ishlamayapti');
      return;
    }

    const unpaidSales = customer.sales.length;
    const oldestSale = customer.sales[customer.sales.length - 1];
    const daysSinceOldest = oldestSale 
      ? Math.floor((Date.now() - new Date(oldestSale.createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const message = `
💰 **QARZ ESLATMASI**

👤 **Hurmatli ${customer.name}!**

Sizda bizda qarz bor:
💵 **Jami qarz:** ${customer.debt.toFixed(2)} USD
📦 **To'lanmagan sotuvlar:** ${unpaidSales} ta
📅 **Eng eski qarz:** ${daysSinceOldest} kun oldin

Iltimos, qarzni tez orada to'lang.

📞 **Bog'lanish:**
Telefon: +998 XX XXX XX XX
Telegram: @admin

💳 **To'lov usullari:**
- Naqd
- Karta
- CLICK/Payme

Rahmat! 🙏
    `;

    await customerBot.sendMessage(customer.telegramChatId, message, {
      parse_mode: 'Markdown'
    });

    console.log(`✅ Qarz eslatmasi yuborildi: ${customer.name}`);
  } catch (error) {
    console.error('Qarz eslatmasi yuborishda xatolik:', error);
  }
}

/**
 * Mijozga buyurtma cheki yuborish
 */
export async function sendInvoiceToCustomer(
  telegramChatId: string,
  invoiceData: {
    orderNumber: string;
    items: Array<{ name: string; quantity: string; price: number; subtotal: number }>;
    totalAmount: number;
    paidAmount: number;
    remainingDebt: number;
    paymentDetails: { uzs?: number; usd?: number; click?: number };
    dueDate?: string;
  }
) {
  try {
    const customerBot = botManager.getBot('super-customer') || botManager.getBot('customer-enhanced') || botManager.getBot('customer');
    if (!customerBot) {
      console.log('❌ Customer bot ishlamayapti');
      return;
    }

    // Mahsulotlar ro'yxati
    const itemsList = invoiceData.items
      .map((item, index) => `${index + 1}. ${item.name}\n   ${item.quantity} x $${item.price.toFixed(2)} = $${item.subtotal.toFixed(2)}`)
      .join('\n\n');

    // To'lov tafsilotlari
    const paymentParts = [];
    if (invoiceData.paymentDetails.uzs && invoiceData.paymentDetails.uzs > 0) {
      paymentParts.push(`💵 Naqd (UZS): ${invoiceData.paymentDetails.uzs.toLocaleString()} so'm`);
    }
    if (invoiceData.paymentDetails.usd && invoiceData.paymentDetails.usd > 0) {
      paymentParts.push(`💵 Dollar (USD): $${invoiceData.paymentDetails.usd.toFixed(2)}`);
    }
    if (invoiceData.paymentDetails.click && invoiceData.paymentDetails.click > 0) {
      paymentParts.push(`💳 Click: ${invoiceData.paymentDetails.click.toLocaleString()} so'm`);
    }
    const paymentText = paymentParts.length > 0 ? paymentParts.join('\n') : '❌ To\'lov qilinmadi';

    // Qarz ma'lumoti
    const debtSection = invoiceData.remainingDebt > 0 ? `
⚠️ **QARZ MA'LUMOTI**
💰 Qarz: $${invoiceData.remainingDebt.toFixed(2)}
${invoiceData.dueDate ? `📅 To'lov sanasi: ${new Date(invoiceData.dueDate).toLocaleDateString('uz-UZ')}` : ''}

📞 Qarzni to'lash uchun biz bilan bog'laning!
` : `
✅ **TO'LIQ TO'LANGAN**
Rahmat! Xaridingiz uchun tashakkur! 🎉
`;

    const message = `
🧾 **BUYURTMA CHEKI**

📋 **Buyurtma:** #${invoiceData.orderNumber}
📅 **Sana:** ${new Date().toLocaleString('uz-UZ')}

📦 **MAHSULOTLAR:**
${itemsList}

━━━━━━━━━━━━━━━━━━━━
💰 **JAMI:** $${invoiceData.totalAmount.toFixed(2)}

💳 **TO'LOV:**
${paymentText}

✅ **To'langan:** $${invoiceData.paidAmount.toFixed(2)}
${debtSection}

📱 Savollar uchun: /help
🏪 Bizni tanlaganingiz uchun rahmat!
    `;

    await customerBot.sendMessage(telegramChatId, message, {
      parse_mode: 'Markdown'
    });

    console.log(`✅ Chek yuborildi: ${telegramChatId}`);
  } catch (error) {
    console.error('Chek yuborishda xatolik:', error);
    throw error;
  }
}

/**
 * Haydovchiga to'lov qabul qilindi xabari yuborish
 */
export async function sendDriverPaymentReceivedNotification(
  telegramChatId: string,
  data: {
    saleId: string;
    collectedAmount: number;
    totalCollected: number;
    remaining: number;
    currency: string;
  }
) {
  try {
    const adminBot = botManager.getBot('admin');
    if (!adminBot) {
      console.log('Admin bot not available');
      return;
    }

    const status = data.remaining <= 0 
      ? '✅ To\'liq to\'langan!' 
      : `⏳ Qoldiq: ${data.remaining.toFixed(2)} ${data.currency}`;

    const message = `
💰 **TO'LOV QABUL QILINDI**

📋 **Sotuv:** #${data.saleId.slice(-6)}
💵 **Yig'ilgan:** ${data.collectedAmount.toFixed(2)} ${data.currency}
📊 **Jami yig'ilgan:** ${data.totalCollected.toFixed(2)} ${data.currency}
${status}

⏰ ${new Date().toLocaleString('uz-UZ')}
    `;

    await adminBot.sendMessage(telegramChatId, message, {
      parse_mode: 'Markdown'
    });

    console.log(`✅ Haydovchiga to'lov xabari yuborildi: ${telegramChatId}`);
  } catch (error) {
    console.error('Haydovchiga xabar yuborishda xatolik:', error);
  }
}
