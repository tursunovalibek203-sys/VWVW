import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PackagePlus,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Loader2,
  ArrowLeft,
  Boxes,
  Hash,
  FileText,
  Sparkles,
} from 'lucide-react';
import api from '../../lib/professionalApi';
import { useAuthStore } from '../../store/authStore';

interface Product {
  id: string;
  name: string;
  bagType: string;
  currentStock: number;
  warehouse: string;
}

export default function WarehouseAddBag() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [success, setSuccess] = useState<{ productName: string; qty: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await api.get('/products');
        const list = data.data ?? data;
        setProducts(Array.isArray(list) ? list.filter((p: Product) => p.name && p.active !== false) : []);
      } catch {
        setError('Mahsulotlar yuklanmadi');
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !quantity) return;
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setError("Miqdor musbat son bo'lishi kerak");
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/warehouse/add-bag', {
        productId: selectedProduct,
        quantity: qty,
        notes: notes.trim() || undefined,
      });
      const pName = products.find(p => p.id === selectedProduct)?.name ?? '';
      setSuccess({ productName: pName, qty });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(null);
    setQuantity('');
    setNotes('');
    setSelectedProduct('');
  };

  const selected = products.find((p) => p.id === selectedProduct);

  // ─── Success screen ───
  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0d9488 100%)', boxShadow: '0 20px 60px rgba(5,150,105,0.35)' }}>
          <div className="flex flex-col items-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-3xl bg-white/20 flex items-center justify-center mb-5">
              <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2} />
            </div>
            <h2 className="text-2xl font-black text-white">Muvaffaqiyatli!</h2>
            <p className="text-emerald-200 text-sm mt-2 leading-relaxed">
              <span className="font-bold text-white">{success.productName}</span>dan{' '}
              <span className="font-black text-emerald-300 text-lg">{success.qty}</span>{' '}
              qop ishlab chiqarildi va omborga qo'shildi
            </p>

            <div className="mt-8 w-full space-y-3">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-3.5 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl backdrop-blur-sm transition-all"
              >
                Yana kiritish
              </button>
              <button
                type="button"
                onClick={() => navigate('/warehouse')}
                className="w-full py-3.5 bg-white text-emerald-700 font-bold rounded-2xl transition-all hover:bg-emerald-50 active:scale-[0.98]"
              >
                Bosh sahifaga
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/warehouse')}
          className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-black text-slate-900">Ishlab chiqarildi</h1>
          <p className="text-xs text-slate-400">Ishlab chiqarilgan mahsulot qopini kiritish</p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Top accent */}
        <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, #059669, #0d9488, #0ea5e9)' }} />

        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">

          {/* Mahsulot */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Boxes className="w-4 h-4 text-emerald-600" />
              Mahsulot tanlang
            </label>
            {loadingProducts ? (
              <div className="flex items-center gap-3 w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                <span className="text-sm text-slate-400">Mahsulotlar yuklanmoqda...</span>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  required
                  className="w-full appearance-none px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition-all cursor-pointer"
                >
                  <option value="">— Mahsulot tanlang —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.bagType}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            )}

            {selected && (
              <div className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: 'linear-gradient(135deg, #ecfdf5, #f0fdfa)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-xs font-semibold text-emerald-800">{selected.name}</span>
                </div>
                <span className="text-xs font-black text-emerald-700">
                  Hozir: {selected.currentStock} qop
                </span>
              </div>
            )}
          </div>

          {/* Miqdor */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Hash className="w-4 h-4 text-emerald-600" />
              Qop soni
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Masalan: 50"
              required
              className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-xl font-black focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm placeholder:leading-[52px]"
            />
            {quantity && parseInt(quantity) > 0 && selected && (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-2xl">
                <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <p className="text-xs font-medium text-blue-700">
                  Qo'shilgandan keyin:{' '}
                  <span className="font-black">{selected.currentStock + parseInt(quantity)} qop</span>
                </p>
              </div>
            )}
          </div>

          {/* Izoh */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <FileText className="w-4 h-4 text-emerald-600" />
              Izoh
              <span className="text-xs font-normal text-slate-400">(ixtiyoriy)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Qo'shimcha ma'lumot..."
              rows={3}
              className="w-full px-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 text-sm focus:outline-none focus:border-emerald-500 focus:bg-white transition-all placeholder:text-slate-300 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <p className="text-sm font-medium text-rose-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !selectedProduct || !quantity}
            className="w-full flex items-center justify-center gap-3 py-4 text-white font-black text-base rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
            style={{
              background: loading || !selectedProduct || !quantity
                ? '#94a3b8'
                : 'linear-gradient(135deg, #059669 0%, #0d9488 100%)',
              boxShadow: loading || !selectedProduct || !quantity
                ? 'none'
                : '0 8px 24px rgba(5,150,105,0.35)',
            }}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saqlanmoqda...
              </>
            ) : (
              <>
                <PackagePlus className="w-5 h-5" />
                Ishlab chiqarilganini saqlash
              </>
            )}
          </button>
        </form>
      </div>

      {/* Helper note */}
      <p className="text-center text-xs text-slate-400 px-4">
        Kiritilgan har bir qop <span className="font-semibold text-slate-500">avtomatik hisobotga</span> qo'shiladi va Excel sheetda ko'rinadi
      </p>
    </div>
  );
}
