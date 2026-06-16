import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, PackagePlus, Loader2, Boxes, Hash, ArrowRight } from 'lucide-react';
import api from '../lib/professionalApi';
import { latinToCyrillic, trData } from '../lib/transliterator';
import { useToast, toast } from '../components/ui/Toast';
import { CardSkeleton } from '../components/ui/LoadingSpinner';
import EmptyState from '../components/EmptyState';

export default function CashierAddStock() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await api.get('/products');
      // ✅ Handle new API response format
      setProducts(response.data?.data || response.data);
    } catch (error) {
      console.error('Mahsulotlarni yuklashda xatolik:', error);
      addToast(toast.error(
        latinToCyrillic('Xatolik'),
        latinToCyrillic('Mahsulotlarni yuklashda xatolik yuz berdi!')
      ));
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!selectedProduct || !quantity) {
      addToast(toast.warning(
        latinToCyrillic('Majburiy maydonlar'),
        latinToCyrillic('Iltimos, mahsulot va miqdorni tanlang!')
      ));
      setLoading(false);
      return;
    }

    try {
      // Mahsulotni topish
      const product = products.find(p => p.id === selectedProduct);
      if (!product) {
        addToast(toast.error(
          latinToCyrillic('Xatolik'),
          latinToCyrillic('Mahsulot topilmadi!')
        ));
        setLoading(false);
        return;
      }

      // Mahsulot stock ini yangilash
      const updatedStock = (product.currentStock || 0) + parseInt(quantity);

      await api.put(`/products/${selectedProduct}`, {
        ...product,
        currentStock: updatedStock
      });

      addToast(toast.success(
        latinToCyrillic('Qabul qilindi'),
        `"${trData(product.name)}" ${latinToCyrillic('mahsulotiga')} ${quantity} ${latinToCyrillic("qop qo'shildi. Jami:")} ${updatedStock} ${latinToCyrillic('qop')}`
      ));

      // Formni tozalash
      setSelectedProduct('');
      setQuantity('1');

      // Mahsulotlarni yangilash
      loadProducts();
    } catch (error: any) {
      console.error('Stock qo\'shishda xatolik:', error);
      addToast(toast.error(
        latinToCyrillic('Xatolik'),
        error.response?.data?.error || error.message
      ));
    } finally {
      setLoading(false);
    }
  };

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const activeProduct = products.find(p => p.id === selectedProduct);
  const parsedQty = parseInt(quantity);
  const newStock = activeProduct
    ? (activeProduct.currentStock || 0) + (isNaN(parsedQty) ? 0 : parsedQty)
    : 0;

  const inputBase =
    'w-full h-12 px-3.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 tabular-nums';

  const labelClass = 'block text-sm font-semibold text-slate-700';

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header: back + title + subtitle */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => navigate('/cashier/inventory')}
          aria-label={latinToCyrillic('Orqaga')}
          className="w-10 h-10 flex-shrink-0 bg-white hover:bg-slate-50 text-slate-600 rounded-xl flex items-center justify-center border border-slate-200 transition-colors active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {latinToCyrillic('Mahsulot qabul qilish')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {latinToCyrillic("Omborga yangi mahsulot zaxirasini qo'shing")}
          </p>
        </div>
      </div>

      {loadingProducts ? (
        <CardSkeleton count={2} />
      ) : products.length === 0 ? (
        <div className="rounded-2xl bg-white border border-slate-200/70">
          <EmptyState
            icon={Package}
            title={latinToCyrillic('Mahsulotlar topilmadi')}
            description={latinToCyrillic("Omborda hali mahsulot yo'q. Avval yangi mahsulot qo'shing, keyin uning zaxirasini to'ldiring.")}
            action={
              <button
                type="button"
                onClick={() => navigate('/cashier/products')}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors active:scale-[0.98]"
              >
                <Package className="w-4 h-4" />
                {latinToCyrillic('Mahsulotlarga')}
              </button>
            }
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Card: Mahsulot tanlash */}
          <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
            <div className="flex items-start gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                <Boxes className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic('Mahsulotni tanlang')}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Zaxirasi to'ldiriladigan mahsulot")}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="product-select" className={labelClass}>
                {latinToCyrillic('Mahsulot')} <span className="text-rose-500">*</span>
              </label>
              <select
                id="product-select"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className={`${inputBase} cursor-pointer appearance-none`}
                required
              >
                <option value="">{latinToCyrillic('Mahsulotni tanlang...')}</option>
                {sortedProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {trData(product.name)} — {latinToCyrillic('zaxira')}: {product.currentStock || 0} {latinToCyrillic('qop')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card: Miqdor */}
          <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
            <div className="flex items-start gap-3.5 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Hash className="w-[18px] h-[18px]" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 tracking-tight">{latinToCyrillic("Qo'shiladigan miqdor")}</h3>
                <p className="text-sm text-slate-400 mt-0.5">{latinToCyrillic("Omborga kelgan qoplar soni")}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="quantity" className={labelClass}>
                {latinToCyrillic('Miqdor (qop)')} <span className="text-rose-500">*</span>
              </label>
              <input
                id="quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={inputBase}
                placeholder={latinToCyrillic('Masalan: 10')}
                required
              />
            </div>

            {/* Tanlangan mahsulot ma'lumoti — natija ko'rinishi */}
            {activeProduct && (
              <div className="mt-5 bg-slate-50 p-5 rounded-xl border border-slate-200/70">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  {latinToCyrillic('Tanlangan mahsulot')}
                </h4>
                <p className="text-sm font-semibold text-slate-900">{trData(activeProduct.name)}</p>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex-1 bg-white rounded-xl border border-slate-200 p-3 text-center">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{latinToCyrillic('Hozirgi')}</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-700 tabular-nums">{activeProduct.currentStock || 0}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
                  <div className="flex-1 bg-white rounded-xl border border-emerald-200 p-3 text-center">
                    <p className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wide">{latinToCyrillic('Yangi')}</p>
                    <p className="mt-0.5 text-lg font-bold text-emerald-600 tabular-nums">{newStock}</p>
                  </div>
                </div>

                {activeProduct.pricePerBag != null && (
                  <p className="mt-4 text-xs font-medium text-slate-500">
                    {latinToCyrillic('Narxi')}: <span className="font-bold text-slate-700 tabular-nums">${activeProduct.pricePerBag}</span> / {latinToCyrillic('qop')}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/cashier/inventory')}
              className="sm:flex-1 rounded-xl border border-slate-200 bg-white py-3 text-base font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors active:scale-[0.98]"
            >
              {latinToCyrillic('Bekor qilish')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="sm:flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-3 text-base font-semibold transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {latinToCyrillic('Saqlanmoqda...')}
                </>
              ) : (
                <>
                  <PackagePlus className="w-5 h-5" />
                  {latinToCyrillic("Mahsulotni qo'shish")}
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
