import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DataBackup from '../components/DataBackup';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { 
  Bell, 
  Shield, 
  Building, 
  DollarSign, 
  Mail, 
  MessageSquare,
  Database,
  Lock,
  Factory,
  Percent,
  Package,
  Save,
  RefreshCw,
  ChevronRight,
  User,
  Settings as SettingsIcon,
  Cloud,
  Plus
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';

export default function Settings() {
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({
    // Valyuta kurslari
    USD_TO_UZS_RATE: '12500',
    EUR_TO_UZS_RATE: '13500',
    RUB_TO_UZS_RATE: '135',
    
    // Kompaniya ma'lumotlari
    COMPANY_NAME: 'LUX PET PLAST ZAVOD',
    COMPANY_ADDRESS: 'Toshkent, O\'zbekiston',
    COMPANY_PHONE: '+998901234567',
    COMPANY_EMAIL: 'info@luxpet.uz',
    COMPANY_WEBSITE: 'www.luxpet.uz',
    COMPANY_INN: '123456789',
    COMPANY_BANK_ACCOUNT: '20208000000000000000',
    COMPANY_BANK_NAME: 'Milliy Bank',
    COMPANY_MFO: '00014',
    
    // Soliq va faktura
    TAX_RATE: '12',
    INVOICE_PREFIX: 'LUX',
    INVOICE_START_NUMBER: '1',
    PAYMENT_TERMS_DAYS: '30',
    
    // Biznes sozlamalari
    LOW_STOCK_THRESHOLD: '10',
    CRITICAL_STOCK_THRESHOLD: '5',
    OPTIMAL_STOCK_MULTIPLIER: '2',
    DEBT_ALERT_DAYS: '30',
    DEBT_CRITICAL_DAYS: '60',
    MAX_CREDIT_LIMIT: '100000',
    AUTO_REORDER_ENABLED: 'false',
    
    // Narxlash
    DEFAULT_PROFIT_MARGIN: '20',
    VIP_DISCOUNT: '10',
    BULK_DISCOUNT_THRESHOLD: '100',
    BULK_DISCOUNT_PERCENT: '5',
    
    // Ishlab chiqarish
    PRODUCTION_SHIFT_HOURS: '8',
    QUALITY_CHECK_FREQUENCY: 'every_batch',
    DEFECT_TOLERANCE_PERCENT: '2',
    
    // Telegram
    TELEGRAM_BOT_TOKEN: '',
    TELEGRAM_ADMIN_CHAT_ID: '',
    TELEGRAM_NOTIFICATIONS_ENABLED: 'true',
    TELEGRAM_DAILY_REPORT_TIME: '18:00',
    
    // SMS
    SMS_API_KEY: '',
    SMS_PROVIDER: 'eskiz',
    SMS_NOTIFICATIONS_ENABLED: 'false',
    
    // Email
    EMAIL_SMTP_HOST: '',
    EMAIL_SMTP_PORT: '587',
    EMAIL_USERNAME: '',
    EMAIL_PASSWORD: '',
    EMAIL_FROM_NAME: 'LUX PET Plast',
    EMAIL_NOTIFICATIONS_ENABLED: 'false',
    
    // Tizim
    BACKUP_FREQUENCY: 'daily',
    BACKUP_RETENTION_DAYS: '30',
    AUTO_BACKUP_ENABLED: 'true',
    LANGUAGE: 'uz',
    TIMEZONE: 'Asia/Tashkent',
    DATE_FORMAT: 'DD.MM.YYYY',
    TIME_FORMAT: '24h',
    CURRENCY_DISPLAY: 'symbol',
    
    // Xavfsizlik
    SESSION_TIMEOUT_MINUTES: '60',
    PASSWORD_MIN_LENGTH: '6',
    PASSWORD_REQUIRE_SPECIAL: 'false',
    TWO_FACTOR_ENABLED: 'false',
    LOGIN_ATTEMPTS_LIMIT: '5',
    
    // Hisobotlar
    REPORT_LOGO_URL: '',
    REPORT_FOOTER_TEXT: 'LUX PET Plast Zavod - Sifat va Ishonch',
    REPORT_SHOW_WATERMARK: 'false',
    
    // Integratsiyalar
    CLICK_MERCHANT_ID: '',
    CLICK_SERVICE_ID: '',
    CLICK_SECRET_KEY: '',
    PAYME_MERCHANT_ID: '',
    PAYME_SECRET_KEY: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get('/settings');
      setSettings(data);
    } catch (error) {
      console.error('Settings loading error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadSettings();
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.put('/settings', settings);
      alert(latinToCyrillic('Sozlamalar muvaffaqiyatli saqlandi!'));
    } catch (error: any) {
      console.error('Save settings error:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(latinToCyrillic(`Sozlamalarni saqlashda xatolik: ${errorMessage}`));
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const tabs = [
    { id: 'general', name: 'Umumiy', icon: SettingsIcon },
    { id: 'business', name: 'Biznes', icon: Factory },
    { id: 'notifications', name: 'Bildirishnomalar', icon: Bell },
    { id: 'security', name: 'Xavfsizlik', icon: Lock },
    { id: 'backup', name: 'Backup', icon: Database }
  ];

  return (
    <div className="space-y-12 pb-20 animate-in fade-in duration-700">
      {/* Premium Header - Login Page Style */}
      <div className="relative overflow-hidden login-card rounded-[2.5rem]">
        <div className="absolute top-0 -left-10 w-64 h-64 bg-blue-100 dark:bg-blue-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-purple-100 dark:bg-purple-900/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 p-8 sm:p-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full text-[10px] font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-blue-500/25">
              <Shield className="w-3 h-3" />
              System Administration
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
              {latinToCyrillic("Tizim")} <br />
              <span className="text-blue-600">{latinToCyrillic("sozlamalari")}</span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <button 
              type="button"
              onClick={handleRefresh}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-gray-900 dark:text-white shadow-md border border-gray-100 dark:border-gray-700"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {latinToCyrillic("Yangilash")}
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-sm transition-all active:scale-95 text-white shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {loading ? '...' : latinToCyrillic("Saqlash")}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Navigation Sidebar */}
        <div className="w-full lg:w-80 space-y-2">
          {tabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] transition-all duration-300 group ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20 translate-x-2'
                  : 'bg-white dark:bg-gray-900 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              <div className={`p-2.5 rounded-xl ${
                activeTab === tab.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-600'
              }`}>
                <tab.icon className="w-5 h-5" />
              </div>
              <span className="font-semibold text-xs uppercase tracking-wide">{latinToCyrillic(tab.name)}</span>
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-10">
          {activeTab === 'general' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              {/* Company Info */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                    <Building className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Kompaniya Ma'lumotlari")}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Kompaniya Nomi")}</label>
                    <input
                      aria-label="Kompaniya nomi"
                      placeholder="Kompaniya nomi"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.COMPANY_NAME}
                      onChange={(e) => updateSetting('COMPANY_NAME', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Telefon")}</label>
                    <input
                      aria-label="Telefon raqami"
                      placeholder="+998 XX XXX XX XX"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.COMPANY_PHONE}
                      onChange={(e) => updateSetting('COMPANY_PHONE', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Email")}</label>
                    <input
                      aria-label="Email manzil"
                      placeholder="email@example.com"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.COMPANY_EMAIL}
                      onChange={(e) => updateSetting('COMPANY_EMAIL', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Manzil")}</label>
                    <input
                      aria-label="Manzil"
                      placeholder="Manzil"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.COMPANY_ADDRESS}
                      onChange={(e) => updateSetting('COMPANY_ADDRESS', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Currency Rates */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Valyuta Kurslari")}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">USD → UZS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="USD to UZS exchange rate"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-sm transition-all"
                      value={settings.USD_TO_UZS_RATE}
                      onChange={(e) => updateSetting('USD_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">EUR → UZS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="EUR to UZS exchange rate"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-sm transition-all"
                      value={settings.EUR_TO_UZS_RATE}
                      onChange={(e) => updateSetting('EUR_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">RUB → UZS</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="RUB to UZS exchange rate"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-sm transition-all"
                      value={settings.RUB_TO_UZS_RATE}
                      onChange={(e) => updateSetting('RUB_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              {/* Business Limits */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-600">
                    <Percent className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Biznes va Narxlash")}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Foyda Marjasi (%)")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Default profit margin percentage"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm transition-all"
                      value={settings.DEFAULT_PROFIT_MARGIN}
                      onChange={(e) => updateSetting('DEFAULT_PROFIT_MARGIN', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("VIP Chegirma (%)")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="VIP discount percentage"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm transition-all"
                      value={settings.VIP_DISCOUNT}
                      onChange={(e) => updateSetting('VIP_DISCOUNT', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Kam qolgan qoldiq")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Low stock threshold"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm transition-all"
                      value={settings.LOW_STOCK_THRESHOLD}
                      onChange={(e) => updateSetting('LOW_STOCK_THRESHOLD', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Qarz muddati (kun)")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Debt alert days"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-amber-500 outline-none font-bold text-sm transition-all"
                      value={settings.DEBT_ALERT_DAYS}
                      onChange={(e) => updateSetting('DEBT_ALERT_DAYS', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <button
                  type="button"
                  onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
                  className="flex items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 hover:scale-[1.02] transition-all group"
                >
                  <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 group-hover:rotate-6 transition-all">
                    <Package className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{latinToCyrillic("Mahsulotlar")}</p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">{latinToCyrillic("Boshqarish")}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate(isCashier ? '/cashier/add-product' : '/add-product')}
                  className="flex items-center gap-6 p-8 bg-white dark:bg-gray-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 hover:scale-[1.02] transition-all group"
                >
                  <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:rotate-6 transition-all">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{latinToCyrillic("Yangi Mahsulot")}</p>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-1">{latinToCyrillic("Qo'shish")}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Telegram Bot</h3>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Bot Token</label>
                    <input
                      type="password"
                      aria-label="Telegram bot token"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.TELEGRAM_BOT_TOKEN}
                      onChange={(e) => updateSetting('TELEGRAM_BOT_TOKEN', e.target.value)}
                      placeholder="1234567890:ABC..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">Admin Chat ID</label>
                    <input
                      aria-label="Telegram admin chat ID"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm transition-all"
                      value={settings.TELEGRAM_ADMIN_CHAT_ID}
                      onChange={(e) => updateSetting('TELEGRAM_ADMIN_CHAT_ID', e.target.value)}
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-rose-50 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600">
                    <Mail className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Email SMTP</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">SMTP Host</label>
                    <input
                      aria-label="Email SMTP host"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-sm transition-all"
                      value={settings.EMAIL_SMTP_HOST}
                      onChange={(e) => updateSetting('EMAIL_SMTP_HOST', e.target.value)}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">SMTP Port</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Email SMTP port"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-rose-500 outline-none font-bold text-sm transition-all"
                      value={settings.EMAIL_SMTP_PORT}
                      onChange={(e) => updateSetting('EMAIL_SMTP_PORT', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Xavfsizlik Sozlamalari")}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Sessiya Vaqti (daqiqa)")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Session timeout in minutes"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none font-bold text-sm transition-all"
                      value={settings.SESSION_TIMEOUT_MINUTES}
                      onChange={(e) => updateSetting('SESSION_TIMEOUT_MINUTES', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Parol Minimal Uzunligi")}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label="Password minimum length"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-violet-500 outline-none font-bold text-sm transition-all"
                      value={settings.PASSWORD_MIN_LENGTH}
                      onChange={(e) => updateSetting('PASSWORD_MIN_LENGTH', e.target.value.replace(/[^0-9.]/g, ''))}
                    />
                  </div>
                </div>
              </div>

              {/* User Profile Summary */}
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600">
                    <User className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">{latinToCyrillic("Mening Profilim")}</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Ism")}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{user?.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-1">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">{latinToCyrillic("Rol")}</p>
                    <span className="inline-flex mt-1 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-semibold uppercase tracking-wider rounded-full">
                      {user?.role}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backup' && (
            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Cloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Cloud Backup</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                  <div className="space-y-2">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Backup Chastotasi")}</label>
                    <select
                      aria-label="Backup chastotasi tanlash"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                      value={settings.BACKUP_FREQUENCY}
                      onChange={(e) => updateSetting('BACKUP_FREQUENCY', e.target.value)}
                    >
                      <option value="daily">{latinToCyrillic("Har kuni")}</option>
                      <option value="weekly">{latinToCyrillic("Haftada bir marta")}</option>
                      <option value="monthly">{latinToCyrillic("Oyda bir marta")}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="language-select" className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest ml-1">{latinToCyrillic("Til")}</label>
                    <select
                      id="language-select"
                      className="w-full px-6 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-sm transition-all appearance-none cursor-pointer"
                      value={settings.LANGUAGE}
                      onChange={(e) => updateSetting('LANGUAGE', e.target.value)}
                    >
                      <option value="uz">O'zbek</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                {user?.role === 'ADMIN' && (
                  <div className="pt-6 border-t border-gray-50 dark:border-gray-800">
                    <DataBackup />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
