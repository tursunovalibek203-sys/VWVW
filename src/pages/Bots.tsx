import { useState } from 'react';
import { 
  Bot, MessageSquare, Send, Users, Settings, Play, Pause, 
  BarChart3, CheckCircle, XCircle, Clock, ChevronRight,
  Plus, MoreHorizontal, RefreshCw, Smartphone, Globe,
  Copy, Edit2, Trash2, Power, AlertCircle
} from 'lucide-react';

interface BotInstance {
  id: string;
  name: string;
  platform: 'telegram' | 'whatsapp' | 'web';
  status: 'active' | 'paused' | 'error';
  users: number;
  messages: number;
  responseRate: number;
  lastActive: string;
  description: string;
}

const mockBots: BotInstance[] = [
  { 
    id: '1', 
    name: 'LuxPetPlast Telegram', 
    platform: 'telegram', 
    status: 'active', 
    users: 1247, 
    messages: 8943, 
    responseRate: 98.5,
    lastActive: '2 daqiqa oldin',
    description: 'Mijozlarga mahsulotlar haqida ma\'lumot berish'
  },
  { 
    id: '2', 
    name: 'Buyurtma WhatsApp', 
    platform: 'whatsapp', 
    status: 'active', 
    users: 892, 
    messages: 5621, 
    responseRate: 94.2,
    lastActive: '5 daqiqa oldin',
    description: 'Buyurtmalarni qabul qilish va holatini kuzatish'
  },
  { 
    id: '3', 
    name: 'Yordamchi Web Bot', 
    platform: 'web', 
    status: 'paused', 
    users: 0, 
    messages: 3241, 
    responseRate: 0,
    lastActive: '2 soat oldin',
    description: 'Saytda mijozlarga yordam berish'
  },
  { 
    id: '4', 
    name: 'Marketing Bot', 
    platform: 'telegram', 
    status: 'error', 
    users: 567, 
    messages: 1890, 
    responseRate: 45.3,
    lastActive: '3 kun oldin',
    description: 'Yangi mahsulotlar va aksiyalar haqida xabarlar'
  },
];

export default function Bots() {
  const [bots, setBots] = useState<BotInstance[]>(mockBots);
  const [selectedBot, setSelectedBot] = useState<BotInstance | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const toggleBotStatus = (botId: string) => {
    setBots(bots.map(bot => {
      if (bot.id === botId) {
        return { ...bot, status: bot.status === 'active' ? 'paused' : 'active' };
      }
      return bot;
    }));
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'telegram': return <Send className="w-5 h-5 text-blue-500" />;
      case 'whatsapp': return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case 'web': return <Globe className="w-5 h-5 text-purple-500" />;
      default: return <Bot className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'paused': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'error': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'paused': return 'To\'xtatilgan';
      case 'error': return 'Xatolik';
      default: return status;
    }
  };

  const totalUsers = bots.reduce((sum, bot) => sum + bot.users, 0);
  const totalMessages = bots.reduce((sum, bot) => sum + bot.messages, 0);
  const activeBots = bots.filter(bot => bot.status === 'active').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bot boshqaruvi</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Telegram, WhatsApp va Web botlarni boshqarish</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yangi bot
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bot className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{bots.length}</p>
            <p className="text-sm text-blue-600 mt-1">Jami botlar</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeBots}</p>
            <p className="text-sm text-emerald-600 mt-1">Faol botlar</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalUsers.toLocaleString()}</p>
            <p className="text-sm text-purple-600 mt-1">Jami foydalanuvchilar</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalMessages.toLocaleString()}</p>
            <p className="text-sm text-amber-600 mt-1">Jami xabarlar</p>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bots.map((bot) => (
            <div 
              key={bot.id} 
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                    {getPlatformIcon(bot.platform)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{bot.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{bot.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleBotStatus(bot.id)}
                    title={bot.status === 'active' ? 'To\'xtatish' : 'Ishga tushirish'}
                    aria-label={bot.status === 'active' ? 'To\'xtatish' : 'Ishga tushirish'}
                    className={`p-2 rounded-lg transition-colors ${
                      bot.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setSelectedBot(bot)}
                    title="Sozlamalar"
                    aria-label="Sozlamalar"
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(bot.status)}`}>
                  {getStatusText(bot.status)}
                </span>
                <span className="text-xs text-gray-400">• {bot.lastActive}</span>
              </div>

              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{bot.users.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Foydalanuvchilar</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{bot.messages.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Xabarlar</p>
                </div>
                <div className="text-center">
                  <p className={`text-lg font-bold ${bot.responseRate > 90 ? 'text-emerald-600' : bot.responseRate > 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {bot.responseRate}%
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Javob berish</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Settings Modal */}
      {selectedBot && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  {getPlatformIcon(selectedBot.platform)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedBot.name}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Bot sozlamalari</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBot(null)}
                title="Yopish"
                aria-label="Yopish"
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <MoreHorizontal className="w-5 h-5 rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bot nomi</label>
                <input
                  type="text"
                  defaultValue={selectedBot.name}
                  placeholder="Bot nomini kiriting"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tavsif</label>
                <textarea
                  defaultValue={selectedBot.description}
                  rows={3}
                  placeholder="Bot tavsifini kiriting"
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">API Token</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value="••••••••••••••••"
                    readOnly
                    title="API Token (faqat ko'rish uchun)"
                    className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500"
                  />
                  <button 
                    title="Nusxa olish"
                    aria-label="Nusxa olish"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Saqlash
                </button>
                <button 
                  onClick={() => setSelectedBot(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
