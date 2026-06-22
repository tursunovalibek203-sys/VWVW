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

type CustomerContact = {
  telegramChatId?: string | null;
  telegramUsername?: string | null;
  telegramTopicId?: number | null;
  phone?: string | null;
};

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

  // Returns peer identifiers to try in priority order: chatId → @username → +phone
  static resolveCustomerPeers(customer: CustomerContact): string[] {
    const peers: string[] = [];
    if (customer.telegramChatId) peers.push(customer.telegramChatId);
    if (customer.telegramUsername) {
      const u = customer.telegramUsername.trim();
      peers.push(u.startsWith('@') ? u : `@${u}`);
    }
    if (customer.phone) {
      const p = customer.phone.replace(/\s+/g, '');
      peers.push(p.startsWith('+') ? p : `+${p}`);
    }
    return peers;
  }

  // Find sender: cashier first, fall back to any admin with a linked session
  static async findActiveSender(preferredUserId: string): Promise<{ id: string; name: string; session: string } | null> {
    const cashier = await prisma.user.findUnique({
      where: { id: preferredUserId },
      select: { id: true, name: true, telegramSession: true },
    });
    if (cashier?.telegramSession) {
      return { id: cashier.id, name: cashier.name, session: cashier.telegramSession };
    }
    const admin = await prisma.user.findFirst({
      where: { telegramSession: { not: null } },
      select: { id: true, name: true, telegramSession: true },
    });
    if (admin?.telegramSession) {
      return { id: admin.id, name: admin.name, session: admin.telegramSession };
    }
    return null;
  }

  // Low-level: send text to a Telegram peer from an active session string.
  // topicId: forum group message_thread_id (pass to send into a specific topic)
  static async sendMessage(userId: string, chatId: string, text: string, topicId?: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { telegramSession: true, name: true },
    });
    if (!user?.telegramSession) throw new Error('Telegram ulanmagan');
    await TelegramUserService._send(user.telegramSession, chatId, text, topicId);
  }

  // Internal send (uses session string directly)
  private static async _send(session: string, peer: string, text: string, topicId?: number) {
    const client = makeClient(session);
    await client.connect();
    try {
      const opts: Parameters<typeof client.sendMessage>[1] = { message: text, parseMode: 'markdown' };
      if (topicId) (opts as any).replyTo = topicId;
      await client.sendMessage(peer, opts);
    } finally {
      await client.disconnect();
    }
  }

  // Send to customer: tries all available identifiers (chatId → @username → +phone)
  // Also supports forum group topics via telegramTopicId
  static async sendToCustomer(
    session: string,
    customer: CustomerContact,
    text: string,
  ): Promise<{ peer: string }> {
    const peers = this.resolveCustomerPeers(customer);
    if (!peers.length) throw new Error('Mijozda Telegram kontakt yo\'q (chatId, username yoki telefon kerak)');

    const topicId = customer.telegramTopicId ?? undefined;
    let lastError: Error | undefined;

    for (const peer of peers) {
      try {
        await this._send(session, peer, text, topicId);
        return { peer };
      } catch (e: any) {
        lastError = e;
        console.warn(`⚠️ Telegram peer ${peer} orqali yuborishda xatolik: ${e.message}`);
      }
    }
    throw lastError || new Error('Xabar yuborib bo\'lmadi');
  }

  // Format full sale receipt with debt details in both currencies
  static formatFullReceipt(opts: {
    cashierName: string;
    customerName: string;
    items: Array<{ productName: string; bags: number; pricePerBag: number; subtotal: number }>;
    totalAmount: number;
    paidAmount: number;
    debtFromSale: number;
    currency: string;
    paymentMethod: string;
    previousDebtUZS: number;
    previousDebtUSD: number;
    currentDebtUZS: number;
    currentDebtUSD: number;
    exchangeRate: number;
    receiptNumber?: number;
  }): string {
    const now = new Date().toLocaleString('uz-UZ', { timeZone: 'Asia/Tashkent' });
    const isUZS = opts.currency !== 'USD';

    const payIcon: Record<string, string> = {
      CARD: '💳 Karta',
      CLICK: '📱 Click',
      CASH: '💵 Naqd',
      TRANSFER: '🏦 O\'tkazma',
    };
    const payLabel = payIcon[opts.paymentMethod] ?? '💵 Naqd';

    const fmtUZS = (v: number) => `${Math.round(Math.abs(v)).toLocaleString()} so'm`;
    const fmtUSD = (v: number) => `$${Math.abs(v).toFixed(2)}`;
    const fmt = (v: number) => isUZS ? fmtUZS(v) : fmtUSD(v);

    const itemLines = opts.items.map((i) =>
      `  • ${i.productName}: ${i.bags} qop × ${fmtUZS(i.pricePerBag)} = *${fmt(i.subtotal)}*`
    );

    const lines: string[] = [
      `🛍 *Xarid cheki* — LuxPetPlast`,
      opts.receiptNumber ? `📄 Chek #${opts.receiptNumber}` : '',
      `👤 *${opts.customerName}*  |  👩‍💼 ${opts.cashierName}`,
      `🕐 ${now}`,
      ``,
      ...itemLines,
      ``,
      `💰 *Jami: ${fmt(opts.totalAmount)}*`,
      `${payLabel}: ${fmt(opts.paidAmount)}`,
    ];

    if (opts.debtFromSale > 0) {
      lines.push(`⚠️ Ushbu savdodan qarz: *${fmt(opts.debtFromSale)}*`);
    }

    lines.push(``);
    lines.push(`📊 *Qarz holati:*`);
    const hasOldDebt = opts.previousDebtUZS > 0 || opts.previousDebtUSD > 0;
    if (hasOldDebt) {
      lines.push(`  Oldingi: ${fmtUZS(opts.previousDebtUZS)} | ${fmtUSD(opts.previousDebtUSD)}`);
    }

    const hasDebt = opts.currentDebtUZS > 0 || opts.currentDebtUSD > 0;
    if (hasDebt) {
      lines.push(`  ⚠️ *Hozirgi: ${fmtUZS(opts.currentDebtUZS)} | ${fmtUSD(opts.currentDebtUSD)}*`);
    } else {
      lines.push(`  ✅ Qarz yo'q!`);
    }

    lines.push(``);
    lines.push(`_powered by akm_`);

    return lines.filter((l) => l !== undefined && l !== null).join('\n');
  }

  // Main entry point: find sender, format receipt, send to customer via all available channels
  static async sendSaleReceipt(opts: {
    preferredSenderId: string;
    customer: CustomerContact & { name: string };
    items: Array<{ productName: string; bags: number; pricePerBag: number; subtotal: number }>;
    totalAmount: number;
    paidAmount: number;
    debtFromSale: number;
    currency: string;
    paymentMethod: string;
    previousDebtUZS: number;
    previousDebtUSD: number;
    currentDebtUZS: number;
    currentDebtUSD: number;
    exchangeRate: number;
    receiptNumber?: number;
  }): Promise<{ peer: string; senderName: string }> {
    const sender = await this.findActiveSender(opts.preferredSenderId);
    if (!sender) throw new Error('Birorta kassir/admin Telegram ulamagan');

    const text = this.formatFullReceipt({
      cashierName: sender.name,
      customerName: opts.customer.name,
      items: opts.items,
      totalAmount: opts.totalAmount,
      paidAmount: opts.paidAmount,
      debtFromSale: opts.debtFromSale,
      currency: opts.currency,
      paymentMethod: opts.paymentMethod,
      previousDebtUZS: opts.previousDebtUZS,
      previousDebtUSD: opts.previousDebtUSD,
      currentDebtUZS: opts.currentDebtUZS,
      currentDebtUSD: opts.currentDebtUSD,
      exchangeRate: opts.exchangeRate,
      receiptNumber: opts.receiptNumber,
    });

    const result = await this.sendToCustomer(sender.session, opts.customer, text);
    return { peer: result.peer, senderName: sender.name };
  }

  // Legacy: simple format for backward compat
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

  // --- Forum topic (supergroup) ---

  // Get configured forum group ID from SystemSettings or env
  static async getForumGroupId(): Promise<string | null> {
    const fromEnv = process.env.TELEGRAM_SALES_CHANNEL_ID || process.env.TELEGRAM_FORUM_GROUP_ID || '';
    if (fromEnv) return fromEnv;
    try {
      const row = await prisma.systemSettings.findUnique({ where: { key: 'telegram_forum_group_id' } });
      return row?.value || null;
    } catch {
      return null;
    }
  }

  // Save forum group ID to SystemSettings
  static async setForumGroupId(groupId: string, updatedBy: string): Promise<void> {
    await (prisma.systemSettings as any).upsert({
      where: { key: 'telegram_forum_group_id' },
      create: { key: 'telegram_forum_group_id', value: groupId, description: 'Mijozlar forum guruhi ID', updatedBy },
      update: { value: groupId, updatedBy },
    });
  }

  // Create a forum topic for a customer using a personal gramjs session.
  // Returns { topicId, groupId } and saves them to the customer record.
  static async createCustomerForumTopic(
    preferredSenderId: string,
    customerId: string,
    groupIdOverride?: string,
  ): Promise<{ topicId: number; groupId: string } | null> {
    const groupId = groupIdOverride || await this.getForumGroupId();
    if (!groupId) {
      console.warn('⚠️ Forum group ID sozlanmagan (telegram_forum_group_id)');
      return null;
    }

    const sender = await this.findActiveSender(preferredSenderId);
    if (!sender) {
      console.warn('⚠️ Gramjs session topilmadi — forum topic yaratib bo\'lmadi');
      return null;
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return null;

    if (customer.telegramTopicId) {
      return { topicId: customer.telegramTopicId, groupId: customer.telegramChatId || groupId };
    }

    const client = makeClient(sender.session);
    await client.connect();
    let topicId: number | null = null;
    try {
      const groupPeer = await client.getEntity(groupId);
      const updates = await client.invoke(new Api.channels.CreateForumTopic({
        channel: groupPeer as any,
        title: customer.name,
        randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      }));
      // Extract topic ID from Updates result
      const upd = updates as any;
      for (const u of upd?.updates || []) {
        if (u?.message?.id) { topicId = u.message.id; break; }
        if (u?.id && typeof u.id === 'number' && u.id > 0) { topicId = u.id; break; }
      }
      if (!topicId && upd?.id) topicId = upd.id;
    } finally {
      await client.disconnect();
    }

    if (!topicId) {
      console.error('⚠️ Forum topic ID olinmadi');
      return null;
    }

    // Save to customer
    await prisma.customer.update({
      where: { id: customerId },
      data: { telegramChatId: groupId, telegramTopicId: topicId },
    });

    // Send a welcome intro message to the new topic
    try {
      const intro = [
        `👤 *${customer.name}*`,
        `📞 ${customer.phone}`,
        customer.telegramUsername ? `🔗 @${customer.telegramUsername}` : '',
        customer.address ? `📍 ${customer.address}` : '',
        `📂 Kategoriya: ${customer.category}`,
        ``,
        `_Bu topic avtomatik yaratildi — LuxPetPlast ERP_`,
      ].filter(Boolean).join('\n');

      await this._send(sender.session, groupId, intro, topicId);
    } catch { /* intro xatoligi kritik emas */ }

    console.log(`✅ ${customer.name} uchun forum topic yaratildi: topicId=${topicId}, group=${groupId}`);
    return { topicId, groupId };
  }

  // ─── KASSA TOPIC ──────────────────────────────────────────────────────────

  static async getKassaTopicId(): Promise<number | null> {
    try {
      const row = await prisma.systemSettings.findUnique({ where: { key: 'telegram_kassa_topic_id' } });
      return row?.value ? parseInt(row.value) : null;
    } catch { return null; }
  }

  static async getHisobotTopicId(): Promise<number | null> {
    try {
      const row = await prisma.systemSettings.findUnique({ where: { key: 'telegram_hisobot_topic_id' } });
      return row?.value ? parseInt(row.value) : null;
    } catch { return null; }
  }

  /** "📊 Hisobotlar" nomli topic yaratadi va ID ni saqlaydi */
  static async createHisobotTopic(preferredSenderId: string): Promise<{ topicId: number; groupId: string } | null> {
    const groupId = await this.getForumGroupId();
    if (!groupId) { console.warn('⚠️ Forum group ID sozlanmagan'); return null; }

    const sender = await this.findActiveSender(preferredSenderId);
    if (!sender) { console.warn('⚠️ Gramjs session topilmadi'); return null; }

    const client = makeClient(sender.session);
    await client.connect();
    let topicId: number | null = null;
    try {
      const groupPeer = await client.getEntity(groupId);
      const updates = await client.invoke(new Api.channels.CreateForumTopic({
        channel: groupPeer as any,
        title: '📊 Hisobotlar',
        randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      }));
      const upd = updates as any;
      for (const u of upd?.updates || []) {
        if (u?.message?.id) { topicId = u.message.id; break; }
        if (u?.id && typeof u.id === 'number' && u.id > 0) { topicId = u.id; break; }
      }
      if (!topicId && upd?.id) topicId = upd.id;
    } finally {
      await client.disconnect();
    }

    if (!topicId) { console.error('⚠️ Hisobot topic ID olinmadi'); return null; }

    await (prisma.systemSettings as any).upsert({
      where: { key: 'telegram_hisobot_topic_id' },
      create: { key: 'telegram_hisobot_topic_id', value: String(topicId), description: 'Hisobotlar forum topic ID', updatedBy: preferredSenderId },
      update: { value: String(topicId), updatedBy: preferredSenderId },
    });

    try {
      await this._send(sender.session, groupId,
        `📊 *Hisobotlar* — LuxPetPlast\n\n_Kunlik Excel hisobotlar har kuni soat 19:00 da shu yerga yuboriladi._`,
        topicId
      );
    } catch { /* skip */ }

    console.log(`✅ Hisobot topic yaratildi: topicId=${topicId}`);
    return { topicId, groupId };
  }

  /** "💰 Kassa" nomli topic yaratadi va ID ni saqlaydi */
  static async createKassaTopic(preferredSenderId: string): Promise<{ topicId: number; groupId: string } | null> {
    const groupId = await this.getForumGroupId();
    if (!groupId) { console.warn('⚠️ Forum group ID sozlanmagan'); return null; }

    const sender = await this.findActiveSender(preferredSenderId);
    if (!sender) { console.warn('⚠️ Gramjs session topilmadi'); return null; }

    const client = makeClient(sender.session);
    await client.connect();
    let topicId: number | null = null;
    try {
      const groupPeer = await client.getEntity(groupId);
      const updates = await client.invoke(new Api.channels.CreateForumTopic({
        channel: groupPeer as any,
        title: '💰 Kassa',
        randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
      }));
      const upd = updates as any;
      for (const u of upd?.updates || []) {
        if (u?.message?.id) { topicId = u.message.id; break; }
        if (u?.id && typeof u.id === 'number' && u.id > 0) { topicId = u.id; break; }
      }
      if (!topicId && upd?.id) topicId = upd.id;
    } finally {
      await client.disconnect();
    }

    if (!topicId) { console.error('⚠️ Kassa topic ID olinmadi'); return null; }

    await (prisma.systemSettings as any).upsert({
      where: { key: 'telegram_kassa_topic_id' },
      create: { key: 'telegram_kassa_topic_id', value: String(topicId), description: 'Kassa forum topic ID', updatedBy: preferredSenderId },
      update: { value: String(topicId), updatedBy: preferredSenderId },
    });

    try {
      await this._send(sender.session, groupId,
        `💰 *Kassa* — LuxPetPlast\n\n_Barcha kassa kirim va chiqimlari shu yerda ko'rinadi._`,
        topicId
      );
    } catch { /* skip */ }

    console.log(`✅ Kassa topic yaratildi: topicId=${topicId}`);
    return { topicId, groupId };
  }

  /** Kassa topicga xabar yuborish */
  static async sendToKassaTopic(text: string): Promise<void> {
    try {
      const [groupId, kassaTopicId] = await Promise.all([
        this.getForumGroupId(),
        this.getKassaTopicId(),
      ]);
      if (!groupId || !kassaTopicId) return;

      const sender = await this.findActiveSender('');
      if (!sender) return;

      await this._send(sender.session, groupId, text, kassaTopicId);
    } catch (e: any) {
      console.warn('Kassa topicga yuborishda xatolik:', e.message);
    }
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
