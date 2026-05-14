import { useState, useEffect } from 'react';
import api from '../lib/api';

interface SubTypeSelectorProps {
  categoryId: string;
  sizeId: string;
  selectedType: string;
  onSelect: (subType: string) => void;
  placeholder?: string;
}

export default function SubTypeSelector({ 
  categoryId,
  sizeId,
  selectedType, 
  onSelect, 
  placeholder = "Sub-turini tanlang..." 
}: SubTypeSelectorProps) {
  const [subTypes, setSubTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [customSubType, setCustomSubType] = useState('');

  useEffect(() => {
    if (categoryId && sizeId) {
      loadSubTypes();
    } else {
      setSubTypes([]);
      setLoading(false);
    }
  }, [categoryId, sizeId]);

  const loadSubTypes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/product-categories/sub-types');
      const existingSubTypes = response.data;
      
      // Kategoriya va o'lcham bo'yicha sub-turlarni filter qilish
      const filteredSubTypes = existingSubTypes.filter((subType: string) => {
        // Bu yerda real logikani qo'llash kerak
        return subType && subType.trim() !== '';
      });
      
      setSubTypes(filteredSubTypes);
    } catch (error) {
      console.error('Error loading sub-types:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSubTypes = subTypes.filter(subType =>
    subType.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getSubTypeIcon = (subType: string) => {
    const lower = subType.toLowerCase();
    if (lower.includes('gidro')) return 'ðŸ’§';
    if (lower.includes('karbonat')) return 'ðŸ«§';
    if (lower.includes('standart')) return 'â­';
    if (lower.includes('premium')) return 'ðŸ‘‘';
    if (lower.includes('ekologik')) return 'ðŸŒ±';
    if (lower.includes('luxury')) return 'ðŸ’Ž';
    return 'ðŸ“¦';
  };

  const getSubTypeColor = (subType: string) => {
    const lower = subType.toLowerCase();
    if (lower.includes('gidro')) return '#3B82F6'; // ko'k
    if (lower.includes('karbonat')) return '#06B6D4'; // cyan
    if (lower.includes('standart')) return '#6B7280'; // kul
    if (lower.includes('premium')) return '#F59E0B'; // sariq
    if (lower.includes('ekologik')) return '#10B981'; // yashil
    if (lower.includes('luxury')) return '#8B5CF6'; // binafsha
    return '#6B7280';
  };

  const handleCustomSubTypeAdd = () => {
    if (customSubType.trim() && !subTypes.includes(customSubType.trim())) {
      onSelect(customSubType.trim());
      setCustomSubType('');
    }
  };

  if (!categoryId || !sizeId) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <p className="text-gray-500">Avval tur va o'lchamni tanlang</p>
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

      {/* Custom sub-type qo'shish */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Yangi sub-tur qo'shish..."
          value={customSubType}
          onChange={(e) => setCustomSubType(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCustomSubTypeAdd()}
          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100"
        />
        <button
          onClick={handleCustomSubTypeAdd}
          disabled={!customSubType.trim()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Qo'shish
        </button>
      </div>

      {filteredSubTypes.length === 0 && searchValue === '' ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Sub-turlar mavjud emas. Yangi sub-tur yarating.</p>
        </div>
      ) : filteredSubTypes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Topilmadi</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredSubTypes.map((subType) => {
            const icon = getSubTypeIcon(subType);
            const color = getSubTypeColor(subType);
            
            return (
              <button
                key={subType}
                type="button"
                onClick={() => onSelect(subType)}
                className={`relative p-3 border-2 rounded-xl transition-all transform hover:scale-105 ${
                  selectedType === subType
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white border-green-600 shadow-xl'
                    : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 shadow-md hover:shadow-lg'
                }`}
                style={{
                  ...(selectedType !== subType && {
                    background: `linear-gradient(135deg, ${color}15, ${color}25)`,
                    borderColor: `${color}40`
                  })
                }}
              >
                <div className="flex flex-col items-center text-center space-y-1">
                  <div className="text-2xl">{icon}</div>
                  <div className="font-medium text-sm capitalize">{subType}</div>
                </div>
                
                {selectedType === subType && (
                  <div className="absolute top-1 right-1">
                    <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
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

      {/* Umumiy sub-turlar */}
      <div className="mt-4">
        <p className="text-sm text-gray-600 mb-2">Umumiy sub-turlar:</p>
        <div className="flex flex-wrap gap-2">
          {['gidro', 'karbonat', 'standart', 'premium'].map((commonType) => (
            <button
              key={commonType}
              onClick={() => onSelect(commonType)}
              className={`px-3 py-1 text-sm border rounded-full transition-colors ${
                selectedType === commonType
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
              }`}
            >
              {commonType}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
