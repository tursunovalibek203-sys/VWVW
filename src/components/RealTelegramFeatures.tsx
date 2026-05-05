import { useState } from 'react';
import { Card, CardContent } from './Card';
import { Progress } from './Progress';
import { Button } from './Button';
import { Badge } from './Badge';
import {
  ShoppingCart,
  Wallet,
  Gift,
  User,
  TrendingUp,
  Package,
  Star,
  Crown,
  Trophy,
  CreditCard,
  Settings,
  Download,
  Share2,
  Target,
  Zap,
  Shield,
  Bot,
  MessageCircle,
  Phone,
  MapPin,
  Calendar,
  Clock,
  Info,
  Send,
  RefreshCw,
  Search,
  Eye,
  ExternalLink,
  FileText,
  Video,
  Mic,
  Camera,
  Paperclip
} from 'lucide-react';

interface TelegramFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  available: boolean;
}

const telegramFeatures: TelegramFeature[] = [
  // Buyurtma funksiyalari
  {
    id: 'smart_order',
    name: 'Smart Buyurtma',
    description: 'AI tavsiyalari bilan tezkor buyurtma berish',
    icon: <ShoppingCart className="w-5 h-5" />,
    category: 'buyurtma',
    available: true
  },
  {
    id: 'quick_order',
    name: 'Tezkor Buyurtma',
    description: 'Bir click bilan buyurtma berish',
    icon: <Zap className="w-5 h-5" />,
    category: 'buyurtma',
    available: true
  },
  {
    id: 'bulk_order',
    name: 'Ommaviy Buyurtma',
    description: 'Ko\'p miqdordagi buyurtma',
    icon: <Package className="w-5 h-5" />,
    category: 'buyurtma',
    available: true
  },
  {
    id: 'repeat_order',
    name: 'Takroriy Buyurtma',
    description: 'Oldingi buyurtmalarni takrorlash',
    icon: <RefreshCw className="w-5 h-5" />,
    category: 'buyurtma',
    available: true
  },

  // Moliyaviy funksiyalar
  {
    id: 'real_time_balance',
    name: 'Real-time Balans',
    description: 'Onlayn balansni ko\'rish',
    icon: <Wallet className="w-5 h-5" />,
    category: 'moliyaviy',
    available: true
  },
  {
    id: 'credit_line',
    name: 'Kredit Liniyasi',
    description: 'Avans berish imkoniyati',
    icon: <CreditCard className="w-5 h-5" />,
    category: 'moliyaviy',
    available: true
  },
  {
    id: 'payment_plan',
    name: 'To\'lov Rejasi',
    description: 'Bo\'lib to\'lov tizimi',
    icon: <Calendar className="w-5 h-5" />,
    category: 'moliyaviy',
    available: true
  },
  {
    id: 'cashback',
    name: 'Cashback Tizimi',
    description: 'Qaytar pul tizimi',
    icon: <Trophy className="w-5 h-5" />,
    category: 'moliyaviy',
    available: true
  },

  // Tahlil va hisobotlar
  {
    id: 'detailed_stats',
    name: 'Batafsil Statistika',
    description: 'To\'liq statistika ma\'lumotlari',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'tahlil',
    available: true
  },
  {
    id: 'forecast',
    name: 'Prognoz va Tavsiyalar',
    description: 'AI prognozlari',
    icon: <Target className="w-5 h-5" />,
    category: 'tahlil',
    available: true
  },
  {
    id: 'export',
    name: 'Eksport (PDF, Excel)',
    description: 'Hisobotlarni eksport qilish',
    icon: <Download className="w-5 h-5" />,
    category: 'tahlil',
    available: true
  },
  {
    id: 'charts',
    name: 'Grafik va Diagrammalar',
    description: 'Vizual hisobotlar',
    icon: <FileText className="w-5 h-5" />,
    category: 'tahlil',
    available: true
  },

  // Bonus dasturlari
  {
    id: 'loyalty_points',
    name: 'Sadoqat Ballari',
    description: 'Ballarni yig\'ish va sarflash',
    icon: <Star className="w-5 h-5" />,
    category: 'bonus',
    available: true
  },
  {
    id: 'referral',
    name: 'Referral Tizimi',
    description: 'Do\'stlarni taklif qilish',
    icon: <Share2 className="w-5 h-5" />,
    category: 'bonus',
    available: true
  },
  {
    id: 'special_offers',
    name: 'Maxsus Aksiyalar',
    description: 'Shaxsiy chegirmalar',
    icon: <Gift className="w-5 h-5" />,
    category: 'bonus',
    available: true
  },
  {
    id: 'vip_privileges',
    name: 'VIP Imtiyozlar',
    description: 'VIP mijozlar uchun imtiyozlar',
    icon: <Crown className="w-5 h-5" />,
    category: 'bonus',
    available: true
  },

  // Komunikatsiya funksiyalari
  {
    id: 'voice_messages',
    name: 'Ovozli Xabarlar',
    description: 'Ovozli xabarlar yuborish/qabul qilish',
    icon: <Mic className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },
  {
    id: 'video_messages',
    name: 'Video Xabarlar',
    description: 'Video xabarlar yuborish/qabul qilish',
    icon: <Video className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },
  {
    id: 'photo_messages',
    name: 'Rasm Xabarlar',
    description: 'Rasm yuborish/qabul qilish',
    icon: <Camera className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },
  {
    id: 'file_sharing',
    name: 'Fayl Ulashish',
    description: 'Har xil fayllarni ulashish',
    icon: <Paperclip className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },
  {
    id: 'location_sharing',
    name: 'Lokatsiya Ulashish',
    description: 'GPS lokatsiya yuborish',
    icon: <MapPin className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },
  {
    id: 'contact_sharing',
    name: 'Kontakt Ulashish',
    description: 'Kontakt ma\'lumotlarini ulashish',
    icon: <Phone className="w-5 h-5" />,
    category: 'komunikatsiya',
    available: true
  },

  // Interaktiv funksiyalar
  {
    id: 'inline_buttons',
    name: 'Inline Tugmalar',
    description: 'Interaktiv tugmalar',
    icon: <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">Btn</div>,
    category: 'interaktiv',
    available: true
  },
  {
    id: 'keyboard_buttons',
    name: 'Keyboard Tugmalar',
    description: 'Tezkor tugmalar paneli',
    icon: <Settings className="w-5 h-5" />,
    category: 'interaktiv',
    available: true
  },
  {
    id: 'inline_queries',
    name: 'Inline So\'rovlar',
    description: 'Inline qidiruv tizimi',
    icon: <Search className="w-5 h-5" />,
    category: 'interaktiv',
    available: true
  },
  {
    id: 'web_app_integration',
    name: 'Web App Integratsiya',
    description: 'Web ilovalar bilan integratsiya',
    icon: <ExternalLink className="w-5 h-5" />,
    category: 'interaktiv',
    available: true
  },

  // Xavfsizlik funksiyalari
  {
    id: 'two_factor_auth',
    name: '2 faktorli Autentifikatsiya',
    description: 'Qo\'shimcha xavfsizlik',
    icon: <Shield className="w-5 h-5" />,
    category: 'xavfsizlik',
    available: true
  },
  {
    id: 'encryption',
    name: 'Shifrlash',
    description: 'Xabarlar shifrlanishi',
    icon: <Lock className="w-5 h-5" />,
    category: 'xavfsizlik',
    available: true
  },
  {
    id: 'privacy_settings',
    name: 'Maxfiylik Sozlamalari',
    description: 'Shaxsiy ma\'lumotlarni himoya qilish',
    icon: <Eye className="w-5 h-5" />,
    category: 'xavfsizlik',
    available: true
  },

  // Admin funksiyalari
  {
    id: 'broadcast_messages',
    name: 'Broadcast Xabarlar',
    description: 'Barcha foydalanuvchilarga xabar yuborish',
    icon: <Send className="w-5 h-5" />,
    category: 'admin',
    available: true
  },
  {
    id: 'user_management',
    name: 'Foydalanuvchilarni Boshqarish',
    description: 'Foydalanuvchilarni bloklash/qayta faollashtirish',
    icon: <User className="w-5 h-5" />,
    category: 'admin',
    available: true
  },
  {
    id: 'analytics_dashboard',
    name: 'Analytics Dashboard',
    description: 'Bot statistikasi va analitika',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'admin',
    available: true
  },
  {
    id: 'scheduled_messages',
    name: 'Rejalashtirilgan Xabarlar',
    description: 'Belgilangan vaqtda xabar yuborish',
    icon: <Clock className="w-5 h-5" />,
    category: 'admin',
    available: true
  }
];

const categories = [
  { id: 'buyurtma', name: 'Buyurtma', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'moliyaviy', name: 'Moliyaviy', icon: <Wallet className="w-4 h-4" /> },
  { id: 'tahlil', name: 'Tahlil', icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'bonus', name: 'Bonus', icon: <Gift className="w-4 h-4" /> },
  { id: 'komunikatsiya', name: 'Komunikatsiya', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'interaktiv', name: 'Interaktiv', icon: <Bot className="w-4 h-4" /> },
  { id: 'xavfsizlik', name: 'Xavfsizlik', icon: <Shield className="w-4 h-4" /> },
  { id: 'admin', name: 'Admin', icon: <Settings className="w-4 h-4" /> }
];

export default function RealTelegramFeatures() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);

  const filteredFeatures = telegramFeatures.filter(feature => {
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    const matchesSearch = feature.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showOnlyAvailable || feature.available;
    
    return matchesCategory && matchesSearch && matchesAvailability;
  });

  const getAvailableCount = (categoryId: string) => {
    return telegramFeatures.filter(f => 
      (categoryId === 'all' || f.category === categoryId) && f.available
    ).length;
  };

  const getTotalCount = (categoryId: string) => {
    return telegramFeatures.filter(f => 
      categoryId === 'all' || f.category === categoryId
    ).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Real Telegram Features</h1>
                <p className="text-gray-600">LUX PET PLAST - Telegram bot funksiyalari</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Jami funksiyalar</p>
              <p className="text-2xl font-bold text-blue-600">
                {telegramFeatures.filter(f => f.available).length}/{telegramFeatures.length}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {categories.map((category) => (
            <Card key={category.id} className="bg-white hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {category.icon}
                    </div>
                    <div>
                      <p className="font-semibold">{category.name}</p>
                      <p className="text-sm text-gray-600">
                        {getAvailableCount(category.id)}/{getTotalCount(category.id)} faol
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Progress 
                      value={(getAvailableCount(category.id) / getTotalCount(category.id)) * 100} 
                      className="w-16 h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Funksiyalarni qidirish..."
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  title="Select category"
                >
                  <option value="all">Barcha kategoriyalar</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <label className="flex items-center space-x-2 px-4 py-2 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                  />
                  <span className="text-sm">Faqat faol</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFeatures.map((feature) => (
            <Card key={feature.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      feature.available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.name}</h3>
                      <Badge variant={feature.available ? 'default' : 'warning'}>
                        {feature.available ? 'Faol' : 'Rejada'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-3">{feature.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {categories.find(c => c.id === feature.category)?.name}
                  </span>
                  <div className="flex space-x-1">
                    {feature.available && (
                      <>
                        <Button size="sm" variant="outline">
                          <Info className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-4">Funksiyalar Xulosasi</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-green-600">
                    {telegramFeatures.filter(f => f.available).length}
                  </p>
                  <p className="text-sm text-gray-600">Faol funksiyalar</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-yellow-600">
                    {telegramFeatures.filter(f => !f.available).length}
                  </p>
                  <p className="text-sm text-gray-600">Rejalashtirilgan</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-2xl font-bold text-blue-600">
                    {categories.length}
                  </p>
                  <p className="text-sm text-gray-600">Kategoriyalar</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add missing import
import { Lock } from 'lucide-react';
