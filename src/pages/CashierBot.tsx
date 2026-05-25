import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  MessageCircle,
  Users,
  Package,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
  WifiOff,
  X,
  ChevronRight,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { useToast } from '../components/ui/Toast';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';

interface CustomerMessage {
  id: string;
  customerName: string;
  message: string;
  telegramChatId: string;
  timestamp: string;
  status: 'new' | 'answered' | 'pending';
}

interface BotStats {
  totalCustomers: number;
  activeChats: number;
  todayMessages: number;
  pendingOrders: number;
}

const EMPTY_STATS: BotStats = {
  totalCustomers: 0,
  activeChats: 0,
  todayMessages: 0,
  pendingOrders: 0,
};

// MUHIM (honesty): backend'da /api/bot/messages, /api/bot/stats, /api/bot/reply
// route'lari MAVJUD EMAS. Server faqat /api/bots/* (status, list, broadcast, ...)
// ni mount qiladi. Shu sababli bu so'rovlar deyarli har doim xatoga tushadi.
// Biz soxta bo'sh ma'lumot KO'RSATMAYMIZ — o'rniga halol xato holati + Toast.
const BOT_UNAVAILABLE_TITLE = latinToCyrillic('Bot xizmati hozircha mavjud emas');
const BOT_UNAVAILABLE_DESC = latinToCyrillic(
  "Kassir boti serveri hali ulanmagan. Xizmat ulanganidan so'ng mijoz xabarlari bu yerda ko'rinadi."
);

export default function CashierBot() {
  const { addToast } = useToast();
  const [messages, setMessages] = useState<CustomerMessage[]>([]);
  const [stats, setStats] = useState<BotStats>(EMPTY_STATS);
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  // Halol xato holati: backend yo'qligini yashirmaymiz.
  const [hasError, setHasError] = useState(false);

  const loadBotData = useCallback(
    async (mode: 'initial' | 'refresh' | 'silent' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);

      try {
        // Haqiqiy backend so'rovlari. .catch(() => bo'sh) MASKALASH OLIB TASHLANDI:
        // agar so'rov xato bersa — bu yerda halol catch'ga tushadi.
        const [messagesRes, statsRes] = await Promise.all([
          api.get('/bot/messages'),
          api.get('/bot/stats'),
        ]);

        const apiMessages: any[] = Array.isArray(messagesRes.data)
          ? messagesRes.data
          : messagesRes.data?.messages ?? [];

        const mapped: CustomerMessage[] = apiMessages.map((msg: any) => ({
          id: String(msg.id ?? crypto.randomUUID()),
          customerName: msg.customer?.name || msg.customerName || latinToCyrillic("Noma'lum"),
          message: msg.message || msg.content || '',
          telegramChatId: msg.telegramChatId || msg.chatId || '',
          timestamp: msg.timestamp || msg.createdAt || new Date().toISOString(),
          status: (msg.status as CustomerMessage['status']) || 'new',
        }));

        setMessages(mapped);
        setStats(statsRes.data ?? EMPTY_STATS);
        setHasError(false);
      } catch (error) {
        console.error('Bot data loading error:', error);
        // Soxta bo'sh muvaffaqiyat EMAS — halol xato holati.
        setHasError(true);
        setMessages([]);
        setStats(EMPTY_STATS);
        setSelectedMessage(null);
        // Faqat foydalanuvchi o'zi yangilaganda Toast — silent poll'da spam qilmaymiz.
        if (mode !== 'silent') {
          addToast({
            type: 'error',
            title: BOT_UNAVAILABLE_TITLE,
            message: latinToCyrillic(
              "Server bilan bog'lanib bo'lmadi. Keyinroq qayta urinib ko'ring."
            ),
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [addToast]
  );

  useEffect(() => {
    loadBotData('initial');
    const interval = setInterval(() => loadBotData('silent'), 30000);
    return () => clearInterval(interval);
  }, [loadBotData]);

  const sendReply = async () => {
    if (!selectedMessage || !replyText.trim() || sending) return;

    setSending(true);
    try {
      await api.post('/bot/reply', {
        chatId: selectedMessage.telegramChatId,
        message: replyText,
        originalMessageId: selectedMessage.id,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === selectedMessage.id ? { ...msg, status: 'answered' as const } : msg
        )
      );

      setReplyText('');
      setSelectedMessage(null);
      addToast({ type: 'success', title: latinToCyrillic('Javob yuborildi') });
    } catch (error) {
      console.error('Reply send error:', error);
      addToast({
        type: 'error',
        title: latinToCyrillic('Javob yuborilmadi'),
        message: latinToCyrillic("Bot xizmati ulanmagan. Keyinroq qayta urinib ko'ring."),
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return latinToCyrillic('hozir');
    if (minutes < 60) return `${minutes} ${latinToCyrillic('daqiqa oldin')}`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)} ${latinToCyrillic('soat oldin')}`;
    return date.toLocaleDateString('uz-UZ');
  };

  const statusMeta: Record<
    CustomerMessage['status'],
    { label: string; chip: string; icon: typeof AlertCircle }
  > = {
    new: {
      label: latinToCyrillic('Yangi'),
      chip: 'bg-rose-50 text-rose-700 border-rose-200/70',
      icon: AlertCircle,
    },
    answered: {
      label: latinToCyrillic('Javob berildi'),
      chip: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
      icon: CheckCircle,
    },
    pending: {
      label: latinToCyrillic('Kutilmoqda'),
      chip: 'bg-amber-50 text-amber-700 border-amber-200/70',
      icon: Clock,
    },
  };

  const nf = (n: number) => n.toLocaleString('en-US');

  const statCards = [
    { label: 'Jami mijozlar', value: stats.totalCustomers, icon: Users, tint: 'bg-sky-50 text-sky-600' },
    { label: 'Faol suhbatlar', value: stats.activeChats, icon: MessageCircle, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Bugungi xabarlar', value: stats.todayMessages, icon: Send, tint: 'bg-indigo-50 text-indigo-600' },
    { label: 'Kutilayotgan buyurtma', value: stats.pendingOrders, icon: Package, tint: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Kassir boti')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {latinToCyrillic('Mijozlar bilan Telegram orqali muloqot')}
          </p>
        </div>
        <button
          onClick={() => loadBotData('refresh')}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98] self-start"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {latinToCyrillic('Yangilash')}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white border border-slate-200/70 p-5 h-[110px] animate-pulse"
              />
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="rounded-2xl bg-white border border-slate-200/70 p-5 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400 leading-tight">
                      {latinToCyrillic(card.label)}
                    </p>
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${card.tint}`}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                    </div>
                  </div>
                  <p className="mt-3 text-2xl font-bold text-slate-900 tracking-tight tabular-nums">
                    {nf(card.value)}
                  </p>
                </div>
              );
            })}
      </div>

      {/* Body */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : hasError ? (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={WifiOff}
            title={BOT_UNAVAILABLE_TITLE}
            description={BOT_UNAVAILABLE_DESC}
            action={
              <button
                onClick={() => loadBotData('refresh')}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {latinToCyrillic('Qayta urinish')}
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Messages list */}
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="flex items-center gap-2 px-5 sm:px-6 py-4 border-b border-slate-200/70">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <MessageCircle className="w-[18px] h-[18px]" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                {latinToCyrillic('Mijoz xabarlari')}
              </h2>
              {messages.length > 0 && (
                <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 tabular-nums">
                  {messages.length}
                </span>
              )}
            </div>

            {messages.length === 0 ? (
              <EmptyState
                icon={MessageCircle}
                title={latinToCyrillic("Xabarlar yo'q")}
                description={latinToCyrillic(
                  'Hozircha mijozlardan yangi xabar kelmagan. Yangi xabarlar bu yerda avtomatik chiqadi.'
                )}
              />
            ) : (
              <div className="p-4 sm:p-5 space-y-3 max-h-[28rem] overflow-y-auto">
                {messages.map((message) => {
                  const meta = statusMeta[message.status];
                  const StatusIcon = meta.icon;
                  const active = selectedMessage?.id === message.id;
                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => setSelectedMessage(message)}
                      className={`group w-full text-left p-4 rounded-2xl border transition-all duration-200 active:scale-[0.99] ${
                        active
                          ? 'border-indigo-300 bg-indigo-50/50 ring-1 ring-indigo-200'
                          : 'border-slate-200/70 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                            <Users className="w-[18px] h-[18px]" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">
                              {message.customerName}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {formatTime(message.timestamp)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border flex-shrink-0 ${meta.chip}`}
                        >
                          <StatusIcon className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3 pl-12">
                        {message.message}
                      </p>
                      <div className="flex items-center justify-end mt-2 text-xs font-semibold text-indigo-600">
                        {latinToCyrillic('Javob berish')}
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reply panel */}
          <div className="bg-white rounded-2xl border border-slate-200/70 overflow-hidden">
            <div className="flex items-center gap-2 px-5 sm:px-6 py-4 border-b border-slate-200/70">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Send className="w-[18px] h-[18px]" />
              </div>
              <h2 className="text-sm font-semibold text-slate-900">
                {latinToCyrillic('Javob yozish')}
              </h2>
            </div>

            <div className="p-5 sm:p-6">
              {selectedMessage ? (
                <div className="space-y-4">
                  {/* Original message preview */}
                  <div className="rounded-2xl border border-slate-200/70 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center flex-shrink-0">
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm truncate">
                            {selectedMessage.customerName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatTime(selectedMessage.timestamp)}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedMessage(null);
                          setReplyText('');
                        }}
                        title={latinToCyrillic('Yopish')}
                        aria-label={latinToCyrillic('Tanlovni bekor qilish')}
                        className="flex-shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {selectedMessage.message}
                    </p>
                  </div>

                  {/* Reply textarea */}
                  <div className="space-y-1.5">
                    <label htmlFor="reply-text" className="block text-sm font-semibold text-slate-700">
                      {latinToCyrillic('Javob matni')}
                    </label>
                    <textarea
                      id="reply-text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={5}
                      placeholder={latinToCyrillic('Javobingizni shu yerga yozing…')}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 resize-none transition-all focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 focus:bg-white hover:border-slate-300"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={sendReply}
                      disabled={!replyText.trim() || sending}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                      {sending ? latinToCyrillic('Yuborilmoqda…') : latinToCyrillic('Javob yuborish')}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedMessage(null);
                        setReplyText('');
                      }}
                      disabled={sending}
                      className="px-4 py-3 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {latinToCyrillic('Bekor qilish')}
                    </button>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={MessageCircle}
                  title={latinToCyrillic('Xabar tanlanmagan')}
                  description={latinToCyrillic(
                    "Javob berish uchun chap tomondagi ro'yxatdan mijoz xabarini tanlang."
                  )}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
