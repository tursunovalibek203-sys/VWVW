// Utility functions for Sale operations
import type { Product, SaleItemForm } from '../types';

export const DEFAULT_EXCHANGE_RATE = 12500;
export const DEFAULT_UNITS_PER_BAG = 2000;

// Get currency symbol
export const getCurrencySymbol = (currency: string): string => {
  return currency === 'UZS' ? 'UZS ' : '$';
};

// Format amount for display
export const formatAmount = (amount: number, currency: string): string => {
  if (currency === 'UZS') {
    return Math.round(amount).toLocaleString();
  }
  return amount.toFixed(2);
};

// Get display amount
export const getDisplayAmount = (amount: number, currency: string): string => {
  if (currency === 'UZS') {
    return Math.round(amount).toString();
  }
  return amount.toFixed(2);
};

// Calculate subtotal
export const calculateSubtotal = (
  quantity: number,
  pricePerBag: number,
  saleType: 'bag' | 'piece',
  unitsPerBag: number
): number => {
  if (saleType === 'piece') {
    const totalPieces = quantity * unitsPerBag;
    const pricePerPiece = pricePerBag / unitsPerBag;
    return totalPieces * pricePerPiece;
  }
  return quantity * pricePerBag;
};

// Calculate total amount from items
export const calculateTotal = (items: SaleItemForm[]): number => {
  return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
};

// Calculate paid amount
export const calculatePaidAmount = (
  paidUZS: string,
  paidUSD: string,
  exchangeRate: number,
  currency: string,
  paidKARTA?: string
): number => {
  const uzs = parseFloat(paidUZS) || 0;
  const usd = parseFloat(paidUSD) || 0;
  const karta = parseFloat(paidKARTA || '0') || 0;

  let result: number;
  if (currency === 'UZS') {
    result = uzs + (usd * exchangeRate) + karta;
  } else {
    result = uzs / exchangeRate + usd + (karta / exchangeRate);
  }

  return result;
};

// Calculate debt (returns positive for debt, negative for overpayment)
export const calculateDebt = (total: number, paid: number): number => {
  return total - paid; // Can be negative for overpayment
};

// Get default piece price based on product name
export const getDefaultPiecePrice = (productName: string): number | null => {
  const name = productName?.toLowerCase() || '';
  const gramMatch = name.match(/(\d+)\s*(gr|g|гр|г)/);
  const gramSize = gramMatch ? parseInt(gramMatch[1]) : null;

  // Special prices for specific gram sizes
  const prices: Record<number, number> = {
    15: 0.02925,
    21: 0.04095,
    26: 0.0507,
    30: 0.0585,
    36: 0.0702,
    52: 0.1283,
    70: 0.163,
    75: 0.147,
    80: 0.152,
    85: 0.166,
    86: 0.167,
    135: 0.265,
  };

  if (gramSize && prices[gramSize]) {
    return prices[gramSize];
  }

  // 48 krishka
  if (/\b48\b/.test(name) && (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка'))) {
    return 0.016;
  }

  // 38 ruchka
  if (/\b38\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.010;
  }

  // 48 ruchka
  if (/\b48\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.016;
  }

  // 28 ruchka
  if (/\b28\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.010;
  }

  // 28 krishka bezgaz
  if (/\b28\b/.test(name) && (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка'))) {
    if (name.includes('gaz') || name.includes('газ')) {
      return 0.008; // gazlik
    }
    if (name.includes('dkm') || name.includes('DKM')) {
      return 0.012; // dkm
    }
    if (name.includes('okm') || name.includes('OKM') || name.includes('Okm')) {
      return 0.007; // okm
    }
    return 0.007; // bezgaz
  }

  // 38 krishka
  if (/\b38\b/.test(name) && (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка'))) {
    return 0.015;
  }

  return null;
};

// Get default units per bag
export const getDefaultUnitsPerBag = (productName: string): number | null => {
  const name = productName?.toLowerCase() || '';
  const gramMatch = name.match(/(\d+)\s*(gr|g|гр|г)/);
  const gramSize = gramMatch ? parseInt(gramMatch[1]) : null;

  // 75, 80, 85, 86gr - 4000 dona
  if ([75, 80, 85, 86].includes(gramSize || 0)) {
    return 4000;
  }

  // 135gr - 2500 dona
  if (gramSize === 135) {
    return 2500;
  }

  // Krishka - 2000 dona/qop
  if (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap')) {
    return 2000;
  }

  // Ruchka - 1000 dona/qop
  if (name.includes('ruchka') || name.includes('handle')) {
    return 1000;
  }

  return null;
};

// Get piece price for komplekt mode
export const getPiecePrice = (productName: string): number | null => {
  const name = productName?.toLowerCase() || '';

  // 48 krishka
  const has48 = /\b48\b/.test(name);
  const hasKrishka = name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка');

  if (has48 && hasKrishka) {
    return 0.012;
  }

  // 38 ruchka
  if (/\b38\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.010;
  }

  // 48 ruchka
  if (/\b48\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.16;
  }

  // 28 ruchka
  if (/\b28\b/.test(name) && (name.includes('ruchka') || name.includes('handle') || name.includes('ручка') || name.includes('Ручка'))) {
    return 0.010;
  }

  // 28 krishka bezgaz
  if (/\b28\b/.test(name) && (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка'))) {
    if (name.includes('gaz') || name.includes('газ')) {
      return 0.008; // gazlik
    }
    if (name.includes('dkm') || name.includes('DKM')) {
      return 0.012; // dkm
    }
    if (name.includes('okm') || name.includes('OKM') || name.includes('Okm')) {
      return 0.007; // okm
    }
    return 0.007; // bezgaz
  }

  // 38 krishka
  if (/\b38\b/.test(name) && (name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('кришка') || name.includes('Кришка'))) {
    return 0.015;
  }

  return null;
};

// Determine target products for komplekt mode
export const getKomplektTargets = (preformName: string): { krishkaGram: number | null; ruchkaGram: number | null; needsRuchka: boolean } => {
  const name = preformName?.toLowerCase() || '';
  // Gram match - gr/g/гр/г bilan yoki ularsiz
  const gramMatch = preformName?.match(/(\d+)\s*(gr|g|гр|г)?\b/i);
  const gramSize = gramMatch ? parseInt(gramMatch[1]) : null;

  // Kapsula uchun - 28 krishka (faqat krishka)
  if (name.includes('kapsula') || name.includes('capsule') || name.includes('капсула')) {
    return { krishkaGram: 28, ruchkaGram: null, needsRuchka: false };
  }

  if ([15, 21, 26, 30].includes(gramSize || 0)) {
    return { krishkaGram: 28, ruchkaGram: null, needsRuchka: false };
  }

  if (gramSize === 36) {
    return { krishkaGram: 28, ruchkaGram: 28, needsRuchka: true };
  }

  if ([52, 70].includes(gramSize || 0)) {
    return { krishkaGram: 38, ruchkaGram: 38, needsRuchka: true };
  }

  if ([75, 80, 85, 86, 135].includes(gramSize || 0)) {
    return { krishkaGram: 48, ruchkaGram: 48, needsRuchka: true };
  }

  return { krishkaGram: null, ruchkaGram: null, needsRuchka: false };
};

// Filter products by category
export const filterProductsByCategory = (
  products: Product[],
  category: 'all' | 'preform' | 'krishka' | 'ruchka' | 'other'
): Product[] => {
  if (category === 'all') return products;

  return products.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';

    switch (category) {
      case 'preform':
        return warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/.test(name);
      case 'krishka':
        return warehouse === 'krishka' || name.includes('krishka') || name.includes('qopqoq') || name.includes('cap') || name.includes('крышка');
      case 'ruchka':
        return warehouse === 'ruchka' || name.includes('ruchka') || name.includes('handle') || name.includes('ручка');
      case 'other':
        return !['preform', 'krishka', 'ruchka'].includes(warehouse) &&
               !name.includes('preform') && !/\d+\s*(gr|g|гр|г)/.test(name) &&
               !name.includes('krishka') && !name.includes('qopqoq') && !name.includes('cap') &&
               !name.includes('ruchka') && !name.includes('handle');
      default:
        return true;
    }
  });
};

// Group preforms by gram size
export const groupPreformsByGram = (products: Product[]) => {
  const allPreforms = products.filter((p) => {
    const name = p.name?.toLowerCase() || '';
    const warehouse = p.warehouse?.toLowerCase() || '';
    return warehouse === 'preform' || name.includes('preform') || /\d+\s*(gr|g|гр|г)/.test(name);
  });

  const gramSizes = [15, 21, 28, 32, 38, 43, 48];
  const groups: Record<string, Product[]> = {};

  gramSizes.forEach((gram) => {
    groups[`preform${gram}`] = allPreforms.filter((p) => {
      const name = p.name?.toLowerCase() || '';
      return name.includes(gram.toString()) || name.includes(`${gram}gr`) || name.includes(`${gram}g`);
    });
  });

  groups['preformBoshqa'] = allPreforms.filter((p) => {
    return !gramSizes.some((gram) => {
      const name = p.name?.toLowerCase() || '';
      return name.includes(gram.toString()) || name.includes(`${gram}gr`) || name.includes(`${gram}g`);
    });
  });

  return { allPreforms, groups };
};

// Validate sale form
export const validateSaleForm = (items: SaleItemForm[], customerId: string, manualCustomerName: string, isKocha?: boolean): string | null => {
  if (items.length === 0) {
    return 'Kamida bitta mahsulot qoshish kerak';
  }

  if (!isKocha && !customerId && !manualCustomerName) {
    return 'Mijoz tanlash yoki yangi mijoz qoshish kerak';
  }

  return null;
};
