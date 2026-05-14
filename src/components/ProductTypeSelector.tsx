import { useState, useEffect } from 'react';
import api from '../lib/api';

interface ProductType {
  id: string;
  name: string;
  description?: string;
  defaultCard?: string;
  productCount: number;
}

interface ProductTypeSelectorProps {
  selectedId: string;
  onSelect: (id: string, name: string, defaultCard?: string) => void;
  placeholder?: string;
}

export default function ProductTypeSelector({ 
  selectedId, 
  onSelect, 
  placeholder = "Mahsulot turini tanlang..." 
}: ProductTypeSelectorProps) {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadProductTypes();
  }, []);

  const loadProductTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/product-types');
      setProductTypes(response.data);
    } catch (error) {
      console.error('Error loading product types:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTypes = productTypes.filter(type =>
    type.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    type.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getTypeIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('preform')) return 'ðŸ”·';
    if (lower.includes('qop')) return 'ðŸ“¦';
    if (lower.includes('qopqoq')) return 'ðŸ”’';
    if (lower.includes('stiker')) return 'ðŸ·ï¸';
    if (lower.includes('aksessuar')) return 'ðŸŽ';
    return 'ðŸ“‹';
  };

  const getTypeColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('preform')) return 'bg-blue-50 border-blue-200 text-blue-800';
    if (lower.includes('qop')) return 'bg-green-50 border-green-200 text-green-800';
    if (lower.includes('qopqoq')) return 'bg-purple-50 border-purple-200 text-purple-800';
    if (lower.includes('stiker')) return 'bg-orange-50 border-orange-200 text-orange-800';
    if (lower.includes('aksessuar')) return 'bg-pink-50 border-pink-200 text-pink-800';
    return 'bg-gray-50 border-gray-200 text-gray-800';
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            disabled
            className="w-full px-4 py-3 text-base bg-gray-100 border-2 border-gray-300 rounded-xl"
          />
        </div>
        <div className="text-center py-4">
          <div className="inline-block animate-pulse rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full px-4 py-3 text-base bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900 transition-all shadow-sm"
        />
      </div>

      {filteredTypes.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Mahsulot turlari topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelect(type.id, type.name, type.defaultCard)}
              className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-all ${
                selectedId === type.id
                  ? 'bg-green-500 text-white border-green-600 shadow-lg transform scale-105'
                  : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTypeIcon(type.name)}</span>
                  <div>
                    <div className="font-semibold">{type.name}</div>
                    {type.description && (
                      <div className={`text-sm ${selectedId === type.id ? 'text-green-100' : 'text-gray-500'}`}>
                        {type.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    selectedId === type.id 
                      ? 'bg-white text-green-600' 
                      : getTypeColor(type.name)
                  }`}>
                    {type.productCount} mahsulot
                  </span>
                  {type.defaultCard && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      selectedId === type.id
                        ? 'bg-white text-green-600'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      ðŸƒ {type.defaultCard}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
