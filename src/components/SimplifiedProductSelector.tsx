import { useState } from 'react';
import { Search, Package, Plus, X, CheckCircle2, ChevronRight } from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import { validateQuantity } from '../lib/safe-math';

interface Product {
  id: string;
  name: string;
  pricePerBag: number;
  currentStock: number;
  unitsPerBag: number;
  warehouse: string;
  subType?: string;
}

interface SimplifiedProductSelectorProps {
  products: Product[];
  onProductSelect: (product: Product, quantity: number, price: number, priceUnit?: 'dona' | 'qop') => void;
  currency: string;
  exchangeRate: number;
}

export default function SimplifiedProductSelector({ 
  products, 
  onProductSelect, 
  currency, 
  exchangeRate 
}: SimplifiedProductSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [priceUnit, setPriceUnit] = useState<'dona' | 'qop'>('qop');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Mahsulotlarni turlari va gram bo'yicha guruhlash
  const groupProducts = () => {
    const filtered = products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const groups: { [key: string]: Product[] } = {};
    
    filtered.forEach(product => {
      const name = product.name.toLowerCase();
      const warehouse = product.warehouse || 'Boshqa';
      let key = warehouse;
      
      // Preformlarni gram bo'yicha alohida guruhlash
      if (warehouse === 'preform' || name.includes('gr')) {
        if (name.includes('15') || name.includes('15gr')) {
          key = 'preform-15';
        } else if (name.includes('21') || name.includes('21gr')) {
          key = 'preform-21';
        } else if (name.includes('28') || name.includes('28gr')) {
          key = 'preform-28';
        } else if (name.includes('32') || name.includes('32gr')) {
          key = 'preform-32';
        } else if (name.includes('38') || name.includes('38gr')) {
          key = 'preform-38';
        } else if (name.includes('43') || name.includes('43gr')) {
          key = 'preform-43';
        } else if (name.includes('48') || name.includes('48gr')) {
          key = 'preform-48';
        } else if (warehouse === 'preform') {
          key = 'preform-boshqa';
        }
      }
      
      // Yangi custom turlarni alohida guruhlash (custom- boshlangan ID lar)
      if (warehouse.startsWith('custom-')) {
        key = warehouse;
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(product);
    });
    
    // Guruhlarni tartiblangan holda qaytarish
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      const order = ['preform-15', 'preform-21', 'preform-28', 'preform-32', 'preform-38', 'preform-43', 'preform-48', 'preform-boshqa', 'krishka', 'ruchka', 'etiketka'];
      const aIndex = order.indexOf(a);
      const bIndex = order.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // Custom turlarni oxirida ko'rsatish
      if (a.startsWith('custom-') && !b.startsWith('custom-')) return 1;
      if (!a.startsWith('custom-') && b.startsWith('custom-')) return -1;
      return a.localeCompare(b);
    });
    
    const sortedGroups: { [key: string]: Product[] } = {};
    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });
    
    return sortedGroups;
  };

  const productGroups = groupProducts();
  
  // Guruh nomlarini olish - custom turlar uchun mahsulot nomidan nom yasash
  const getGroupName = (key: string, products: Product[]): string => {
    const predefinedNames: { [key: string]: string } = {
      'preform-15': '15 gr Preformlar',
      'preform-21': '21 gr Preformlar',
      'preform-28': '28 gr Preformlar',
      'preform-32': '32 gr Preformlar',
      'preform-38': '38 gr Preformlar',
      'preform-43': '43 gr Preformlar',
      'preform-48': '48 gr Preformlar',
      'preform-boshqa': 'Boshqa Preformlar',
      'krishka': 'Krishka',
      'ruchka': 'Ruchka',
      'etiketka': 'Etiketka',
      'Boshqa': 'Boshqa'
    };
    
    if (predefinedNames[key]) {
      return predefinedNames[key];
    }
    
    // Custom turlar uchun - mahsulot nomidan tur nomini olish
    if (key.startsWith('custom-') && products.length > 0) {
      // Mahsulot nomidan tur nomini aniqlash (masalan: "ETIKETKA OQ" -> "ETIKETKA")
      const firstProduct = products[0];
      const nameParts = firstProduct.name.split(' ');
      if (nameParts.length > 0) {
        return nameParts[0].toUpperCase();
      }
    }
    
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  // Narxni ko'rsatish
  const getDisplayPrice = (price: number) => {
    if (currency === 'UZS') {
      return Math.round(price * exchangeRate).toLocaleString();
    }
    return price.toFixed(2);
  };

  // Mahsulotni tanlash
  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setQuantity('1');
  };

  // Mahsulotni qo'shish
  const handleAddProduct = () => {
    if (!selectedProduct || !quantity) return;

    const qty = validateQuantity(quantity, 'quantity', 1);
    if (qty <= 0) return;

    // Zaxirani tekshirish
    if (qty > selectedProduct.currentStock) {
      console.log(latinToCyrillic(
        `Zaxirada yetarli mahsulot yo'q!\nOmborda: ${selectedProduct.currentStock} qop\nSotmoqchisiz: ${qty} qop`
      ));
      return;
    }

    const displayPrice = currency === 'UZS' 
      ? selectedProduct.pricePerBag * exchangeRate 
      : selectedProduct.pricePerBag;

    onProductSelect(selectedProduct, qty, displayPrice, priceUnit);
    
    // Formani tozalash
    setSelectedProduct(null);
    setQuantity('1');
    setSearchTerm('');
  };


  return (
    <div className="professional-card p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
          <Package className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">{latinToCyrillic("Mahsulot Qo'shish")}</h3>
          <p className="text-sm text-gray-600 font-medium">{latinToCyrillic("Tez va oson tanlash")}</p>
        </div>
      </div>

      {/* Qidiruv */}
      <div className="relative mb-4">
        <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
        <input
          type="text"
          placeholder={latinToCyrillic("Mahsulot nomini kiriting...")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="professional-input pl-14 pr-5 py-5 text-lg font-bold"
        />
      </div>

      {/* Mahsulotlar guruhi - Bitta div ichida */}
      <div className="border-2 border-gray-200 rounded-2xl overflow-hidden bg-white mb-8">
        {/* Sarlavha */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-6 h-6 text-gray-600" />
              <h4 className="font-black text-gray-900 text-lg">{latinToCyrillic("Mahsulotlar")}</h4>
            </div>
            <span className="text-sm text-gray-500 font-medium">
              {Object.values(productGroups).flat().length} {latinToCyrillic("ta")}
            </span>
          </div>
        </div>
        
        {/* Mahsulotlar ro'yxati */}
        <div className="p-3 max-h-[500px] overflow-y-auto professional-scrollbar space-y-3">
          {Object.keys(productGroups).length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 font-bold">{latinToCyrillic("Mahsulot topilmadi")}</p>
            </div>
          ) : (
            Object.entries(productGroups).map(([warehouse, groupProducts]) => {
              const displayName = getGroupName(warehouse, groupProducts);
              
              return (
                <div key={warehouse} className="border-2 border-gray-300 rounded-2xl overflow-hidden bg-white shadow-lg shadow-gray-200/50">
                  {/* Guruh sarlavhasi */}
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-md">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-black text-gray-900 text-base">{displayName}</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">{groupProducts.length}</span>
                    </div>
                    <span className="text-sm text-gray-600 font-medium">
                      {groupProducts.reduce((sum, p) => sum + p.currentStock, 0)} {latinToCyrillic("qop")}
                    </span>
                  </div>
                  
                  {/* Guruh ichidagi mahsulotlar */}
                  <div className="p-3 space-y-3 bg-gray-50/50">
                    {groupProducts.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        className={`w-full p-3 rounded-xl border-2 transition-all text-left card-hover-lift ${
                          selectedProduct?.id === product.id
                            ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md'
                            : 'border-gray-100 hover:border-blue-300 hover:shadow-sm bg-gray-50'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900 text-sm">{product.name}</h5>
                            <div className="flex items-center gap-2 text-xs mt-1">
                              <span className="text-gray-500">
                                {latinToCyrillic("Zaxira")}: <span className="font-bold text-gray-700">{product.currentStock} qop</span>
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-blue-600 font-black text-sm">
                              {currency === 'UZS' ? 'UZS' : '$'}{getDisplayPrice(product.pricePerBag)}
                            </span>
                            {selectedProduct?.id === product.id && (
                              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center mt-1 ml-auto">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Tanlangan mahsulot va miqdor */}
      {selectedProduct && (
        <div className="border-t-2 border-gray-200 pt-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 mb-6 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-gray-900 text-lg">{selectedProduct.name}</h4>
                <p className="text-sm text-blue-600 font-bold">
                  {currency === 'UZS' ? 'UZS' : '$'}{getDisplayPrice(selectedProduct.pricePerBag)} / {latinToCyrillic("qop")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="w-10 h-10 bg-red-100 hover:bg-red-500 text-red-500 hover:text-white rounded-xl flex items-center justify-center transition-all hover-scale"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-wider">
                {latinToCyrillic("Miqdor")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '').replace(/\.(?=.*\.)/g, '');
                    setQuantity(val);
                  }}
                  className="professional-input px-5 py-4 text-lg font-bold flex-1"
                  placeholder="1"
                />
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value as 'dona' | 'qop')}
                  className="professional-input px-3 py-4 text-lg font-bold"
                >
                  <option value="qop">qop</option>
                  <option value="dona">dona</option>
                </select>
              </div>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddProduct}
                className="professional-button px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl flex items-center gap-3 hover-lift"
              >
                <Plus className="w-6 h-6" />
                {latinToCyrillic("Qo'shish")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
