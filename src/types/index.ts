// Professional TypeScript interfaces for the ERP system

// User and Authentication
export interface User {
  id: string;
  name: string;
  email: string;
  login?: string;
  role: 'ADMIN' | 'SELLER' | 'WAREHOUSE_MANAGER' | 'ACCOUNTANT' | 'CASHIER' | 'MANAGER';
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Product Related
export interface Product {
  id: string;
  name: string;
  bagType?: string;
  warehouse?: 'preform' | 'krishka' | 'ruchka' | 'other';
  unitsPerBag: number;
  currentStock: number;
  currentUnits: number;
  minStockLimit: number;
  optimalStock: number;
  maxCapacity: number;
  pricePerBag: number;
  pricePerPiece: number;
  productionCost: number;
  isParent: boolean;
  productTypeId?: string;
  categoryId?: string;
  sizeId?: string;
  subType?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  // Relations
  variants?: ProductVariant[];
  batches?: Batch[];
  stockMovements?: StockMovement[];
  productType?: ProductType;
  category?: Category;
}

export interface ProductVariant {
  id: string;
  parentId: string;
  variantName: string;
  cardType?: string;
  currentStock: number;
  currentUnits: number;
  pricePerBag: number;
  pricePerPiece: number;
  active: boolean;
  parent?: Product;
  stockMovements?: StockMovement[];
  priceHistory?: PriceHistory[];
}

export interface ProductType {
  id: string;
  name: string;
  description?: string;
  defaultCard?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  products?: Product[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Batch {
  id: string;
  productId: string;
  quantity: number;
  productionDate: Date;
  shift?: string;
  responsiblePerson?: string;
  product?: Product;
  createdAt?: Date;
}

// Sales and Orders
export interface Sale {
  id: string;
  saleNumber?: string;
  customerId: string;
  productId?: string;
  quantity: number;
  price: number;
  totalAmount: number;
  total?: number;
  paid?: number;
  paidAmount?: number;
  debt?: number;
  debtAmount?: number;
  currency: 'UZS' | 'USD';
  paymentType: 'CASH' | 'CARD' | 'TRANSFER' | 'DEBT' | 'MIXED';
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  notes?: string;
  createdAt: Date;
  // Relations
  customer?: Customer;
  product?: Product;
  items?: SaleItem[];
  paymentDetails?: {
    uzs: number;
    usd: number;
    click: number;
  };
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  product?: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  status: 'PENDING' | 'CONFIRMED' | 'IN_PRODUCTION' | 'READY_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED' | 'READY' | 'SOLD';
  totalAmount: number;
  paidAmount?: number;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  requestedDate?: Date;
  notes?: string;
  createdAt: Date;
  // Relations
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
}

// Customer Related
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  telegramChatId?: string;
  telegramUsername?: string;
  debt: number;
  debtUSD?: number;
  debtUZS?: number;
  balance: number;
  balanceUSD?: number;
  balanceUZS?: number;
  creditLimit: number;
  category?: 'NORMAL' | 'VIP' | 'DEBTOR' | 'NEW' | string;
  lastPurchase?: Date;
  notificationsEnabled?: boolean;
  debtReminderDays?: number;
  paymentTermDays?: number;
  discountPercent?: number;
  pricePerBag?: number;
  productPrices?: string;
  active: boolean;
  createdAt: Date;
  updatedAt?: Date;
  // Relations
  sales?: Sale[];
  orders?: Order[];
  payments?: any[];
}

// Inventory and Stock
export interface StockMovement {
  id: string;
  productId: string;
  variantId?: string;
  type: 'ADD' | 'REMOVE' | 'ADJUST' | 'PRODUCTION' | 'SALE' | 'TRANSFER' | 'EDIT' | 'DELETE' | 'VIEW';
  quantity: number;
  units: number;
  reason?: string;
  notes?: string;
  userId?: string;
  userName?: string;
  previousStock: number;
  previousUnits: number;
  newStock: number;
  newUnits: number;
  createdAt: Date;
  product?: Product;
}

export interface PriceHistory {
  id: string;
  productId?: string;
  variantId?: string;
  oldPrice: number;
  newPrice: number;
  type: 'BAG' | 'PIECE';
  changedBy?: string;
  createdAt: Date;
}

// Card System
export interface Card {
  id: string;
  name: string;
  description?: string;
  price?: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  products?: CardProduct[];
}

export interface CardProduct {
  id: string;
  cardId: string;
  productId: string;
  quantity: number;
  active: boolean;
  createdAt?: Date;
  card?: Card;
  product?: Product;
}

// Tasks
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  createdBy?: string;
  dueDate?: Date;
  completedDate?: Date;
  createdAt: Date;
  updatedAt?: Date;
  // Relations
  assignee?: User;
  creator?: User;
}

// Expenses and Finance
export interface Expense {
  id: string;
  amount: number;
  category: string;
  description?: string;
  currency: 'UZS' | 'USD';
  date: Date;
  createdBy?: string;
  createdAt: Date;
}

// Audit and Logs
export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: User;
}

// Notifications
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  actionUrl?: string;
  createdAt: Date;
}

// Drivers and Logistics
export interface Driver {
  id: string;
  name: string;
  phone?: string;
  licenseNumber?: string;
  vehicleNumber?: string;
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  active: boolean;
  totalDeliveries: number;
  telegramChatId?: string;
  debtToCompany?: number;
  debtToCompanyUSD?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Delivery {
  id: string;
  orderId: string;
  driverId?: string;
  address: string;
  scheduledDate?: Date;
  deliveredDate?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED';
  notes?: string;
  createdAt?: Date;
}

// System Settings
export interface SystemSettings {
  [key: string]: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics Types
export interface StatisticsData {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  salesCount: number;
  customersCount: number;
  productsCount: number;
  revenueGrowth: number;
  profitGrowth: number;
  dailyTrends?: DailyTrend[];
  topProducts?: ProductStat[];
  topCustomers?: CustomerStat[];
}

export interface DailyTrend {
  date: string;
  revenue: number;
  profit: number;
  expenses: number;
}

export interface ProductStat {
  id: string;
  name: string;
  revenue: number;
  quantity: number;
  percentage: number;
}

export interface CustomerStat {
  id: string;
  name: string;
  totalSpent: number;
  purchases: number;
  debt: number;
}

// Sale Form Types - for AddSale page
export interface SaleItemForm {
  productId: string;
  productName: string;
  quantity: string | number;
  bagDisplayValue?: string;
  pricePerBag: number;
  pricePerPiece: number;
  priceDisplayValue?: string;
  unitsPerBag: number;
  subtotal: number;
  warehouse?: string;
  subType?: string;
  saleType: 'bag' | 'piece' | 'komplekt';
  komplektGroupId?: string;
  isKomplektMain?: boolean;
  // Komplekt qarz tizimi uchun
  komplektMode?: 'full' | 'actual'; // Faqat isKomplektMain=true itemlarda
  originalQuantity?: number; // Sub-itemlarda: to'liq set miqdori (qop)
  isDebtPayment?: boolean; // Bu item mijoz qarzini to'lash uchun
  productDebtId?: string;  // Qaysi qarz to'lanayotgani
}

export interface SaleFormData {
  customerId: string;
  customerName: string;
  items: SaleItemForm[];
  paidUZS: string;
  paidUSD: string;
  paidKARTA: string;
  paymentType: 'cash' | 'debt' | 'partial';
  currency: 'UZS' | 'USD';
  isKocha: boolean;
  manualCustomerName: string;
  manualCustomerPhone: string;
  // Haydovchi yetkazish
  driverId: string;
  driverCollectsAll: boolean;        // true = to'liq summa, false = aniq summa
  driverCollectsAmount: string;      // aniq summa (UZS)
  deliveryFee: string;               // yetkazib berish narxi (UZS)
  deliveryFeePaidBy: 'CUSTOMER' | 'COMPANY';
}

export interface NewItemForm {
  productId: string;
  productName: string;
  quantity: string;
  pricePerBag: string;
  priceDisplayValue: string;
  unitsPerBag: string;
  saleType: 'bag' | 'piece' | 'komplekt';
  maxQuantity?: number; // Ombordagi maksimal miqdor
  product?: Product; // To'liq mahsulot ma'lumotlari
}

export type ProductCategory = 'all' | 'preform' | 'krishka' | 'ruchka' | 'other';

export interface PaymentDetails {
  uzs: number;
  usd: number;
  click: number;
  karta: number;
}

export interface SaleData {
  customerId: string | null;
  customerName: string;
  customerPhone?: string;
  items: SaleItemForm[];
  paymentDetails: PaymentDetails;
  paymentType: string;
  currency: string;
  isKocha: boolean;
  total: number;
  paid: number;
  debt: number;
  exchangeRate: number;
  createdAt: Date;
  status: 'completed' | 'partial' | 'pending';
}
