import { useState } from 'react';
import { 
  Keyboard, Search, Plus, Edit2, Trash2, Save, 
  Copy, Printer, Download, Upload, RefreshCw, Home,
  ShoppingCart, Package, Users, DollarSign, Settings,
  ChevronRight, Command, MoreHorizontal, CheckCircle
} from 'lucide-react';

interface Shortcut {
  id: string;
  category: string;
  keys: string[];
  description: string;
  icon: React.ReactNode;
}

const shortcuts: Shortcut[] = [
  { id: '1', category: 'Navigatsiya', keys: ['Ctrl', 'K'], description: 'Qidirish', icon: <Search className="w-4 h-4" /> },
  { id: '2', category: 'Navigatsiya', keys: ['Ctrl', 'H'], description: 'Bosh sahifa', icon: <Home className="w-4 h-4" /> },
  { id: '3', category: 'Mahsulotlar', keys: ['Ctrl', 'P'], description: 'Mahsulotlar', icon: <Package className="w-4 h-4" /> },
  { id: '4', category: 'Sotuvlar', keys: ['Ctrl', 'S'], description: 'Sotuvlar', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: '5', category: 'Mijozlar', keys: ['Ctrl', 'C'], description: 'Mijozlar', icon: <Users className="w-4 h-4" /> },
  { id: '6', category: 'Moliya', keys: ['Ctrl', 'M'], description: 'Moliya', icon: <DollarSign className="w-4 h-4" /> },
  { id: '7', category: 'Umumiy', keys: ['Ctrl', 'N'], description: 'Yangi yaratish', icon: <Plus className="w-4 h-4" /> },
  { id: '8', category: 'Umumiy', keys: ['Ctrl', 'E'], description: 'Tahrirlash', icon: <Edit2 className="w-4 h-4" /> },
  { id: '9', category: 'Umumiy', keys: ['Ctrl', 'S'], description: 'Saqlash', icon: <Save className="w-4 h-4" /> },
  { id: '10', category: 'Umumiy', keys: ['Ctrl', 'D'], description: 'Nusxa olish', icon: <Copy className="w-4 h-4" /> },
  { id: '11', category: 'Umumiy', keys: ['Ctrl', 'P'], description: 'Chop etish', icon: <Printer className="w-4 h-4" /> },
  { id: '12', category: 'Umumiy', keys: ['Ctrl', 'R'], description: 'Yangilash', icon: <RefreshCw className="w-4 h-4" /> },
  { id: '13', category: 'Ma\'lumotlar', keys: ['Ctrl', 'I'], description: 'Import', icon: <Upload className="w-4 h-4" /> },
  { id: '14', category: 'Ma\'lumotlar', keys: ['Ctrl', 'X'], description: 'Eksport', icon: <Download className="w-4 h-4" /> },
  { id: '15', category: 'Tizim', keys: ['Ctrl', ','], description: 'Sozlamalar', icon: <Settings className="w-4 h-4" /> },
];

const categories = ['Navigatsiya', 'Mahsulotlar', 'Sotuvlar', 'Mijozlar', 'Moliya', 'Umumiy', 'Ma\'lumotlar', 'Tizim'];

export default function Shortcuts() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredShortcuts = shortcuts.filter(shortcut => {
    const matchesCategory = selectedCategory === 'all' || shortcut.category === selectedCategory;
    const matchesSearch = shortcut.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         shortcut.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const groupedShortcuts = categories.reduce((acc, category) => {
    if (category !== 'all') {
      acc[category] = filteredShortcuts.filter(s => s.category === category);
    }
    return acc;
  }, {} as Record<string, Shortcut[]>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Keyboard className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Klavisha yorliqlari</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tezkor harakatlar uchun klavisha kombinatsiyalari</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="p-4 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Qidirish (yorliq, kategoriya)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Barchasi
              </button>
              {categories.filter(c => c !== 'all').map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === category
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shortcuts Grid */}
        {selectedCategory === 'all' ? (
          <div className="space-y-8">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              categoryShortcuts.length > 0 && (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-orange-600" />
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutCard key={shortcut.id} shortcut={shortcut} />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShortcuts.map((shortcut) => (
              <ShortcutCard key={shortcut.id} shortcut={shortcut} />
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-6 border border-orange-100 dark:border-orange-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-orange-600" />
            Foydali maslahatlar
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Ctrl + K bilan istalgan sahifani tez qidirishingiz mumkin</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Mac foydalanuvchilari uchun Cmd tugmasi ishlaydi</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-600 mt-1">•</span>
              <span>Custom yorliqlarni sozlamalar orqali o'zgartirishingiz mumkin</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ShortcutCard({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
          {shortcut.icon}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-white">{shortcut.description}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{shortcut.category}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {shortcut.keys.map((key, index) => (
          <div key={index} className="flex items-center">
            <kbd className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[40px] text-center">
              {key}
            </kbd>
            {index < shortcut.keys.length - 1 && <span className="text-gray-400">+</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
