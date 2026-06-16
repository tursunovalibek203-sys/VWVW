import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { computeCheck } from 'telegram/Password';
import { prisma } from '../utils/prisma';

const API_ID = parseInt(process.env.TELEGRAM_API_ID || '0');
const API_HASH = process.env.TELEGRAM_API_HASH || '';

// In-memory map for pending auth state (phoneCodeHash + session — must reuse same DC connection)
const pendingAuth = new Map<string, { phoneCodeHash: string; phone: string; session: string }>();

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
    // Save the session used for sendCode — Telegram may migrate to a different DC,
    // and phoneCodeHash is only valid against that same DC connection.
    const session = (client.session as StringSession).save();
    pendingAuth.set(userId, { phoneCodeHash: result.phoneCodeHash, phone, session });
    await client.disconnect();
    return { sent: true };
  }

  // Step 2: verify code and save session (or signal that 2FA password is needed)
  static async verifyCode(userId: string, code: string): Promise<{ linked: true; phone: string } | { needPassword: true }> {
    const pending = pendingAuth.get(userId);
    if (!pending) throw new Error('Avval kod yuborish kerak');
    const { phoneCodeHash, phone, session } = pending;

    const client = makeClient(session);
    await client.connect();
    try {
      await client.invoke(
        new Api.auth.SignIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code })
      );
    } catch (e: any) {
      // 2FA cloud password enabled — keep session, ask for password next
      if (e?.errorMessage === 'SESSION_PASSWORD_NEEDED' || /SESSION_PASSWORD_NEEDED/.test(e?.message || '')) {
        const updatedSession = (client.session as StringSession).save();
        pendingAuth.set(userId, { phoneCodeHash, phone, session: updatedSession });
        await client.disconnect();
        return { needPassword: true };
      }
      await client.disconnect();
      throw e;
    }

    const newSession = (client.session as StringSession).save();
    await client.disconnect();

    await prisma.user.update({
      where: { id: userId },
      data: { telegramSession: newSession, telegramPhone: phone, telegramLinkedAt: new Date() },
    });
    pendingAuth.delete(userId);
    return { linked: true, phone };
  }

  // Step 3 (only if account has 2FA cloud password enabled)
  static async verifyPassword(userId: string, password: string) {
    const pending = pendingAuth.get(userId);
    if (!pending) throw new Error('Sessiya topilmadi, qaytadan urinib ko\'ring');

    const client = makeClient(pending.session);
    await client.connect();
    try {
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      const srpCheck = await computeCheck(passwordInfo, password);
      await client.invoke(new Api.auth.CheckPassword({ password: srpCheck }));
    } catch (e) {
      await client.disconnect();
      throw e;
    }

    const session = (client.session as StringSession).save();
    await client.disconnect();

    await prisma.user.update({
      where: { id: userId },
      data: { telegramSession: session, telegramPhone: pending.phone, telegramLinkedAt: new Date() },
    });
    pendingAuth.delete(userId);
    return { linked: true, phone: pending.phone };
  }

  // Unlink telegram
  static async unlink(userId: string) {
    // Try to terminate the session on Telegram side
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramSession: true } });
    if (user?.telegramSession) {
      try {
        const client = makeClient(user.telegramSession);
        await client.connect();
        await client.invoke(new Api.auth.LogOut());
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
