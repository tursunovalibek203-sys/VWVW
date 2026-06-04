import api from './api';

// Settings cache
let settingsCache: Record<string, string> = {};
let lastFetch = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getSettings = async (): Promise<Record<string, string>> => {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (now - lastFetch < CACHE_DURATION && Object.keys(settingsCache).length > 0) {
    return settingsCache;
  }

  try {
    const { data } = await api.get('/settings');
    settingsCache = data;
    lastFetch = now;
    return data;
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return settingsCache; // Return cached version if available
  }
};

export const getSetting = async (key: string, defaultValue: string = ''): Promise<string> => {
  const settings = await getSettings();
  return settings[key] || defaultValue;
};

export const getExchangeRate = async (currency: string): Promise<number> => {
  const key = `${currency}_TO_UZS_RATE`;
  const rate = await getSetting(key, currency === 'USD' ? '12500' : '13500');
  return parseFloat(rate);
};

export const getExchangeRates = async (): Promise<{ USD_TO_UZS: number; EUR_TO_UZS: number }> => {
  const usdRate = await getExchangeRate('USD');
  const eurRate = await getExchangeRate('EUR');
  return {
    USD_TO_UZS: usdRate,
    EUR_TO_UZS: eurRate
  };
};

export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string = 'UZS'): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;
  
  if (toCurrency === 'UZS') {
    const rate = await getExchangeRate(fromCurrency);
    return amount * rate;
  }
  
  // For other conversions, implement as needed
  return amount;
};

// Clear cache when settings are updated
export const clearSettingsCache = () => {
  settingsCache = {};
  lastFetch = 0;
};

// Company info helpers
export const getCompanyInfo = async () => {
  const settings = await getSettings();
  return {
    name: settings.COMPANY_NAME || 'Lux Pet Plast',
    address: settings.COMPANY_ADDRESS || 'Toshkent, O\'zbekiston',
    phone: settings.COMPANY_PHONE || '+998901234567',
    email: settings.COMPANY_EMAIL || 'info@aziztrades.com',
  };
};

// Tax helpers
export const getTaxRate = async (): Promise<number> => {
  const rate = await getSetting('TAX_RATE', '12');
  return parseFloat(rate);
};

export const calculateTax = async (amount: number): Promise<number> => {
  const rate = await getTaxRate();
  return (amount * rate) / 100;
};

// Invoice helpers
export const getInvoicePrefix = async (): Promise<string> => {
  return await getSetting('INVOICE_PREFIX', 'INV');
};

// Alert thresholds
export const getLowStockThreshold = async (): Promise<number> => {
  const threshold = await getSetting('LOW_STOCK_THRESHOLD', '10');
  return parseInt(threshold);
};

export const getDebtAlertDays = async (): Promise<number> => {
  const days = await getSetting('DEBT_ALERT_DAYS', '30');
  return parseInt(days);
};