import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { prisma } from '../utils/prisma';

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';

// In-memory map for pending auth state (phoneCodeHash)
const pendingAuth = new Map<string, { phoneCodeHash: string; phone: string }>();

function makeClient(session: string = '') {
  if (!API_ID || !API_HASH) throw new Error('TELEGRAM_API_ID yoki TELEGRAM_API_HASH sozlanmagan');
  return new TelegramClient(new StringSession(session), API_ID, API_HASH, {
    connectionRetries: 3,
    requestRetries: 2,
    autoReconnect: true,
    deviceModel: 'LuxPetPlast ERP',
    appVersion: '1.0',
    langCode: 'uz',
  });
}

export class TelegramUserService {
  // Step 1: send verification code
  static async sendCode(userId: string, phone: string) {
    const client = makeClient();
    await client.connect();
    const result = await client.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone);
    pendingAuth.set(userId, { phoneCodeHash: result.phoneCodeHash, phone });
    await client.disconnect();
    return { sent: true };
  }

  // Step 2: verify code and save session
  static async verifyCode(userId: string, code: string) {
    const pending = pendingAuth.get(userId);
    if (!pending) throw new Error('Avval kod yuborish kerak');
    const { phoneCodeHash, phone } = pending;

    const client = makeClient();
    await client.connect();
    await client.invoke(
      new (require('telegram/tl').Api.auth.SignIn)({
        phoneNumber: phone,
        phoneCodeHash,
        phoneCode: code,
      })
    );
    const session = (client.session as StringSession).save();
    await client.disconnect();

    await prisma.user.update({
      where: { id: userId },
      data: { telegramSession: session, telegramPhone: phone, telegramLinkedAt: new Date() },
    });
    pendingAuth.delete(userId);
    return { linked: true, phone };
  }

  // Unlink telegram
  static async unlink(userId: string) {
    // Try to terminate the session on Telegram side
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramSession: true } });
    if (user?.telegramSession) {
      try {
        const client = makeClient(user.telegramSession);
        await client.connect();
        await client.invoke(new (require('telegram/tl').Api.auth.LogOut)({}));
        await client.disconnect();
      } catch { /* ignore — clean up DB regardless */ }
    }
    await prisma.user.update({
      where: { id: userId },
      data: { telegramSession: null, telegramPhone: null, telegramLinkedAt: null },
    });
    return { unlinked: true };
  }

  // Send a message to any chatId using userId's session
  static async sendMessage(userId: string, chatId: string, text: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramSession: true, name: true },
    });
    if (!user?.telegramSession) throw new Error('Telegram ulanmagan');

    const client = makeClient(user.telegramSession);
    await client.connect();
    try {
      await client.sendMessage(chatId, { message: text });
    } finally {
      await client.disconnect();
    }
  }

  // Format receipt message
  static formatReceipt(opts: {
    cashierName: string;
    customerName: string;
    items: { name: string; qty: number; price: number; currency: string }[];
    total: number;
    currency: string;
    paymentMethod: string;
    receiptNumber?: number;
  }) {
    const lines = opts.items.map(
      (i) => `  • ${i.name}: ${i.qty} × ${i.currency === 'USD' ? '$' : ''}${i.price.toLocaleString()} ${i.currency === 'USD' ? '' : 'UZS'}`
    );
    const pay = opts.paymentMethod === 'CARD' ? '💳 Karta' : opts.paymentMethod === 'CLICK' ? '📱 Click' : '💵 Naqd';
    const sym = opts.currency === 'USD' ? '$' : '';
    const unit = opts.currency === 'USD' ? '' : ' UZS';
    return [
      `🛍 *Xarid cheki* — LuxPetPlast`,
      opts.receiptNumber ? `📄 Chek #${opts.receiptNumber}` : '',
      `👤 Mijoz: ${opts.customerName}`,
      `👩‍💼 Kassir: ${opts.cashierName}`,
      ``,
      ...lines,
      ``,
      `💰 Jami: ${sym}${opts.total.toLocaleString()}${unit}`,
      `${pay}`,
      `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`,
    ].filter(Boolean).join('\n');
  }

  static formatPaymentConfirmation(opts: {
    cashierName: string;
    customerName: string;
    amount: number;
    currency: string;
    remainingDebt: number;
    debtCurrency: string;
  }) {
    const sym = opts.currency === 'USD' ? '$' : '';
    const unit = opts.currency === 'USD' ? '' : ' UZS';
    const dsym = opts.debtCurrency === 'USD' ? '$' : '';
    const dunit = opts.debtCurrency === 'USD' ? '' : ' UZS';
    return [
      `✅ *To'lov qabul qilindi* — LuxPetPlast`,
      ``,
      `👤 Mijoz: ${opts.customerName}`,
      `👩‍💼 Kassir: ${opts.cashierName}`,
      `💵 To'lov: ${sym}${opts.amount.toLocaleString()}${unit}`,
      opts.remainingDebt > 0
        ? `⚠️ Qolgan qarz: ${dsym}${opts.remainingDebt.toLocaleString()}${dunit}`
        : `✨ Qarz yo'q!`,
      `🕐 ${new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' })}`,
    ].join('\n');
  }
}
