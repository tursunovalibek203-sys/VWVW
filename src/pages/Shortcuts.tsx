import { useState } from 'react';
import {
  Keyboard, Search, Plus, Edit2, Save,
  Copy, Printer, Download, Upload, RefreshCw, Home,
  ShoppingCart, Package, Users, DollarSign, Settings,
  Command, Lightbulb, SearchX
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';
import EmptyState from '../components/EmptyState';

const t = latinToCyrillic;

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

// Per-category tint for the icon chip so groups read at a glance
const categoryTint: Record<string, string> = {
  'Navigatsiya': 'bg-blue-50 text-blue-600',
  'Mahsulotlar': 'bg-indigo-50 text-indigo-600',
  'Sotuvlar': 'bg-emerald-50 text-emerald-600',
  'Mijozlar': 'bg-violet-50 text-violet-600',
  'Moliya': 'bg-amber-50 text-amber-600',
  'Umumiy': 'bg-sky-50 text-sky-600',
  'Ma\'lumotlar': 'bg-rose-50 text-rose-600',
  'Tizim': 'bg-slate-100 text-slate-600',
};

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

  const hasResults = filteredShortcuts.length > 0;

  return (
    <div className="min-h-screen bg-gray-50/60 pb-24">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Hero header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-glass-lg">
          <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-6 w-36 h-36 bg-white/5 rounded-full blur-2xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white/80">{t('Yordam')}</p>
              <h1 className="mt-1 text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {t('Klaviatura yorliqlari')}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-white/75 leading-relaxed">
                {t('Tezkor harakatlar uchun klaviatura kombinatsiyalari. Ishni jadallashtiring va kamroq sichqoncha bilan boshqaring.')}
              </p>
            </div>
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
              <Keyboard className="w-7 h-7 text-white" />
            </div>
          </div>
          <div className="relative mt-6 flex items-center gap-6 text-white/90">
            <div>
              <p className="text-2xl font-bold">{shortcuts.length}</p>
              <p className="text-xs text-white/70">{t('Jami yorliqlar')}</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div>
              <p className="text-2xl font-bold">{categories.length}</p>
              <p className="text-xs text-white/70">{t('Bo\'limlar')}</p>
            </div>
          </div>
        </div>

        {/* Search + category filters */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder={t('Qidirish (yorliq yoki bo\'lim)')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-medium text-sm text-gray-900 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                selectedCategory === 'all'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
              }`}
            >
              {t('Barchasi')}
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                }`}
              >
                {t(category)}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts grouped by category */}
        {!hasResults ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <EmptyState
              icon={SearchX}
              title={t('Hech narsa topilmadi')}
              description={t('Qidiruv yoki bo\'lim bo\'yicha mos yorliq yo\'q. Boshqa kalit so\'z bilan urinib ko\'ring.')}
              action={
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t('Filterni tozalash')}
                </button>
              }
            />
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
              categoryShortcuts.length > 0 && (
                <section key={category} className="bg-white rounded-2xl p-6 sm:p-7 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${categoryTint[category] ?? 'bg-gray-100 text-gray-600'}`}>
                      <Command className="w-4 h-4" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">{t(category)}</h2>
                    <span className="ml-auto text-xs font-semibold text-gray-400">
                      {categoryShortcuts.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {categoryShortcuts.map((shortcut) => (
                      <ShortcutRow key={shortcut.id} shortcut={shortcut} />
                    ))}
                  </div>
                </section>
              )
            ))}
          </div>
        )}

        {/* Tips */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Lightbulb className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">{t('Foydali maslahatlar')}</h3>
          </div>
          <ul className="space-y-2.5 text-sm text-gray-600">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>{t('Ctrl + K bilan istalgan sahifani tez qidirishingiz mumkin.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>{t('Mac foydalanuvchilari uchun Cmd tugmasi ishlaydi.')}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
              <span>{t('Maxsus yorliqlarni sozlamalar orqali o\'zgartirishingiz mumkin.')}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ShortcutRow({ shortcut }: { shortcut: Shortcut }) {
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all duration-200">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${categoryTint[shortcut.category] ?? 'bg-gray-100 text-gray-600'}`}>
        {shortcut.icon}
      </div>
      <p className="font-semibold text-sm text-gray-800 truncate">{shortcut.description}</p>
      <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
        {shortcut.keys.map((key, index) => (
          <span key={index} className="flex items-center gap-1.5">
            <Keycap>{key}</Keycap>
            {index < shortcut.keys.length - 1 && (
              <span className="text-gray-300 text-xs font-bold">+</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// Real-keycap styled key chip: raised, beveled, soft inner highlight
function Keycap({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[34px] h-8 items-center justify-center rounded-lg border border-gray-300 border-b-2 border-b-gray-400 bg-gradient-to-b from-white to-gray-100 px-2 text-[13px] font-bold text-gray-700 shadow-sm leading-none">
      {children}
    </kbd>
  );
}
