import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  ShoppingCart,
  ArrowUpCircle,
  TrendingUp,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Clock,
  Boxes,
  BarChart3,
  Warehouse,
} from 'lucide-react';
import api from '../../lib/professionalApi';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../lib/utils';

interface TodayAddition {
  id: string;
  productName: string;
  quantity: number;
  units: number;
  createdAt: string;
  userName: string;
}

interface SaleItem {
  productName: string;
  quantity: number;
}

interface TodaySale {
  id: string;
  customerName: string;
  totalBags: number;
  items: SaleItem[];
  createdAt: string;
}

interface TodayStats {
  additions: TodayAddition[];
  sales: TodaySale[];
  totalAddedBags: number;
  totalSoldBags: number;
}

export default function WarehouseHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchStats = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      setError('');
      const { data } = await api.get('/warehouse/today');
      if (data.success) {
        setStats(data.data);
        setLastRefresh(new Date());
      }
    } catch {
      setError("Ma'lumot yuklanmadi");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 6) return 'Xayrli tun';
    if (h < 12) return 'Xayrli tong';
    if (h < 17) return 'Xayrli kun';
    if (h < 21) return 'Xayrli kech';
    return 'Xayrli tun';
  };

  const todayFull = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const netBalance = (stats?.totalAddedBags ?? 0) - (stats?.totalSoldBags ?? 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
          <Warehouse className="w-7 h-7 text-white animate-pulse" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="w-5 h-5 border-[3px] border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ─── HERO BANNER ─── */}
      <div className="relative overflow-hidden px-5 pt-6 pb-8"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f766e 100%)' }}>
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6ee7b7, transparent)' }} />
        <div className="absolute -bottom-6 -left-6 w-32 h-32 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #34d399, transparent)' }} />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-emerald-300 text-sm font-medium">{greeting()},</p>
            <h1 className="text-white text-2xl font-black mt-0.5 leading-tight">
              {(user?.name ?? 'Ombor mudiri').split(' ')[0]}
            </h1>
            <p className="text-emerald-400 text-xs font-medium mt-1 capitalize">{todayFull}</p>
          </div>
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-all backdrop-blur-sm disabled:opacity-60"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
            Yangilash
          </button>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Qo'shildi", value: stats?.totalAddedBags ?? 0, color: '#6ee7b7', sub: 'qop' },
            { label: 'Sotildi', value: stats?.totalSoldBags ?? 0, color: '#93c5fd', sub: 'qop' },
            {
              label: 'Balans',
              value: netBalance,
              color: netBalance >= 0 ? '#6ee7b7' : '#fca5a5',
              sub: netBalance >= 0 ? '▲ ijobiy' : '▼ salbiy',
            },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl px-3 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.color }}>
                {s.label}
              </p>
              <p className="text-2xl font-black text-white leading-tight mt-0.5">
                {s.value >= 0 ? s.value : Math.abs(s.value)}
              </p>
              <p className="text-[9px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {s.sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">

        {error && (
          <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
          </div>
        )}

        {/* ─── ACTION CARDS ─── */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => navigate('/warehouse/add-bag')}
            className="group relative overflow-hidden rounded-3xl p-5 text-left transition-all duration-200 active:scale-[0.97] shadow-lg"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #0d9488 100%)', boxShadow: '0 8px 24px rgba(5,150,105,0.35)' }}
          >
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <PackagePlus className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-black text-base leading-tight">Qop qo'shish</p>
            <p className="text-emerald-200 text-xs mt-1">Omborga kiritish</p>
            <ChevronRight className="absolute bottom-4 right-4 w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            type="button"
            onClick={() => navigate('/warehouse/reports')}
            className="group relative overflow-hidden rounded-3xl p-5 text-left transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)', boxShadow: '0 8px 24px rgba(30,64,175,0.30)' }}
          >
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
            <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-black text-base leading-tight">Hisobotlar</p>
            <p className="text-blue-200 text-xs mt-1">Excel yuklab olish</p>
            <ChevronRight className="absolute bottom-4 right-4 w-5 h-5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* ─── BUGUN QO'SHILGANLAR — Timeline ─── */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <ArrowUpCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none">Bugun qo'shilganlar</p>
                <p className="text-xs text-slate-400 mt-0.5">Ombordagi kirimlar</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-emerald-700"
              style={{ background: '#d1fae5' }}>
              {stats?.additions.length ?? 0} ta
            </span>
          </div>

          {!stats?.additions.length ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                <Boxes className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">Hali hech narsa qo'shilmagan</p>
              <button
                type="button"
                onClick={() => navigate('/warehouse/add-bag')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 underline underline-offset-2"
              >
                Birinchi qopni qo'shing →
              </button>
            </div>
          ) : (
            <div className="px-4 pb-4">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-emerald-100" />
                <div className="space-y-1">
                  {stats.additions.map((item, i) => (
                    <div key={item.id} className="flex items-start gap-3 py-2 group">
                      {/* Timeline dot */}
                      <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-emerald-200 relative z-10">
                        <span className="text-white text-xs font-black">{i + 1}</span>
                      </div>
                      <div className="flex-1 bg-slate-50 group-hover:bg-emerald-50 rounded-2xl px-4 py-3 transition-colors duration-150">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-slate-800 truncate pr-2">{item.productName}</p>
                          <span className="text-sm font-black text-emerald-700 flex-shrink-0">+{item.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-slate-400">{item.userName}</p>
                          <div className="flex items-center gap-1 text-xs text-slate-400">
                            <Clock className="w-3 h-3" />
                            {formatTime(item.createdAt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── BUGUN SOTILGANLAR ─── */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 leading-none">Bugun sotilganlar</p>
                <p className="text-xs text-slate-400 mt-0.5">Xaridorlar bo'yicha</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-blue-700"
              style={{ background: '#dbeafe' }}>
              {stats?.sales.length ?? 0} ta sotuv
            </span>
          </div>

          {!stats?.sales.length ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-400">Bugun hali sotuv yo'q</p>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-2">
              {stats.sales.map((sale, i) => (
                <div key={sale.id} className="bg-slate-50 hover:bg-blue-50 rounded-2xl px-4 py-3 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-black text-blue-600">{i + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{sale.customerName}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {formatTime(sale.createdAt)}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm font-black text-blue-700 flex-shrink-0">{sale.totalBags} qop</span>
                  </div>
                  {sale.items.length > 0 && (
                    <div className="mt-2 ml-10 space-y-0.5">
                      {sale.items.map((item, j) => (
                        <div key={j} className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 truncate pr-2">{item.productName}</span>
                          <span className="text-slate-600 font-semibold flex-shrink-0">{item.quantity} qop</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-300 pb-1">
          Oxirgi yangilanish: {lastRefresh.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })} · Har 5 daqiqada avtomatik yangilanadi
        </p>
      </div>
    </div>
  );
}
