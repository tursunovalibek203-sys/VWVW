import { useState, useEffect } from 'react';
import api from '../lib/api';

interface Card {
  id: string;
  name: string;
  description?: string;
  price: number;
  productCount: number;
}

interface CardSelectorProps {
  selectedId: string;
  onSelect: (id: string, name: string) => void;
  placeholder?: string;
  showProductCount?: boolean;
}

export default function CardSelector({ 
  selectedId, 
  onSelect, 
  placeholder = "Kartni tanlang...",
  showProductCount = true
}: CardSelectorProps) {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cards');
      setCards(response.data);
    } catch (error) {
      console.error('Error loading cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCards = cards.filter(card =>
    card.name.toLowerCase().includes(searchValue.toLowerCase()) ||
    card.description?.toLowerCase().includes(searchValue.toLowerCase())
  );

  const getCardIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('standart')) return 'ðŸ“‹';
    if (lower.includes('premium')) return 'â­';
    if (lower.includes('ekologik') || lower.includes('eco')) return 'ðŸŒ±';
    if (lower.includes('luxury')) return 'ðŸ‘‘';
    return 'ðŸƒ';
  };

  const getCardColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('standart')) return 'bg-gray-50 border-gray-200 text-gray-800';
    if (lower.includes('premium')) return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    if (lower.includes('ekologik') || lower.includes('eco')) return 'bg-green-50 border-green-200 text-green-800';
    if (lower.includes('luxury')) return 'bg-purple-50 border-purple-200 text-purple-800';
    return 'bg-blue-50 border-blue-200 text-blue-800';
  };

  const getCardPrice = (price: number) => {
    if (price === 0) return 'Bepul';
    return `$${price.toFixed(2)}`;
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

      {filteredCards.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">Kartlar topilmadi</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.id, card.name)}
              className={`w-full text-left px-4 py-3 border-2 rounded-lg transition-all ${
                selectedId === card.id
                  ? 'bg-green-500 text-white border-green-600 shadow-lg transform scale-105'
                  : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCardIcon(card.name)}</span>
                  <div>
                    <div className="font-semibold">{card.name}</div>
                    {card.description && (
                      <div className={`text-sm ${selectedId === card.id ? 'text-green-100' : 'text-gray-500'}`}>
                        {card.description}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium px-2 py-1 rounded ${
                    selectedId === card.id
                      ? 'bg-white text-green-600'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {getCardPrice(card.price)}
                  </span>
                  {showProductCount && (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      selectedId === card.id 
                        ? 'bg-white text-green-600' 
                        : getCardColor(card.name)
                    }`}>
                      {card.productCount} mahsulot
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
