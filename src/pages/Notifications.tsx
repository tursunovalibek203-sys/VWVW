import { useEffect, useMemo, useState } from 'react';
import {
  Bell, Package, Users, CheckCircle,
  RefreshCw, CheckCheck, TrendingDown, Clock,
} from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic } from '../lib/transliterator';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { Badge } from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';

const L = latinToCyrillic;

interface NotificationItem {
  id: string | number;
  type: 'stock' | 'customer' | 'forecast';
  title: string;
  message: string;
  severity: string;
  createdAt: Date;
}

const FILTERS: { key: 'all' | NotificationItem['type']; label: string }[] = [
  { key: 'all', label: 'Barchasi' },
  { key: 'stock', label: 'Zaxira' },
  { key: 'customer', label: 'Mijozlar' },
  { key: 'forecast', label: 'Prognoz' },
];

// Relative time formatter (clean Uzbek Latin -> transliterated on render)
function relativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return 'hozirgina';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} daqiqa oldin`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} soat oldin`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} kun oldin`;
  const month = Math.floor(day / 30);
  return `${month} oy oldin`;
}

export default function Notifications() {
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | NotificationItem['type']>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [readKeys, setReadKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const [stockAlerts, customerAlerts, productAlerts] = await Promise.all([
        api.get('/products/alerts'),
        api.get('/customers/alerts/overdue'),
        api.get('/forecast/overview'),
      ]);

      const allNotifications = [
        ...stockAlerts.data.map((alert: any) => ({
          id: alert.productId,
          type: 'stock' as const,
          title: 'Kam Zaxira',
          message: `${alert.productName} - ${alert.currentStock} qop qoldi`,
          severity: alert.status,
          createdAt: new Date(),
        })),
        ...customerAlerts.data.map((customer: any) => ({
          id: customer.id,
          type: 'customer' as const,
          title: 'Mijoz Ogohlantirish',
          message: customer.debt > 0
            ? `${customer.name} - ${customer.debt} UZS qarz`
            : `${customer.name} - 30 kun xarid qilmagan`,
          severity: 'warning',
          createdAt: new Date(),
        })),
        ...productAlerts.data
          .filter((f: any) => f.status !== 'ok')
          .map((forecast: any) => ({
            id: forecast.productId,
            type: 'forecast' as const,
            title: 'Prognoz Ogohlantirish',
            message: `${forecast.productName} - ${forecast.daysUntilStockout} kunda tugaydi`,
            severity: forecast.status,
            createdAt: new Date(),
          })),
      ];

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to load notifications');
      addToast({
        type: 'error',
        title: L('Yuklashda xatolik'),
        message: L('Bildirishnomalarni yuklab bo\'lmadi. Qayta urinib ko\'ring'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Stable React key per item (id alone can collide across types)
  const keyOf = (n: NotificationItem) => `${n.type}-${n.id}`;

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
    addToast({
      type: 'success',
      title: L('Yangilandi'),
      message: L('Bildirishnomalar yangilandi'),
    });
  };

  const handleMarkAllRead = () => {
    setReadKeys(new Set(notifications.map(keyOf)));
    addToast({
      type: 'success',
      title: L('Bajarildi'),
      message: L('Barcha bildirishnomalar o\'qilgan deb belgilandi'),
    });
  };

  const handleToggleRead = (n: NotificationItem) => {
    const k = keyOf(n);
    setReadKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const unreadCount = useMemo(
    () => notifications.filter((n) => !readKeys.has(keyOf(n))).length,
    [notifications, readKeys],
  );

  const filteredNotifications = useMemo(
    () => notifications.filter((n) => filter === 'all' || n.type === filter),
    [notifications, filter],
  );

  const countByType = (type: 'all' | NotificationItem['type']) =>
    type === 'all'
      ? notifications.length
      : notifications.filter((n) => n.type === type).length;

  const getIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'stock': return <Package className="w-[18px] h-[18px]" />;
      case 'customer': return <Users className="w-[18px] h-[18px]" />;
      case 'forecast': return <TrendingDown className="w-[18px] h-[18px]" />;
      default: return <Bell className="w-[18px] h-[18px]" />;
    }
  };

  // Soft-tinted icon container, keyed off severity (subtle, not loud)
  const getIconColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-600';
      case 'urgent':
      case 'warning':
        return 'bg-amber-50 text-amber-600';
      default:
        return 'bg-sky-50 text-sky-600';
    }
  };

  const getSeverityBadge = (severity: string): 'error' | 'warning' | 'info' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'urgent':
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  const severityLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Kritik';
      case 'urgent': return 'Shoshilinch';
      case 'warning': return 'Ogohlantirish';
      default: return 'Ma\'lumot';
    }
  };

  const typeLabel = (type: NotificationItem['type']) => {
    switch (type) {
      case 'stock': return 'Zaxira';
      case 'customer': return 'Mijoz';
      case 'forecast': return 'Prognoz';
      default: return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {L('Bildirishnomalar')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {loading
              ? L('Yuklanmoqda...')
              : unreadCount > 0
                ? `${unreadCount} ${L('ta o\'qilmagan bildirishnoma')}`
                : L('Barcha bildirishnomalar o\'qilgan')}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={handleMarkAllRead}
            disabled={loading || unreadCount === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">{L('Hammasini o\'qilgan')}</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{L('Yangilash')}</span>
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = countByType(f.key);
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.98] ${
                active
                  ? 'bg-slate-900 text-white border border-slate-900'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {L(f.label)}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <CardSkeleton count={6} />
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/70">
          <EmptyState
            icon={CheckCircle}
            title={L('Bildirishnomalar yo\'q')}
            description={
              filter === 'all'
                ? L('Hamma narsa nazorat ostida. Yangi ogohlantirishlar shu yerda paydo bo\'ladi')
                : L('Ushbu turdagi bildirishnomalar yo\'q. Boshqa filterni tanlab ko\'ring')
            }
            action={
              filter !== 'all' ? (
                <button
                  onClick={() => setFilter('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
                >
                  <Bell className="w-4 h-4" />
                  {L('Barchasini ko\'rish')}
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
            const k = keyOf(notification);
            const isRead = readKeys.has(k);
            return (
              <button
                key={k}
                onClick={() => handleToggleRead(notification)}
                title={isRead ? L('O\'qilmagan deb belgilash') : L('O\'qilgan deb belgilash')}
                className={`w-full text-left relative overflow-hidden rounded-2xl bg-white border p-4 transition-all duration-200 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] active:scale-[0.99] ${
                  isRead ? 'border-slate-200/70' : 'border-indigo-200/70'
                }`}
              >
                {/* Unread accent bar */}
                {!isRead && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
                )}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getIconColor(notification.severity)}`}
                  >
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3
                            className={`text-sm sm:text-base truncate ${
                              isRead ? 'font-semibold text-slate-600' : 'font-bold text-slate-900'
                            }`}
                          >
                            {L(notification.title)}
                          </h3>
                          {!isRead && (
                            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {L(typeLabel(notification.type))}
                        </p>
                      </div>
                      <Badge variant={getSeverityBadge(notification.severity)}>
                        {L(severityLabel(notification.severity))}
                      </Badge>
                    </div>
                    <p
                      className={`mt-2 text-sm break-words ${
                        isRead ? 'text-slate-500' : 'text-slate-700'
                      }`}
                    >
                      {notification.message}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {L(relativeTime(notification.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
