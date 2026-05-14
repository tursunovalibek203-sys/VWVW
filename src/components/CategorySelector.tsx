import { useState, useEffect } from 'react';
import api from '../lib/api';
import { latinToCyrillic } from '../lib/transliterator';

interface ProductCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  productType: {
    name: string;
  };
  sizes: any[];
  _count: {
    products: number;
  };
}

interface CategorySelectorProps {
  selectedId: string;
  onSelect: (id: string, name: string, icon?: string, color?: string) => void;
  placeholder?: string;
}

export default function CategorySelector({ 
  selectedId, 
  onSelect, 
  placeholder = "Mahsulot turini tanlang..." 
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get('/product-categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchValue.toLowerCase()) ||
    category.productType.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getCategoryIcon = (icon?: string, name?: string) => {
    if (icon) return icon;
    const lower = name?.toLowerCase() || '';
    if (lower.includes('preform')) return 'ðŸ”·';
    if (lower.includes('qop')) return 'ðŸ“¦';
    if (lower.includes('qopqoq')) return 'ðŸ”’';
    if (lower.includes('stiker')) return 'ðŸ·ï¸';
    if (lower.includes('aksessuar')) return 'ðŸŽ';
    return 'ðŸ“‹';
  };

  const getCategoryColor = (color?: string, name?: string) => {
    if (color) return color;
    const lower = name?.toLowerCase() || '';
    if (lower.includes('preform')) return '#3B82F6';
    if (lower.includes('qop')) return '#10B981';
    if (lower.includes('qopqoq')) return '#8B5CF6';
    if (lower.includes('stiker')) return '#F97316';
    if (lower.includes('aksessuar')) return '#EC4899';
    return '#6B7280';
  };

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

      {filteredCategories.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">ðŸ“¦</div>
          <p className="text-gray-500 text-lg mb-2">{latinToCyrillic("Hozircha kategoriyalar yo'q")}</p>
          <p className="text-gray-400 text-sm">{latinToCyrillic("Yangi tur qo'shish orqali boshlang")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category) => {
            const icon = getCategoryIcon(category.icon, category.name);
            const color = getCategoryColor(category.color, category.name);
            
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => onSelect(category.id, category.name, icon, color)}
                className={`relative p-6 border-2 rounded-xl transition-all transform hover:scale-105 ${
                  selectedId === category.id
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-xl'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                }`}
                style={{
                  ...(selectedId !== category.id && {
                    background: `linear-gradient(135deg, ${color}15, ${color}25)`,
                    borderColor: `${color}40`
                  })
                }}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="text-4xl">{icon}</div>
                  <div>
                    <div className="font-bold text-lg">{category.name}</div>
                    {category.description && (
                      <div className={`text-sm mt-1 ${
                        selectedId === category.id ? 'text-green-100' : 'text-gray-600'
                      }`}>
                        {category.description}
                      </div>
                    )}
                    <div className={`text-xs mt-2 px-2 py-1 rounded-full inline-block ${
                      selectedId === category.id 
                        ? 'bg-white text-green-600' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {category._count.products} mahsulot
                    </div>
                    {category.sizes.length > 0 && (
                      <div className={`text-xs mt-1 ${
                        selectedId === category.id ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {category.sizes.length} o'lcham
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedId === category.id && (
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
