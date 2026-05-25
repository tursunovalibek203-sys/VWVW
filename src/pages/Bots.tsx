import { useCallback, useEffect, useState } from 'react';
import {
  Bot,
  Send,
  RefreshCw,
  Power,
  Megaphone,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import api from '../lib/professionalApi';

// Server javob shakllari (server/routes/bot-api.ts):
//   GET /bots/list   -> { success, data: { bots: [{ name, active, type }], totalCount } }
//   GET /bots/status -> { success, data: { totalBots, activeBots, inactiveBots, botStatus: {[name]: 'active'|'inactive'} } }
interface BotListItem {
  name: string;
  active: boolean;
  type: string;
}

interface BotStatusReport {
  totalBots: number;
  activeBots: number;
  inactiveBots: number;
  botStatus: Record<string, string>;
}

interface BotView {
  name: string;
  type: string;
  online: boolean;
}

// Bot turi uchun ko'rsatma nomi (brend nomlar lotin holida qoldiriladi)
const TYPE_LABELS: Record<string, string> = {
  customer: 'Mijoz',
  cashier: 'Kassa',
  admin: 'Admin',
  delivery: 'Yetkazib berish',
  marketing: 'Marketing',
};

function prettyType(type: string): string {
  const label = TYPE_LABELS[type?.toLowerCase?.()] ?? type;
  return latinToCyrillic(label);
}

export default function Bots() {
  const { addToast } = useToast();

  const [bots, setBots] = useState<BotView[]>([]);
  const [report, setReport] = useState<BotStatusReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Broadcast modal
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcasting, setBroadcasting] = useState(false);

  // Restart tasdiqlash
  const [restartTarget, setRestartTarget] = useState<string | null>(null);
  const [restarting, setRestarting] = useState(false);

  const loadBots = useCallback(async () => {
    setRefreshing(true);
    setLoadError(false);
    try {
      // Ro'yxat va holatni parallel olamiz; biri ishlamasa ham ikkinchisidan foydalanamiz
      const [listRes, statusRes] = await Promise.allSettled([
        api.get('/bots/list'),
        api.get('/bots/status'),
      ]);

      let list: BotListItem[] = [];
      let statusReport: BotStatusReport | null = null;

      if (listRes.status === 'fulfilled') {
        const payload = listRes.value.data?.data;
        list = Array.isArray(payload?.bots) ? payload.bots : [];
      }

      if (statusRes.status === 'fulfilled') {
        const payload = statusRes.value.data?.data;
        if (payload && typeof payload === 'object') {
          statusReport = {
            totalBots: payload.totalBots ?? 0,
            activeBots: payload.activeBots ?? 0,
            inactiveBots: payload.inactiveBots ?? 0,
            botStatus: payload.botStatus ?? {},
          };
        }
      }

      // Ikkala chaqiruv ham muvaffaqiyatsiz bo'lsa - halol xato holati
      if (listRes.status === 'rejected' && statusRes.status === 'rejected') {
        setBots([]);
        setReport(null);
        setLoadError(true);
        addToast({
          type: 'error',
          title: latinToCyrillic('Botlarni yuklab bo\'lmadi'),
          message: latinToCyrillic('Server bilan aloqa yo\'q. Internetni tekshiring.'),
        });
        return;
      }

      // Holat hisobotini ro'yxat bilan birlashtiramiz
      const merged: BotView[] = list.map((b) => {
        const reported = statusReport?.botStatus?.[b.name];
        const online = reported !== undefined ? reported === 'active' : b.active;
        return { name: b.name, type: b.type, online };
      });

      // Agar ro'yxat bo'sh, lekin holatda botlar bo'lsa - holatdan tiklaymiz
      if (merged.length === 0 && statusReport) {
        Object.entries(statusReport.botStatus).forEach(([name, st]) => {
          merged.push({ name, type: name, online: st === 'active' });
        });
      }

      setBots(merged);
      setReport(statusReport);
    } catch {
      setBots([]);
      setReport(null);
      setLoadError(true);
      addToast({
        type: 'error',
        title: latinToCyrillic('Botlarni yuklab bo\'lmadi'),
        message: latinToCyrillic('Noma\'lum xatolik yuz berdi.'),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  const handleBroadcast = async () => {
    const message = broadcastMsg.trim();
    if (!message) {
      addToast({
        type: 'warning',
        title: latinToCyrillic('Xabar matni bo\'sh'),
        message: latinToCyrillic('Iltimos, xabar matnini kiriting.'),
      });
      return;
    }
    setBroadcasting(true);
    try {
      await api.post('/bots/broadcast', { message });
      addToast({
        type: 'success',
        title: latinToCyrillic('Xabar yuborildi'),
        message: latinToCyrillic('Xabar muvaffaqiyatli uzatildi.'),
      });
      setBroadcastMsg('');
      setBroadcastOpen(false);
    } catch {
      addToast({
        type: 'error',
        title: latinToCyrillic('Yuborib bo\'lmadi'),
        message: latinToCyrillic('Xabar yuborishda xatolik. Qayta urinib ko\'ring.'),
      });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleRestart = async () => {
    if (!restartTarget) return;
    const name = restartTarget;
    setRestarting(true);
    try {
      await api.post(`/bots/restart/${encodeURIComponent(name)}`);
      addToast({
        type: 'success',
        title: latinToCyrillic('Bot qayta yoqildi'),
        message: `${name} ${latinToCyrillic('muvaffaqiyatli qayta yoqildi.')}`,
      });
      setRestartTarget(null);
      // Holatni yangilaymiz
      loadBots();
    } catch {
      addToast({
        type: 'error',
        title: latinToCyrillic('Qayta yoqilmadi'),
        message: `${name} ${latinToCyrillic('botni qayta yoqib bo\'lmadi.')}`,
      });
    } finally {
      setRestarting(false);
    }
  };

  const total = report?.totalBots ?? bots.length;
  const active = report?.activeBots ?? bots.filter((b) => b.online).length;
  const inactive = report?.inactiveBots ?? bots.filter((b) => !b.online).length;

  return (
    <div className="min-h-screen bg-gray-50/60 pb-24">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-6 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {latinToCyrillic('Bot boshqaruvi')}
                </h1>
                <p className="mt-1 text-sm text-white/80">
                  Telegram {latinToCyrillic('botlar holati va boshqaruvi')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setBroadcastOpen(true)}
                disabled={loading || bots.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold backdrop-blur-sm border border-white/20 transition-all duration-200 active:scale-95"
              >
                <Megaphone className="w-4 h-4" />
                {latinToCyrillic('Xabar yuborish')}
              </button>
              <button
                onClick={loadBots}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 disabled:opacity-60 text-blue-700 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 active:scale-95"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {latinToCyrillic('Yangilash')}
              </button>
            </div>
          </div>

          {/* Inline stats inside hero */}
          <div className="relative mt-6 flex items-center gap-6 text-white/90">
            <div>
              <p className="text-2xl font-bold">{loading ? '—' : total}</p>
              <p className="text-xs text-white/70">{latinToCyrillic('Jami botlar')}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-emerald-200">{loading ? '—' : active}</p>
              <p className="text-xs text-white/70">{latinToCyrillic('Faol')}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-2xl font-bold text-rose-200">{loading ? '—' : inactive}</p>
              <p className="text-xs text-white/70">{latinToCyrillic('Nofaol')}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <CardSkeleton count={3} />
        ) : loadError ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <EmptyState
              icon={AlertTriangle}
              title={latinToCyrillic('Botlarni yuklab bo\'lmadi')}
              description={latinToCyrillic('Server bilan aloqa o\'rnatilmadi. Internet ulanishini tekshirib, qayta urinib ko\'ring.')}
              action={
                <button
                  onClick={loadBots}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  {latinToCyrillic('Qayta urinish')}
                </button>
              }
            />
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
            <EmptyState
              icon={Bot}
              title={latinToCyrillic('Hozircha bot yo\'q')}
              description={latinToCyrillic('Faol botlar topilmadi. Botlar sozlangach bu yerda ko\'rinadi.')}
              action={
                <button
                  onClick={loadBots}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  {latinToCyrillic('Yangilash')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {bots.map((bot) => (
              <div
                key={bot.name}
                className="group bg-white rounded-2xl p-5 sm:p-6 shadow-sm border border-gray-100 hover:shadow-glass transition-all duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        bot.online
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md'
                          : 'bg-gray-100'
                      }`}
                    >
                      <Send className={`w-5 h-5 ${bot.online ? 'text-white' : 'text-gray-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate" title={bot.name}>
                        {bot.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{prettyType(bot.type)}</p>
                    </div>
                  </div>
                  {bot.online ? (
                    <Badge variant="success" className="gap-1 flex-shrink-0">
                      <CheckCircle className="w-3 h-3" />
                      {latinToCyrillic('Faol')}
                    </Badge>
                  ) : (
                    <Badge variant="error" className="gap-1 flex-shrink-0">
                      <XCircle className="w-3 h-3" />
                      {latinToCyrillic('Nofaol')}
                    </Badge>
                  )}
                </div>

                {/* Status line */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5">
                  <span
                    className={`relative flex h-2.5 w-2.5 ${bot.online ? '' : 'opacity-60'}`}
                  >
                    {bot.online && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        bot.online ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </span>
                  <span className="text-sm font-medium text-gray-600">
                    {bot.online
                      ? latinToCyrillic('Ulangan va ishlamoqda')
                      : latinToCyrillic('Faol emas')}
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    leftIcon={<Power className="w-4 h-4" />}
                    onClick={() => setRestartTarget(bot.name)}
                  >
                    {latinToCyrillic('Qayta yoqish')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Broadcast modal */}
      <Modal
        isOpen={broadcastOpen}
        onClose={() => {
          if (!broadcasting) setBroadcastOpen(false);
        }}
        title={latinToCyrillic('Xabar yuborish')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setBroadcastOpen(false)}
              disabled={broadcasting}
            >
              {latinToCyrillic('Bekor qilish')}
            </Button>
            <Button
              variant="primary"
              onClick={handleBroadcast}
              isLoading={broadcasting}
              loadingText={latinToCyrillic('Yuborilmoqda...')}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {latinToCyrillic('Yuborish')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            {latinToCyrillic('Xabar barcha faol botlar orqali yuboriladi.')}
          </p>
          <label className="block text-sm font-semibold text-gray-700">
            {latinToCyrillic('Xabar matni')}
          </label>
          <textarea
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            rows={4}
            placeholder={latinToCyrillic('Xabar matnini kiriting...')}
            className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-20 hover:border-gray-300"
          />
        </div>
      </Modal>

      {/* Restart confirmation modal */}
      <Modal
        isOpen={restartTarget !== null}
        onClose={() => {
          if (!restarting) setRestartTarget(null);
        }}
        title={latinToCyrillic('Botni qayta yoqish')}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRestartTarget(null)}
              disabled={restarting}
            >
              {latinToCyrillic('Bekor qilish')}
            </Button>
            <Button
              variant="danger"
              onClick={handleRestart}
              isLoading={restarting}
              loadingText={latinToCyrillic('Bajarilmoqda...')}
              leftIcon={<Power className="w-4 h-4" />}
            >
              {latinToCyrillic('Qayta yoqish')}
            </Button>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold">{restartTarget}</span>{' '}
              {latinToCyrillic('botni qayta yoqmoqchimisiz?')}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {latinToCyrillic('Qayta yoqish davomida bot bir necha soniya faol bo\'lmaydi.')}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
