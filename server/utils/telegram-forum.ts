import TelegramBot from 'node-telegram-bot-api';
import { prisma } from './prisma';
import { botManager } from '../bot/bot-manager';

// Savdolar kanali ID va bot token — .env dan olinadi
const SALES_CHANNEL_ID = process.env.TELEGRAM_SALES_CHANNEL_ID || '';

function getChannelBot(): TelegramBot | null {
  // Kanal uchun admin botni ishlatamiz (u kanalda admin bo'lishi kerak)
  return (
    botManager.getBot('admin') ||
    botManager.getBot('super-customer') ||
    botManager.getBot('customer-enhanced') ||
    botManager.getBot('customer')
  );
}

/**
 * Yangi mijoz uchun forum groupda topic ochish
 * Kerakli shart: bot o'sha groupda admin bo'lishi va group Forum mode'da bo'lishi kerak
 */
export async function createCustomerTopic(customerId: string): Promise<number | null> {
  if (!SALES_CHANNEL_ID) {
    console.log('⚠️ TELEGRAM_SALES_CHANNEL_ID sozlanmagan');
    return null;
  }

  const bot = getChannelBot();
  if (!bot) {
    console.log('❌ Kanal boti mavjud emas');
    return null;
  }

  try {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return null;

    if (customer.telegramTopicId) {
      console.log(`ℹ️ ${customer.name} uchun topic allaqachon mavjud: ${customer.telegramTopicId}`);
      return customer.telegramTopicId;
    }

    // Forum topicni yaratish
    const result = await (bot as any).createForumTopic(SALES_CHANNEL_ID, customer.name, {
      icon_color: getTopicColor(customer.category),
    });

    const topicId: number = result.message_thread_id;

    // DBga saqlash
    await prisma.customer.update({
      where: { id: customerId },
      data: { telegramTopicId: topicId },
    });

    // Topicga birinchi xabar
    const welcomeMsg =
      `👤 *Mijoz:* ${escMd(customer.name)}\n` +
      `📞 *Telefon:* ${escMd(customer.phone)}\n` +
      (customer.telegramUsername ? `🔗 *Telegram:* @${escMd(customer.telegramUsername)}\n` : '') +
      `📂 *Kategoriya:* ${escMd(customer.category)}\n\n` +
      `_Bu topic ${escMd(customer.name)} uchun avtomatik yaratildi\\._`;

    await bot.sendMessage(SALES_CHANNEL_ID, welcomeMsg, {
      message_thread_id: topicId,
      parse_mode: 'MarkdownV2',
    } as any);

    console.log(`✅ ${customer.name} uchun forum topic yaratildi: ${topicId}`);
    return topicId;
  } catch (error: any) {
    console.error('Forum topic yaratishda xatolik:', error?.message || error);
    return null;
  }
}

/**
 * Savdo chekini forum topicga yuborish
 */
export async function sendSaleReceiptToTopic(saleId: string): Promise<void> {
  if (!SALES_CHANNEL_ID) return;

  const bot = getChannelBot();
  if (!bot) return;

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        customer: true,
        items: { include: { product: true } },
        product: true,
      },
    });

    if (!sale || !sale.customer) return;

    // Topic yo'q bo'lsa, avtomatik yaratamiz
    let topicId = sale.customer.telegramTopicId;
    if (!topicId) {
      topicId = await createCustomerTopic(sale.customer.id);
    }
    if (!topicId) return;

    // Mahsulotlar ro'yxati
    let productsText = '';
    if (sale.items && sale.items.length > 0) {
      productsText = sale.items
        .map((item, i) => {
          const name = item.product?.name || 'Noma\'lum';
          return `${i + 1}\\. ${escMd(name)} — ${item.quantity} qop × ${item.pricePerBag} = ${item.subtotal} USD`;
        })
        .join('\n');
    } else if (sale.product) {
      productsText = `1\\. ${escMd(sale.product.name)} — ${sale.quantity} qop × ${sale.pricePerBag} = ${sale.totalAmount} USD`;
    }

    // To'lov tafsilotlari
    let paymentInfo = '';
    if (sale.paymentDetails) {
      try {
        const d = JSON.parse(sale.paymentDetails);
        const parts: string[] = [];
        if (d.uzs) parts.push(`💵 Naqd: ${Number(d.uzs).toLocaleString()} so'm`);
        if (d.usd) parts.push(`💵 USD: ${d.usd}`);
        if (d.click) parts.push(`📱 Click: ${Number(d.click).toLocaleString()} so'm`);
        paymentInfo = parts.map(escMd).join('\n');
      } catch {
        paymentInfo = escMd(`💰 To'langan: ${sale.paidAmount} USD`);
      }
    } else {
      paymentInfo = escMd(`💰 To'langan: ${sale.paidAmount} USD`);
    }

    const debt = sale.totalAmount - sale.paidAmount;
    const statusEmoji = { PAID: '✅', PARTIAL: '⚠️', UNPAID: '❌' }[sale.paymentStatus] ?? '❓';
    const statusText = escMd({ PAID: "To'liq to'langan", PARTIAL: "Qisman to'langan", UNPAID: "To'lanmagan" }[sale.paymentStatus] ?? sale.paymentStatus);
    const receiptNum = sale.receiptNumber ? `\\#${sale.receiptNumber}` : `\\#${sale.id.slice(-6).toUpperCase()}`;

    const message =
      `🧾 *SOTUV CHEKI ${receiptNum}*\n\n` +
      `👤 *Mijoz:* ${escMd(sale.customer.name)}\n` +
      `📅 *Sana:* ${escMd(new Date(sale.createdAt).toLocaleString('uz-UZ'))}\n\n` +
      `📦 *Mahsulotlar:*\n${productsText}\n\n` +
      `💰 *Jami:* ${sale.totalAmount} USD\n\n` +
      `${paymentInfo}\n\n` +
      `${statusEmoji} *Holat:* ${statusText}` +
      (debt > 0 ? `\n⚠️ *Qarz:* ${debt.toFixed(2)} USD` : '');

    await bot.sendMessage(SALES_CHANNEL_ID, message, {
      message_thread_id: topicId,
      parse_mode: 'MarkdownV2',
    } as any);

    console.log(`✅ Chek forum topicga yuborildi: ${sale.customer.name} (topic ${topicId})`);
  } catch (error: any) {
    console.error('Forum topicga chek yuborishda xatolik:', error?.message || error);
  }
}

/**
 * Umumiy savdolar kanaliga (topic tashqarisiga) xabar yuborish
 */
export async function sendToSalesChannel(message: string): Promise<void> {
  if (!SALES_CHANNEL_ID) return;
  const bot = getChannelBot();
  if (!bot) return;

  try {
    await bot.sendMessage(SALES_CHANNEL_ID, message, { parse_mode: 'MarkdownV2' });
  } catch (error: any) {
    console.error('Kanalga xabar yuborishda xatolik:', error?.message || error);
  }
}

// MarkdownV2 uchun escape
function escMd(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+=|{}.!\\-]/g, '\\$&');
}

// Mijoz kategoriyasiga qarab topic rangi (Telegram rang kodlari)
function getTopicColor(category: string): number {
  const colors: Record<string, number> = {
    VIP: 0x6FB9F0,    // ko'k
    NORMAL: 0xFFD67E, // sariq
    RISK: 0xFF93B2,   // qizil
    NEW: 0xCB86DB,    // binafsha
  };
  return colors[category] ?? 0xFFD67E;
}
