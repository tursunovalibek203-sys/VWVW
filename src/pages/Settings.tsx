import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import DataBackup from '../components/DataBackup';
import { useAuthStore } from '../store/authStore';
import api from '../lib/professionalApi';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { PageLoading } from '../components/ui/LoadingSpinner';
import {
  Bell,
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
  User,
  Settings as SettingsIcon,
  Cloud,
  Plus,
  type LucideIcon
} from 'lucide-react';
import { latinToCyrillic } from '../lib/transliterator';

const t = latinToCyrillic;

// Reusable labelled field — clear label + optional description + slot for control
function Field({
  label,
  description,
  htmlFor,
  children
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
      {description && (
        <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

// White rounded-2xl section card with icon header
function SettingGroup({
  icon: Icon,
  iconTint,
  title,
  description,
  children
}: {
  icon: LucideIcon;
  iconTint: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 p-6">
      <div className="flex items-start gap-3.5 mb-6">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconTint}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm text-slate-400 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

const fieldClass =
  'w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none font-medium text-sm text-slate-900 transition-all placeholder:text-slate-400';

export default function Settings() {
  const navigate = useNavigate();
  const isCashier = window.location.pathname.startsWith('/cashier');
  const { user } = useAuthStore();
  const { addToast } = useToast();
  const [initialLoading, setInitialLoading] = useState(true);
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
      setInitialLoading(false);
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
      addToast({
        type: 'success',
        title: t('Saqlandi'),
        message: t('Sozlamalar muvaffaqiyatli saqlandi')
      });
    } catch (error: any) {
      console.error('Save settings error:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
      addToast({
        type: 'error',
        title: t('Xatolik'),
        message: t('Sozlamalarni saqlashda xatolik') + ': ' + errorMessage
      });
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

  if (initialLoading) {
    return <PageLoading text={t('Sozlamalar yuklanmoqda...')} />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold text-slate-900 tracking-tight">
            {t('Tizim sozlamalari')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('Valyuta kurslari, kompaniya malumotlari va boshqa tizim parametrlarini boshqaring')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 disabled:opacity-60 rounded-xl text-sm font-semibold text-slate-600 border border-slate-200 transition-colors active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {t('Yangilash')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors active:scale-[0.98]"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {loading ? t('Saqlanmoqda...') : t('Saqlash')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto -mb-2 pb-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-500 border border-slate-200 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {t(tab.name)}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'general' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Company Info */}
            <SettingGroup
              icon={Building}
              iconTint="bg-indigo-50 text-indigo-600"
              title={t('Kompaniya malumotlari')}
              description={t('Hujjatlar va fakturalarda korsatiladi')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label={t('Kompaniya nomi')} htmlFor="company-name">
                  <input
                    id="company-name"
                    aria-label="Kompaniya nomi"
                    placeholder={t('Kompaniya nomi')}
                    className={fieldClass}
                    value={settings.COMPANY_NAME}
                    onChange={(e) => updateSetting('COMPANY_NAME', e.target.value)}
                  />
                </Field>
                <Field label={t('Telefon')} htmlFor="company-phone">
                  <input
                    id="company-phone"
                    aria-label="Telefon raqami"
                    placeholder="+998 XX XXX XX XX"
                    className={fieldClass}
                    value={settings.COMPANY_PHONE}
                    onChange={(e) => updateSetting('COMPANY_PHONE', e.target.value)}
                  />
                </Field>
                <Field label="Email" htmlFor="company-email">
                  <input
                    id="company-email"
                    aria-label="Email manzil"
                    placeholder="email@example.com"
                    className={fieldClass}
                    value={settings.COMPANY_EMAIL}
                    onChange={(e) => updateSetting('COMPANY_EMAIL', e.target.value)}
                  />
                </Field>
                <Field label={t('Manzil')} htmlFor="company-address">
                  <input
                    id="company-address"
                    aria-label="Manzil"
                    placeholder={t('Manzil')}
                    className={fieldClass}
                    value={settings.COMPANY_ADDRESS}
                    onChange={(e) => updateSetting('COMPANY_ADDRESS', e.target.value)}
                  />
                </Field>
              </div>
            </SettingGroup>

            {/* Currency Rates */}
            <SettingGroup
              icon={DollarSign}
              iconTint="bg-emerald-50 text-emerald-600"
              title={t('Valyuta kurslari')}
              description={t('1 birlik valyuta necha somga teng')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                <Field label="USD → UZS" description={t('AQSh dollari kursi')} htmlFor="rate-usd">
                  <input
                    id="rate-usd"
                    type="text"
                    inputMode="decimal"
                    aria-label="USD to UZS exchange rate"
                    className={fieldClass}
                    value={settings.USD_TO_UZS_RATE}
                    onChange={(e) => updateSetting('USD_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label="EUR → UZS" description={t('Yevro kursi')} htmlFor="rate-eur">
                  <input
                    id="rate-eur"
                    type="text"
                    inputMode="decimal"
                    aria-label="EUR to UZS exchange rate"
                    className={fieldClass}
                    value={settings.EUR_TO_UZS_RATE}
                    onChange={(e) => updateSetting('EUR_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label="RUB → UZS" description={t('Rubl kursi')} htmlFor="rate-rub">
                  <input
                    id="rate-rub"
                    type="text"
                    inputMode="decimal"
                    aria-label="RUB to UZS exchange rate"
                    className={fieldClass}
                    value={settings.RUB_TO_UZS_RATE}
                    onChange={(e) => updateSetting('RUB_TO_UZS_RATE', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
              </div>
            </SettingGroup>
          </div>
        )}

      {activeTab === 'business' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Business Limits */}
            <SettingGroup
              icon={Percent}
              iconTint="bg-amber-50 text-amber-600"
              title={t('Biznes va narxlash')}
              description={t('Foyda, chegirma va ombor chegaralari')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label={t('Foyda marjasi (%)')} description={t('Standart ustama foiz')} htmlFor="profit-margin">
                  <input
                    id="profit-margin"
                    type="text"
                    inputMode="decimal"
                    aria-label="Default profit margin percentage"
                    className={fieldClass}
                    value={settings.DEFAULT_PROFIT_MARGIN}
                    onChange={(e) => updateSetting('DEFAULT_PROFIT_MARGIN', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label={t('VIP chegirma (%)')} description={t('VIP mijozlar uchun chegirma')} htmlFor="vip-discount">
                  <input
                    id="vip-discount"
                    type="text"
                    inputMode="decimal"
                    aria-label="VIP discount percentage"
                    className={fieldClass}
                    value={settings.VIP_DISCOUNT}
                    onChange={(e) => updateSetting('VIP_DISCOUNT', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label={t('Kam qolgan qoldiq')} description={t('Bu chegaradan past boisa ogohlantirish')} htmlFor="low-stock">
                  <input
                    id="low-stock"
                    type="text"
                    inputMode="decimal"
                    aria-label="Low stock threshold"
                    className={fieldClass}
                    value={settings.LOW_STOCK_THRESHOLD}
                    onChange={(e) => updateSetting('LOW_STOCK_THRESHOLD', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label={t('Qarz muddati (kun)')} description={t('Qarz boyicha eslatma muddati')} htmlFor="debt-days">
                  <input
                    id="debt-days"
                    type="text"
                    inputMode="decimal"
                    aria-label="Debt alert days"
                    className={fieldClass}
                    value={settings.DEBT_ALERT_DAYS}
                    onChange={(e) => updateSetting('DEBT_ALERT_DAYS', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
              </div>
            </SettingGroup>

            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <button
                type="button"
                onClick={() => navigate(isCashier ? '/cashier/products' : '/products')}
                className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 text-left"
              >
                <div className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t('Mahsulotlar')}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{t('Boshqarish')}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate(isCashier ? '/cashier/add-product' : '/add-product')}
                className="group flex items-center gap-4 p-5 bg-white rounded-2xl border border-slate-200/70 hover:border-slate-300 hover:shadow-[0_4px_20px_rgba(15,23,42,0.06)] transition-all duration-200 text-left"
              >
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{t('Yangi mahsulot')}</p>
                  <p className="text-sm text-slate-400 mt-0.5">{t('Qoshish')}</p>
                </div>
              </button>
            </div>
          </div>
        )}

      {activeTab === 'notifications' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingGroup
              icon={MessageSquare}
              iconTint="bg-indigo-50 text-indigo-600"
              title="Telegram Bot"
              description={t('Avtomatik bildirishnomalar uchun')}
            >
              <div className="grid grid-cols-1 gap-5">
                <Field label="Bot Token" description={t('@BotFather dan olingan maxfiy token')} htmlFor="tg-token">
                  <input
                    id="tg-token"
                    type="password"
                    aria-label="Telegram bot token"
                    className={fieldClass}
                    value={settings.TELEGRAM_BOT_TOKEN}
                    onChange={(e) => updateSetting('TELEGRAM_BOT_TOKEN', e.target.value)}
                    placeholder="1234567890:ABC..."
                  />
                </Field>
                <Field label="Admin Chat ID" description={t('Xabar yuboriladigan chat identifikatori')} htmlFor="tg-chat">
                  <input
                    id="tg-chat"
                    aria-label="Telegram admin chat ID"
                    className={fieldClass}
                    value={settings.TELEGRAM_ADMIN_CHAT_ID}
                    onChange={(e) => updateSetting('TELEGRAM_ADMIN_CHAT_ID', e.target.value)}
                    placeholder="123456789"
                  />
                </Field>
              </div>
            </SettingGroup>

            <SettingGroup
              icon={Mail}
              iconTint="bg-rose-50 text-rose-600"
              title="Email SMTP"
              description={t('Elektron pochta orqali xabarnoma yuborish')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label="SMTP Host" htmlFor="smtp-host">
                  <input
                    id="smtp-host"
                    aria-label="Email SMTP host"
                    className={fieldClass}
                    value={settings.EMAIL_SMTP_HOST}
                    onChange={(e) => updateSetting('EMAIL_SMTP_HOST', e.target.value)}
                    placeholder="smtp.gmail.com"
                  />
                </Field>
                <Field label="SMTP Port" htmlFor="smtp-port">
                  <input
                    id="smtp-port"
                    type="text"
                    inputMode="decimal"
                    aria-label="Email SMTP port"
                    className={fieldClass}
                    value={settings.EMAIL_SMTP_PORT}
                    onChange={(e) => updateSetting('EMAIL_SMTP_PORT', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
              </div>
            </SettingGroup>
          </div>
        )}

      {activeTab === 'security' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingGroup
              icon={Lock}
              iconTint="bg-violet-50 text-violet-600"
              title={t('Xavfsizlik sozlamalari')}
              description={t('Sessiya va parol qoidalari')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label={t('Sessiya vaqti (daqiqa)')} description={t('Faolsizlikdan keyin chiqarish')} htmlFor="session-timeout">
                  <input
                    id="session-timeout"
                    type="text"
                    inputMode="decimal"
                    aria-label="Session timeout in minutes"
                    className={fieldClass}
                    value={settings.SESSION_TIMEOUT_MINUTES}
                    onChange={(e) => updateSetting('SESSION_TIMEOUT_MINUTES', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
                <Field label={t('Parol minimal uzunligi')} description={t('Tavsiya etiladi: kamida 8 belgi')} htmlFor="pwd-min">
                  <input
                    id="pwd-min"
                    type="text"
                    inputMode="decimal"
                    aria-label="Password minimum length"
                    className={fieldClass}
                    value={settings.PASSWORD_MIN_LENGTH}
                    onChange={(e) => updateSetting('PASSWORD_MIN_LENGTH', e.target.value.replace(/[^0-9.]/g, ''))}
                  />
                </Field>
              </div>
            </SettingGroup>

            {/* User Profile Summary */}
            <SettingGroup
              icon={User}
              iconTint="bg-slate-100 text-slate-600"
              title={t('Mening profilim')}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Ism')}</p>
                  <p className="font-semibold text-slate-900 mt-1 break-words">{user?.name}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="font-semibold text-slate-900 mt-1 break-words">{user?.email}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('Rol')}</p>
                  <span className="inline-flex mt-1.5 px-3 py-1 bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-wider rounded-full">
                    {user?.role}
                  </span>
                </div>
              </div>
            </SettingGroup>
          </div>
        )}

      {activeTab === 'backup' && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SettingGroup
              icon={Cloud}
              iconTint="bg-emerald-50 text-emerald-600"
              title="Cloud Backup"
              description={t('Avtomatik zaxira nusxa va til sozlamalari')}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Field label={t('Backup chastotasi')} htmlFor="backup-frequency">
                  <select
                    id="backup-frequency"
                    aria-label="Backup chastotasi tanlash"
                    className={`${fieldClass} appearance-none cursor-pointer`}
                    value={settings.BACKUP_FREQUENCY}
                    onChange={(e) => updateSetting('BACKUP_FREQUENCY', e.target.value)}
                  >
                    <option value="daily">{t('Har kuni')}</option>
                    <option value="weekly">{t('Haftada bir marta')}</option>
                    <option value="monthly">{t('Oyda bir marta')}</option>
                  </select>
                </Field>
                <Field label={t('Til')} htmlFor="language-select">
                  <select
                    id="language-select"
                    className={`${fieldClass} appearance-none cursor-pointer`}
                    value={settings.LANGUAGE}
                    onChange={(e) => updateSetting('LANGUAGE', e.target.value)}
                  >
                    <option value="uz">O'zbek</option>
                    <option value="ru">{t('Ruscha')}</option>
                    <option value="en">English</option>
                  </select>
                </Field>
              </div>

              {user?.role === 'ADMIN' && (
                <div className="mt-8 pt-6 border-t border-slate-200/70">
                  <DataBackup />
                </div>
              )}
            </SettingGroup>
          </div>
        )}

      {/* Bottom save action */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          variant="primary"
          size="lg"
          onClick={handleSave}
          isLoading={loading}
          loadingText={t('Saqlanmoqda...')}
          leftIcon={<Save className="w-5 h-5" />}
        >
          {t('Sozlamalarni saqlash')}
        </Button>
      </div>
    </div>
  );
}
