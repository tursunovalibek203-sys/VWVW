import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ProductData {
  name: string;
  bagType: string;
  warehouse: string;
  unitsPerBag: number;
  pricePerPiece: number;
  pricePerBag: number;
  currentStock: number;
  currentUnits: number;
  minStockLimit: number;
  optimalStock: number;
  maxCapacity: number;
}

const products: ProductData[] = [
  // ==================== КАПСУЛА 15 гр ====================
  { name: 'Капсула 15 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 18, currentUnits: 18 * 20000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 15 гр гидро', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 1, currentUnits: 1 * 20000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 15 гр синий', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 19, currentUnits: 19 * 20000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 15 гр sprite', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 17, currentUnits: 17 * 20000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 15 гр қизил', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 15 гр кора', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 20000, pricePerPiece: 0.285, pricePerBag: 570, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 21 гр ====================
  { name: 'Капсула 21 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 4, currentUnits: 4 * 15000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр гидро', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 15, currentUnits: 15 * 15000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр гд Октош', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр синий', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 11, currentUnits: 11 * 15000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр sprite', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 1, currentUnits: 1 * 15000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр ёд', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 21 гр ок', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 15000, pricePerPiece: 0.04, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 26 гр-ёг ====================
  { name: 'Капсула 26 гр ёг', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 12000, pricePerPiece: 0.0494, pricePerBag: 593, currentStock: 22, currentUnits: 22 * 12000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 30 гр ====================
  { name: 'Капсула 30 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.057, pricePerBag: 570, currentStock: 18, currentUnits: 18 * 10000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 30 гр гидро', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.057, pricePerBag: 570, currentStock: 22, currentUnits: 22 * 10000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 30 гр гд Октош', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.057, pricePerBag: 570, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 30 гр sprite', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.057, pricePerBag: 570, currentStock: 3, currentUnits: 3 * 10000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 30 гр синий', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.057, pricePerBag: 570, currentStock: 17, currentUnits: 17 * 10000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 36 гр-ёг ====================
  { name: 'Капсула 36 гр ёг', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 10000, pricePerPiece: 0.0685, pricePerBag: 685, currentStock: 30, currentUnits: 30 * 10000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 52 гр ====================
  { name: 'Капсула 52 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 6000, pricePerPiece: 0.0988, pricePerBag: 593, currentStock: 14, currentUnits: 14 * 6000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 52 гр ок', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 6000, pricePerPiece: 0.0988, pricePerBag: 593, currentStock: 7, currentUnits: 7 * 6000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 70 гр ====================
  { name: 'Капсула 70 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4500, pricePerPiece: 0.133, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 70 гр гидро', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4500, pricePerPiece: 0.133, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 70 гр сайхун', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4500, pricePerPiece: 0.133, pricePerBag: 600, currentStock: 1, currentUnits: 1 * 4500, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 70 гр синий', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4500, pricePerPiece: 0.133, pricePerBag: 600, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 75 гр ====================
  { name: 'Капсула 75 гр праэрач', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.1425, pricePerBag: 570, currentStock: 18, currentUnits: 18 * 4000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 75 гр сайхун', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.1425, pricePerBag: 570, currentStock: 2, currentUnits: 2 * 4000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 75 гр гидро 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.1425, pricePerBag: 570, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 75 гр гидро 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.1425, pricePerBag: 427.5, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 75 гр синий 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.1425, pricePerBag: 570, currentStock: 29, currentUnits: 29 * 4000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 75 гр синий 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.1425, pricePerBag: 427.5, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 80 гр ====================
  { name: 'Капсула 80 гр праэрач 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.152, pricePerBag: 608, currentStock: 47, currentUnits: 47 * 4000, minStockLimit: 5, optimalStock: 30, maxCapacity: 150 },
  { name: 'Капсула 80 гр праэрач 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.152, pricePerBag: 456, currentStock: 3, currentUnits: 3 * 3000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр гидро 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.152, pricePerBag: 608, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр гидро 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.152, pricePerBag: 456, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр сайхун 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.152, pricePerBag: 608, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр сайхун 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.152, pricePerBag: 456, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр синий 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.152, pricePerBag: 608, currentStock: 1, currentUnits: 1 * 4000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 80 гр синий 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.152, pricePerBag: 456, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 85 гр ====================
  { name: 'Капсула 85 гр праэрач 3000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.1615, pricePerBag: 484.5, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 85 гр праэрач 4000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 4000, pricePerPiece: 0.1615, pricePerBag: 646, currentStock: 2, currentUnits: 2 * 4000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 86 гр ====================
  { name: 'Капсула 86 гр праэрач А', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.1634, pricePerBag: 490.2, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Капсула 86 гр праэрач Б', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 3000, pricePerPiece: 0.1634, pricePerBag: 490.2, currentStock: 1, currentUnits: 1 * 3000, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КАПСУЛА 135 гр ====================
  { name: 'Капсула 135 гр праэрач 2500', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2500, pricePerPiece: 0.2565, pricePerBag: 641.25, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр праэрач 2000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2000, pricePerPiece: 0.2565, pricePerBag: 513, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр гидро 2500', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2500, pricePerPiece: 0.2565, pricePerBag: 641.25, currentStock: 16, currentUnits: 16 * 2500, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр гидро 2000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2000, pricePerPiece: 0.2565, pricePerBag: 513, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр сайхун', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2500, pricePerPiece: 0.2565, pricePerBag: 641.25, currentStock: 1, currentUnits: 1 * 2500, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр сайхун +', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2500, pricePerPiece: 0.2565, pricePerBag: 641.25, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр синий 2500', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2500, pricePerPiece: 0.2565, pricePerBag: 641.25, currentStock: 29, currentUnits: 29 * 2500, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },
  { name: 'Капсула 135 гр синий 2000', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2000, pricePerPiece: 0.2565, pricePerBag: 513, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 15, maxCapacity: 80 },

  // ==================== КАПСУЛА 250 гр ====================
  { name: 'Капсула 250 гр нестле', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2000, pricePerPiece: 0, pricePerBag: 0, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 10, maxCapacity: 50 },
  { name: 'Капсула 250 гр синий', bagType: 'KAPSULA', warehouse: 'kapsula', unitsPerBag: 2000, pricePerPiece: 0, pricePerBag: 0, currentStock: 0, currentUnits: 0, minStockLimit: 3, optimalStock: 10, maxCapacity: 50 },

  // ==================== КРИШКА 28мм — Оддий ====================
  { name: 'Кришка 28 кук газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 галубой газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 сарик газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 яшил газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 қизил газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 ок', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 кора газ', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.007, pricePerBag: 42, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },

  // ==================== КРИШКА 28мм — ДКМ ====================
  { name: 'Кришка 28 ДКМ сарик', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 4000, pricePerPiece: 0.013, pricePerBag: 52, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 ДКМ кук 10000', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 10000, pricePerPiece: 0.013, pricePerBag: 130, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 ДКМ кук 6000', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 6000, pricePerPiece: 0.013, pricePerBag: 78, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 28 ДКМ яшил', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 4000, pricePerPiece: 0.013, pricePerBag: 52, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },

  // ==================== Ручка 28мм — Морс ====================
  { name: 'Ручка 28 сарик 1500', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1500, pricePerPiece: 0.009, pricePerBag: 13.5, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Ручка 28 сарик 2500', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2500, pricePerPiece: 0.009, pricePerBag: 22.5, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },

  // ==================== КРИШКА 38мм — Оддий ====================
  { name: 'Кришка 38 кук', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 88, currentUnits: 88 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Кришка 38 галубой', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 38 сарик', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 90, currentUnits: 90 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Кришка 38 яшил', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 9, currentUnits: 9 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 38 сайхун', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 34, currentUnits: 34 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 38 қизил', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 50, currentUnits: 50 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 38 ок', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 3000, pricePerPiece: 0.010, pricePerBag: 30, currentStock: 40, currentUnits: 40 * 3000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },

  // ==================== Ручка 38мм — Оддий ====================
  { name: 'Ручка 38 кук', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 167, currentUnits: 167 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 400 },
  { name: 'Ручка 38 галубой', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 38 сарик', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 44, currentUnits: 44 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 38 яшил', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 23, currentUnits: 23 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 38 сайхун', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 30, currentUnits: 30 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 38 қизил', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 25, currentUnits: 25 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 38 ок', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 2000, pricePerPiece: 0.015, pricePerBag: 30, currentStock: 35, currentUnits: 35 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },

  // ==================== КРИШКА 48мм — Оддий ====================
  { name: 'Кришка 48 кук', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 70, currentUnits: 70 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Кришка 48 галубой', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 8, currentUnits: 8 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 сарик', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 75, currentUnits: 75 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Кришка 48 Доня', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 44, currentUnits: 44 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 Бекажон', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 яшил', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 89, currentUnits: 89 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Кришка 48 апелсин', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 144, currentUnits: 144 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 400 },
  { name: 'Кришка 48 қизил', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 38, currentUnits: 38 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 сайхун', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 0, currentUnits: 0, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 салат', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 5, currentUnits: 5 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Кришка 48 ок', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 2000, pricePerPiece: 0.018, pricePerBag: 36, currentStock: 86, currentUnits: 86 * 2000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },

  // ==================== Ручка 48мм — Оддий ====================
  { name: 'Ручка 48 кук', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 22, currentUnits: 22 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 48 галубой', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 24, currentUnits: 24 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 48 сарик', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 91, currentUnits: 91 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Ручка 48 апелсин', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: -1, currentUnits: -1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 48 яшил', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 98, currentUnits: 98 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },
  { name: 'Ручка 48 сайхун', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 13, currentUnits: 13 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 48 қизил', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 50, currentUnits: 50 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 200 },
  { name: 'Ручка 48 ок', bagType: 'RUCHKA', warehouse: 'ruchka', unitsPerBag: 1000, pricePerPiece: 0.012, pricePerBag: 12, currentStock: 116, currentUnits: 116 * 1000, minStockLimit: 10, optimalStock: 50, maxCapacity: 300 },

  // ==================== КРИШКА 55мм ====================
  { name: 'Кришка 55 кук', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 1000, pricePerPiece: 0, pricePerBag: 0, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
  { name: 'Кришка 55 ок', bagType: 'KRISHKA', warehouse: 'krishka', unitsPerBag: 1000, pricePerPiece: 0, pricePerBag: 0, currentStock: 0, currentUnits: 0, minStockLimit: 5, optimalStock: 20, maxCapacity: 100 },
];

async function main() {
  console.log(`Jami ${products.length} ta mahsulot qo'shilmoqda...`);

  let added = 0;
  let skipped = 0;

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { name: p.name } });
    if (existing) {
      console.log(`  ⏭  Mavjud: ${p.name}`);
      skipped++;
      continue;
    }

    await prisma.product.create({
      data: {
        name: p.name,
        bagType: p.bagType,
        warehouse: p.warehouse,
        unitsPerBag: p.unitsPerBag,
        pricePerPiece: p.pricePerPiece,
        pricePerBag: p.pricePerBag,
        currentStock: p.currentStock,
        currentUnits: p.currentUnits,
        minStockLimit: p.minStockLimit,
        optimalStock: p.optimalStock,
        maxCapacity: p.maxCapacity,
        active: true,
      },
    });
    console.log(`  ✅ Qo'shildi: ${p.name} (${p.currentStock} qop)`);
    added++;
  }

  console.log(`\nNatija: ${added} ta yangi, ${skipped} ta o'tkazib yuborildi.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
