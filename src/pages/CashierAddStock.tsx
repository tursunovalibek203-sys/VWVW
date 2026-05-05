import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/professionalApi';
import { ArrowLeft, Plus, Package, Save } from 'lucide-react';

export default function CashierAddStock() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
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
      setMessage('❌ Mahsulotlarni yuklashda xatolik!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!selectedProduct || !quantity) {
      setMessage('❌ Iltimos, mahsulot va miqdorni tanlang!');
      setLoading(false);
      return;
    }

    try {
      // Mahsulotni topish
      const product = products.find(p => p.id === selectedProduct);
      if (!product) {
        setMessage('❌ Mahsulot topilmadi!');
        setLoading(false);
        return;
      }

      // Mahsulot stock ini yangilash
      const updatedStock = (product.currentStock || 0) + parseInt(quantity);
      
      const response = await api.put(`/products/${selectedProduct}`, {
        ...product,
        currentStock: updatedStock
      });

      setMessage(`✅ "${product.name}" mahsulotiga ${quantity} qop qo'shildi! Jami: ${updatedStock} qop`);
      
      // Formni tozalash
      setSelectedProduct('');
      setQuantity('1');
      
      // Mahsulotlarni yangilash
      loadProducts();
    } catch (error: any) {
      console.error('Stock qo\'shishda xatolik:', error);
      setMessage(`❌ Xatolik: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/cashier/inventory')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Orqaga"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Package className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-800">Mahsulot Qabul Qilish</h1>
            </div>
          </div>
          <p className="text-gray-600">Omborga yangi mahsulot qo'shish</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {message && (
            <div className={`p-4 rounded-lg mb-6 ${
              message.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Mahsulot tanlash */}
            <div>
              <label htmlFor="product-select" className="block text-sm font-semibold text-gray-700 mb-2">
                📦 Mahsulotni tanlang *
              </label>
              <select
                id="product-select"
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50"
                required
              >
                <option value="">Mahsulotni tanlang...</option>
                {products
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - Hozirgi stock: {product.currentStock || 0} qop
                    </option>
                  ))}
              </select>
            </div>

            {/* Miqdor */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                📊 Qo'shiladigan miqdor (qop) *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-gray-50"
                placeholder="Masalan: 10"
                required
              />
            </div>

            {/* Tanlangan mahsulot ma'lumoti */}
            {selectedProduct && (
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Tanlangan mahsulot:</h3>
                {(() => {
                  const product = products.find(p => p.id === selectedProduct);
                  return product ? (
                    <div className="text-sm text-blue-700">
                      <p><strong>Nomi:</strong> {product.name}</p>
                      <p><strong>Hozirgi stock:</strong> {product.currentStock || 0} qop</p>
                      <p><strong>Yangi stock:</strong> {(product.currentStock || 0) + parseInt(quantity)} qop</p>
                      <p><strong>Narxi:</strong> ${product.pricePerBag}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}

            {/* Tugmalar */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saqlanmoqda...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Mahsulotni Qo'shish
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/cashier/inventory')}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
              >
                Bekor qilish
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
