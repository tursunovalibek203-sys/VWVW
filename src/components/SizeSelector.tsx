import { useState, useEffect } from 'react';
import api from '../lib/api';

interface ProductSize {
  id: string;
  name: string;
  description?: string;
  unit: string;
  value: number;
  active: boolean;
}

interface SizeSelectorProps {
  categoryId: string;
  selectedId: string;
  onSelect: (id: string, name: string, value: number, unit: string) => void;
  placeholder?: string;
}

export default function SizeSelector({ 
  categoryId,
  selectedId, 
  onSelect, 
  placeholder = "O'lchamni tanlang..." 
}: SizeSelectorProps) {
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    if (categoryId) {
      loadSizes();
    } else {
      setSizes([]);
      setLoading(false);
    }
  }, [categoryId]);

  const loadSizes = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/product-categories/${categoryId}/sizes`);
      setSizes(response.data);
    } catch (error) {
      console.error('Error loading sizes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSizes = sizes.filter(size =>
    size.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    size.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getSizeIcon = (unit: string) => {
    if (unit === 'gr') return 'âš–ï¸';
    if (unit === 'kg') return 'ðŸ‹ï¸';
    return 'ðŸ“';
  };

  const getSizeColor = (value: number) => {
    if (value <= 25) return '#3B82F6'; // kichik - ko'k
    if (value <= 50) return '#10B981'; // o'rtacha - yashil
    return '#F59E0B'; // katta - sariq
  };

  if (!categoryId) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-500">Avval mahsulot turini tanlang</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            placeholder={placeholder}
            disabled
            className="w-full px-4 py-3 text-lg bg-gray-100 border-2 border-gray-300 rounded-xl"
          />
        </div>
        <div className="text-center py-8">
          <div className="inline-block animate-pulse rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <p className="text-sm text-gray-500 mt-2">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full px-4 py-3 text-lg bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:border-green-500 focus:ring-4 focus:ring-green-100 dark:focus:ring-green-900 transition-all shadow-sm"
        />
      </div>

      {filteredSizes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">O'lchamlar topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredSizes.map((size) => {
            const icon = getSizeIcon(size.unit);
            const color = getSizeColor(size.value);
            
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => onSelect(size.id, size.name, size.value, size.unit)}
                className={`relative p-4 border-2 rounded-xl transition-all transform hover:scale-105 ${
                  selectedId === size.id
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-xl'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                }`}
                style={{
                  ...(selectedId !== size.id && {
                    background: `linear-gradient(135deg, ${color}15, ${color}25)`,
                    borderColor: `${color}40`
                  })
                }}
              >
                <div className="flex flex-col items-center text-center space-y-2">
                  <div className="text-3xl">{icon}</div>
                  <div>
                    <div className="font-bold text-lg">{size.name}</div>
                    {size.description && (
                      <div className={`text-sm mt-1 ${
                        selectedId === size.id ? 'text-green-100' : 'text-gray-600'
                      }`}>
                        {size.description}
                      </div>
                    )}
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                      selectedId === size.id 
                        ? 'bg-white text-green-600' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {size.value} {size.unit}
                    </div>
                  </div>
                </div>
                
                {selectedId === size.id && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
