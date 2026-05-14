import { useState, useEffect, useRef } from 'react';
import { Search, Package, Users, ShoppingCart, FileText, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: 'product' | 'customer' | 'sale' | 'expense';
  url: string;
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const [products, customers, sales] = await Promise.all([
          api.get(`/products?search=${query}`),
          api.get(`/customers?search=${query}`),
          api.get(`/sales?search=${query}&limit=5`),
        ]);

        const searchResults: SearchResult[] = [
          ...products.data.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.name,
            subtitle: `${item.currentStock} Ò›Ð¾Ð¿ Ð¼Ð°Ð²Ð¶ÑƒÐ´`,
            type: 'product' as const,
            url: '/products',
          })),
          ...customers.data.slice(0, 3).map((item: any) => ({
            id: item.id,
            title: item.name,
            subtitle: item.phone,
            type: 'customer' as const,
            url: '/customers',
          })),
          ...sales.data.slice(0, 2).map((item: any) => ({
            id: item.id,
            title: `Ð¡Ð¾Ñ‚ÑƒÐ² #${item.id.slice(-6)}`,
            subtitle: `${item.customer.name} - ${item.totalAmount} UZS`,
            type: 'sale' as const,
            url: '/sales',
          })),
        ];

        setResults(searchResults);
      } catch (error) {
        console.error('ÒšÐ¸Ð´Ð¸Ñ€ÑƒÐ² Ñ…Ð°Ñ‚Ð¾ÑÐ¸:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'product': return <Package className="w-5 h-5" />;
      case 'customer': return <Users className="w-5 h-5" />;
      case 'sale': return <ShoppingCart className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    navigate(result.url);
    setIsOpen(false);
    setQuery('');
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 group shadow-sm hover:shadow-md"
      >
        <Search className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
        <span className="hidden sm:inline">ÒšÐ¸Ð´Ð¸Ñ€Ð¸Ñˆ...</span>
        <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-2 font-mono text-[11px] font-semibold text-gray-500 dark:text-gray-400 shadow-sm">
          <span className="text-xs">âŒ˜</span>K
        </kbd>
      </button>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4 animate-in fade-in duration-200"
      onClick={() => setIsOpen(false)}
    >
      <div 
        className="w-full max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl animate-in slide-in-from-top-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-t-xl">
          <Search className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="ÐœÐ°Ò³ÑÑƒÐ»Ð¾Ñ‚, Ð¼Ð¸Ð¶Ð¾Ð· Ñ‘ÐºÐ¸ ÑÐ¾Ñ‚ÑƒÐ² Ò›Ð¸Ð´Ð¸Ñ€Ð¸Ñˆ..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
            title="ÐÐ¿Ð¸Ñˆ (Esc)"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-pulse"></div>
                <span>ÒšÐ¸Ð´Ð¸Ñ€Ð¸Ð»Ð¼Ð¾Ò›Ð´Ð°...</span>
              </div>
            </div>
          )}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium">Ò²ÐµÑ‡ Ð½Ð°Ñ€ÑÐ° Ñ‚Ð¾Ð¿Ð¸Ð»Ð¼Ð°Ð´Ð¸</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Ð‘Ð¾ÑˆÒ›Ð° ÑÑžÐ· Ð±Ð¸Ð»Ð°Ð½ Ò›Ð¸Ð´Ð¸Ñ€Ð¸Ð½Ð³</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="py-2">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-700/50 text-left transition-all duration-150 group border-l-2 border-transparent hover:border-blue-500"
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {result.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {result.subtitle}
                    </p>
                  </div>
                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded">
                      Enter
                    </kbd>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Search Tips */}
        {query.length < 2 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-b-xl">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">ðŸ’¡ Tezkor qidiruv:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Package className="w-4 h-4 text-blue-500" />
                <span>Mahsulotlar</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Users className="w-4 h-4 text-green-500" />
                <span>Mijozlar</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <ShoppingCart className="w-4 h-4 text-purple-500" />
                <span>Sotuvlar</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}