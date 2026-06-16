// Professional Point of Sale (POS) System for Cashier
import { trData } from './transliterator';

// Payment Methods
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  MOBILE = 'mobile',
  BANK_TRANSFER = 'bank_transfer',
  CREDIT = 'credit',
  MIXED = 'mixed',
}

// Transaction Status
export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIAL_REFUND = 'partial_refund',
}

// Receipt Types
export enum ReceiptType {
  SALE = 'sale',
  REFUND = 'refund',
  EXCHANGE = 'exchange',
  RETURN = 'return',
  DEPOSIT = 'deposit',
}

// Cash Shift Status
export enum ShiftStatus {
  OPEN = 'open',
  CLOSED = 'closed',
  IN_PROGRESS = 'in_progress',
}

// POS Configuration
export interface POSConfig {
  cashierId: string;
  cashierName: string;
  storeId: string;
  storeName: string;
  registerId: string;
  registerName: string;
  shiftId?: string;
  currency: string;
  locale: string;
  taxRate: number;
  enableDiscounts: boolean;
  enableTips: boolean;
  enableLoyalty: boolean;
  enableInventory: boolean;
  maxRefundDays: number;
  receiptTemplate: string;
  printerSettings: {
    enabled: boolean;
    autoPrint: boolean;
    copies: number;
    paperSize: '58mm' | '80mm';
  };
  paymentSettings: {
    acceptedMethods: PaymentMethod[];
    requireConfirmation: boolean;
    enableSplitPayment: boolean;
    maxCashAmount: number;
  };
}

// Cart Item
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number;
  discountType: 'percentage' | 'fixed';
  tax: number;
  taxRate: number;
  category: string;
  warehouse: string;
  weight?: number;
  notes?: string;
  addedAt: Date;
}

// Payment Detail
export interface PaymentDetail {
  id: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  exchangeRate?: number;
  cardLast4?: string;
  transactionId?: string;
  approvedAt: Date;
  status: 'approved' | 'declined' | 'pending';
  error?: string;
}

// Transaction
export interface Transaction {
  id: string;
  type: ReceiptType;
  status: TransactionStatus;
  cashierId: string;
  cashierName: string;
  customerId?: string;
  customerName?: string;
  registerId: string;
  registerName: string;
  shiftId?: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paid: number;
  change: number;
  payments: PaymentDetail[];
  createdAt: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  refundedAt?: Date;
  notes?: string;
  metadata: {
    source: 'pos' | 'online' | 'mobile';
    device?: string;
    location?: string;
  };
}

// Cash Shift
export interface CashShift {
  id: string;
  cashierId: string;
  cashierName: string;
  registerId: string;
  registerName: string;
  status: ShiftStatus;
  openingBalance: number;
  closingBalance?: number;
  expectedCash: number;
  actualCash?: number;
  variance?: number;
  openingTime: Date;
  closingTime?: Date;
  transactions: Transaction[];
  summary: {
    totalSales: number;
    totalRefunds: number;
    totalCash: number;
    totalCard: number;
    totalMobile: number;
    transactionCount: number;
    averageSale: number;
  };
  notes?: string;
}

// Inventory Check
export interface InventoryCheck {
  productId: string;
  productName: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  warehouse: string;
  lastUpdated: Date;
  lowStockThreshold: number;
  outOfStock: boolean;
}

// Customer Loyalty
export interface CustomerLoyalty {
  customerId: string;
  customerName: string;
  phone?: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  visitCount: number;
  lastVisit: Date;
  rewards: Array<{
    id: string;
    type: 'discount' | 'free_item' | 'points';
    value: number;
    description: string;
    expiresAt?: Date;
    used: boolean;
  }>;
}

// Professional POS Manager
export class ProfessionalPOSManager {
  private static instance: ProfessionalPOSManager;
  private config: POSConfig;
  private cart: CartItem[] = [];
  private currentShift: CashShift | null = null;
  private transactions: Transaction[] = [];
  private inventory: Map<string, InventoryCheck> = new Map();
  private customers: Map<string, CustomerLoyalty> = new Map();
  private isSessionActive = false;

  constructor(config: POSConfig) {
    this.config = config;
    this.initializeInventory();
    this.loadCustomers();
  }

  static getInstance(config?: POSConfig): ProfessionalPOSManager {
    if (!ProfessionalPOSManager.instance) {
      if (!config) {
        throw new Error('POS config required for first initialization');
      }
      ProfessionalPOSManager.instance = new ProfessionalPOSManager(config);
    }
    return ProfessionalPOSManager.instance;
  }

  // Initialize POS session
  async startSession(): Promise<void> {
    if (this.isSessionActive) {
      throw new Error('POS session already active');
    }

    // Start new shift if no active shift
    if (!this.currentShift || this.currentShift.status === ShiftStatus.CLOSED) {
      await this.startShift();
    }

    this.isSessionActive = true;
    this.cart = [];
    console.log(`POS session started for ${this.config.cashierName}`);
  }

  // End POS session
  async endSession(): Promise<void> {
    if (!this.isSessionActive) {
      throw new Error('No active POS session');
    }

    // Clear cart
    this.cart = [];
    this.isSessionActive = false;
    console.log(`POS session ended for ${this.config.cashierName}`);
  }

  // Start cash shift
  async startShift(openingBalance: number = 0): Promise<CashShift> {
    if (this.currentShift && this.currentShift.status === ShiftStatus.IN_PROGRESS) {
      throw new Error('Shift already in progress');
    }

    const shift: CashShift = {
      id: `shift_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      cashierId: this.config.cashierId,
      cashierName: this.config.cashierName,
      registerId: this.config.registerId,
      registerName: this.config.registerName,
      status: ShiftStatus.IN_PROGRESS,
      openingBalance,
      expectedCash: openingBalance,
      openingTime: new Date(),
      transactions: [],
      summary: {
        totalSales: 0,
        totalRefunds: 0,
        totalCash: 0,
        totalCard: 0,
        totalMobile: 0,
        transactionCount: 0,
        averageSale: 0,
      },
    };

    this.currentShift = shift;
    console.log(`Shift started with opening balance: ${openingBalance}`);
    return shift;
  }

  // End cash shift
  async endShift(closingBalance: number, notes?: string): Promise<CashShift> {
    if (!this.currentShift || this.currentShift.status !== ShiftStatus.IN_PROGRESS) {
      throw new Error('No active shift to close');
    }

    const actualCash = closingBalance;
    const expectedCash = this.currentShift.openingBalance + this.currentShift.summary.totalCash;
    const variance = actualCash - expectedCash;

    this.currentShift.status = ShiftStatus.CLOSED;
    this.currentShift.closingBalance = closingBalance;
    this.currentShift.actualCash = actualCash;
    this.currentShift.expectedCash = expectedCash;
    this.currentShift.variance = variance;
    this.currentShift.closingTime = new Date();
    this.currentShift.notes = notes;

    console.log(`Shift closed. Variance: ${variance}`);
    return this.currentShift;
  }

  // Add item to cart
  addToCart(product: {
    id: string;
    name: string;
    code: string;
    price: number;
    category: string;
    warehouse: string;
    quantity?: number;
    weight?: number;
    notes?: string;
  }, quantity: number = 1): CartItem {
    // Check inventory
    const inventoryItem = this.inventory.get(product.id);
    if (!inventoryItem || inventoryItem.availableStock < quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    // Check if item already in cart
    const existingItemIndex = this.cart.findIndex(item => item.productId === product.id);
    
    if (existingItemIndex >= 0) {
      // Update existing item
      const existingItem = this.cart[existingItemIndex];
      const newQuantity = existingItem.quantity + quantity;
      
      if (inventoryItem.availableStock < newQuantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      
      existingItem.quantity = newQuantity;
      existingItem.totalPrice = existingItem.unitPrice * newQuantity;
      existingItem.tax = existingItem.totalPrice * this.config.taxRate;
      existingItem.addedAt = new Date();
      
      return existingItem;
    } else {
      // Add new item
      const unitPrice = product.price;
      const totalPrice = unitPrice * quantity;
      const tax = totalPrice * this.config.taxRate;

      const cartItem: CartItem = {
        id: `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        productId: product.id,
        productName: product.name,
        productCode: product.code,
        quantity,
        unitPrice,
        totalPrice,
        discount: 0,
        discountType: 'percentage',
        tax,
        taxRate: this.config.taxRate,
        category: product.category,
        warehouse: product.warehouse,
        weight: product.weight,
        notes: product.notes,
        addedAt: new Date(),
      };

      this.cart.push(cartItem);
      return cartItem;
    }
  }

  // Update cart item
  updateCartItem(itemId: string, updates: {
    quantity?: number;
    discount?: number;
    discountType?: 'percentage' | 'fixed';
    notes?: string;
  }): CartItem {
    const itemIndex = this.cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    const item = this.cart[itemIndex];
    
    // Update quantity
    if (updates.quantity !== undefined) {
      const inventoryItem = this.inventory.get(item.productId);
      if (!inventoryItem || inventoryItem.availableStock < updates.quantity) {
        throw new Error(`Insufficient stock for ${item.productName}`);
      }
      
      item.quantity = updates.quantity;
      item.totalPrice = item.unitPrice * item.quantity;
    }

    // Update discount
    if (updates.discount !== undefined) {
      item.discount = updates.discount;
      item.discountType = updates.discountType || 'percentage';
    }

    // Update notes
    if (updates.notes !== undefined) {
      item.notes = updates.notes;
    }

    // Recalculate tax
    const discountedPrice = item.totalPrice - (item.discountType === 'percentage' 
      ? item.totalPrice * (item.discount / 100) 
      : item.discount);
    item.tax = discountedPrice * item.taxRate;

    return item;
  }

  // Remove item from cart
  removeFromCart(itemId: string): void {
    const itemIndex = this.cart.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
      throw new Error('Item not found in cart');
    }

    this.cart.splice(itemIndex, 1);
  }

  // Clear cart
  clearCart(): void {
    this.cart = [];
  }

  // Get cart summary
  getCartSummary(): {
    items: CartItem[];
    itemCount: number;
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
  } {
    const itemCount = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = this.cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const discount = this.cart.reduce((sum, item) => {
      return sum + (item.discountType === 'percentage' 
        ? item.totalPrice * (item.discount / 100) 
        : item.discount);
    }, 0);
    const tax = this.cart.reduce((sum, item) => sum + item.tax, 0);
    const total = subtotal - discount + tax;

    return {
      items: this.cart,
      itemCount,
      subtotal,
      discount,
      tax,
      total,
    };
  }

  // Process payment
  async processPayment(payments: Array<{
    method: PaymentMethod;
    amount: number;
    cardLast4?: string;
    transactionId?: string;
  }>): Promise<Transaction> {
    const summary = this.getCartSummary();
    const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

    if (Math.abs(totalPaid - summary.total) > 0.01) {
      throw new Error('Payment amount does not match total');
    }

    if (this.cart.length === 0) {
      throw new Error('Cart is empty');
    }

    // Create payment details
    const paymentDetails: PaymentDetail[] = payments.map(payment => ({
      id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      method: payment.method,
      amount: payment.amount,
      currency: this.config.currency,
      cardLast4: payment.cardLast4,
      transactionId: payment.transactionId,
      approvedAt: new Date(),
      status: 'approved',
    }));

    // Create transaction
    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: ReceiptType.SALE,
      status: TransactionStatus.COMPLETED,
      cashierId: this.config.cashierId,
      cashierName: this.config.cashierName,
      registerId: this.config.registerId,
      registerName: this.config.registerName,
      shiftId: this.currentShift?.id,
      items: [...this.cart],
      subtotal: summary.subtotal,
      discount: summary.discount,
      tax: summary.tax,
      total: summary.total,
      paid: totalPaid,
      change: 0,
      payments: paymentDetails,
      createdAt: new Date(),
      completedAt: new Date(),
      metadata: {
        source: 'pos',
        device: 'cash_register',
        location: this.config.storeName,
      },
    };

    // Update inventory
    await this.updateInventory(this.cart);

    // Add to transactions
    this.transactions.push(transaction);

    // Update shift summary
    if (this.currentShift) {
      this.currentShift.transactions.push(transaction);
      this.updateShiftSummary();
    }

    // Clear cart
    this.clearCart();

    console.log(`Payment processed: ${summary.total} ${this.config.currency}`);
    return transaction;
  }

  // Process refund
  async processRefund(transactionId: string, items: Array<{
    productId: string;
    quantity: number;
    reason: string;
  }>, refundMethod: PaymentMethod): Promise<Transaction> {
    const originalTransaction = this.transactions.find(t => t.id === transactionId);
    if (!originalTransaction) {
      throw new Error('Original transaction not found');
    }

    if (originalTransaction.status !== TransactionStatus.COMPLETED) {
      throw new Error('Cannot refund non-completed transaction');
    }

    // Check refund date limit
    const refundDays = this.config.maxRefundDays;
    const daysSinceTransaction = Math.floor(
      (Date.now() - originalTransaction.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceTransaction > refundDays) {
      throw new Error(`Refund not allowed after ${refundDays} days`);
    }

    // Calculate refund amount
    let refundAmount = 0;
    const refundItems: CartItem[] = [];

    for (const refundItem of items) {
      const originalItem = originalTransaction.items.find(item => item.productId === refundItem.productId);
      if (!originalItem) {
        throw new Error(`Item ${refundItem.productId} not found in original transaction`);
      }

      if (refundItem.quantity > originalItem.quantity) {
        throw new Error(`Refund quantity exceeds original quantity for ${originalItem.productName}`);
      }

      const itemRefundAmount = (originalItem.unitPrice * refundItem.quantity) * 
        (1 - this.config.taxRate);
      refundAmount += itemRefundAmount;

      refundItems.push({
        ...originalItem,
        quantity: -refundItem.quantity,
        totalPrice: -itemRefundAmount,
        notes: refundItem.reason,
      });
    }

    // Create refund transaction
    const refundTransaction: Transaction = {
      id: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: ReceiptType.REFUND,
      status: TransactionStatus.REFUNDED,
      cashierId: this.config.cashierId,
      cashierName: this.config.cashierName,
      registerId: this.config.registerId,
      registerName: this.config.registerName,
      shiftId: this.currentShift?.id,
      items: refundItems,
      subtotal: -refundAmount,
      discount: 0,
      tax: 0,
      total: -refundAmount,
      paid: -refundAmount,
      change: 0,
      payments: [{
        id: `payment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        method: refundMethod,
        amount: -refundAmount,
        currency: this.config.currency,
        approvedAt: new Date(),
        status: 'approved',
      }],
      createdAt: new Date(),
      refundedAt: new Date(),
      notes: `Refund for transaction ${transactionId}`,
      metadata: {
        source: 'pos',
        originalTransactionId: transactionId,
      },
    };

    // Update inventory (return items)
    await this.updateInventory(refundItems, true);

    // Add to transactions
    this.transactions.push(refundTransaction);

    // Update shift summary
    if (this.currentShift) {
      this.currentShift.transactions.push(refundTransaction);
      this.updateShiftSummary();
    }

    console.log(`Refund processed: ${refundAmount} ${this.config.currency}`);
    return refundTransaction;
  }

  // Update inventory
  private async updateInventory(items: CartItem[], isRefund: boolean = false): Promise<void> {
    for (const item of items) {
      const inventoryItem = this.inventory.get(item.productId);
      if (!inventoryItem) continue;

      const quantityChange = isRefund ? -item.quantity : -item.quantity;
      inventoryItem.currentStock += quantityChange;
      inventoryItem.availableStock = inventoryItem.currentStock - inventoryItem.reservedStock;
      inventoryItem.lastUpdated = new Date();
      inventoryItem.outOfStock = inventoryItem.availableStock <= 0;

      this.inventory.set(item.productId, inventoryItem);
    }
  }

  // Update shift summary
  private updateShiftSummary(): void {
    if (!this.currentShift) return;

    const shift = this.currentShift;
    const transactions = shift.transactions;

    shift.summary.totalSales = transactions
      .filter(t => t.type === ReceiptType.SALE)
      .reduce((sum, t) => sum + t.total, 0);

    shift.summary.totalRefunds = Math.abs(transactions
      .filter(t => t.type === ReceiptType.REFUND)
      .reduce((sum, t) => sum + t.total, 0));

    shift.summary.totalCash = transactions
      .reduce((sum, t) => sum + t.payments
        .filter(p => p.method === PaymentMethod.CASH)
        .reduce((paymentSum, p) => paymentSum + p.amount, 0), 0);

    shift.summary.totalCard = transactions
      .reduce((sum, t) => sum + t.payments
        .filter(p => p.method === PaymentMethod.CARD)
        .reduce((paymentSum, p) => paymentSum + p.amount, 0), 0);

    shift.summary.totalMobile = transactions
      .reduce((sum, t) => sum + t.payments
        .filter(p => p.method === PaymentMethod.MOBILE)
        .reduce((paymentSum, p) => paymentSum + p.amount, 0), 0);

    shift.summary.transactionCount = transactions.length;
    shift.summary.averageSale = shift.summary.transactionCount > 0 
      ? shift.summary.totalSales / shift.summary.transactionCount 
      : 0;
  }

  // Initialize inventory
  private initializeInventory(): void {
    // Simulate inventory data
    const mockInventory: InventoryCheck[] = [
      {
        productId: '1',
        productName: '15G PREFORMA',
        currentStock: 500,
        reservedStock: 50,
        availableStock: 450,
        warehouse: 'preform',
        lastUpdated: new Date(),
        lowStockThreshold: 100,
        outOfStock: false,
      },
      {
        productId: '2',
        productName: 'QOPQOQ 28MM',
        currentStock: 300,
        reservedStock: 30,
        availableStock: 270,
        warehouse: 'krishka',
        lastUpdated: new Date(),
        lowStockThreshold: 50,
        outOfStock: false,
      },
      {
        productId: '3',
        productName: 'KRISHKA 20MM',
        currentStock: 200,
        reservedStock: 20,
        availableStock: 180,
        warehouse: 'krishka',
        lastUpdated: new Date(),
        lowStockThreshold: 30,
        outOfStock: false,
      },
    ];

    mockInventory.forEach(item => {
      this.inventory.set(item.productId, item);
    });
  }

  // Load customers
  private loadCustomers(): void {
    // Simulate customer data
    const mockCustomers: CustomerLoyalty[] = [
      {
        customerId: '1',
        customerName: 'Ali Valiyev',
        phone: '+998901234567',
        points: 1500,
        tier: 'silver',
        totalSpent: 25000000,
        visitCount: 25,
        lastVisit: new Date(),
        rewards: [
          {
            id: 'reward1',
            type: 'discount',
            value: 10,
            description: '10% off next purchase',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            used: false,
          },
        ],
      },
      {
        customerId: '2',
        customerName: 'Bekzod Karimov',
        phone: '+998907654321',
        points: 800,
        tier: 'bronze',
        totalSpent: 12000000,
        visitCount: 12,
        lastVisit: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        rewards: [],
      },
    ];

    mockCustomers.forEach(customer => {
      this.customers.set(customer.customerId, customer);
    });
  }

  // Get current shift
  getCurrentShift(): CashShift | null {
    return this.currentShift;
  }

  // Get transactions
  getTransactions(limit?: number): Transaction[] {
    return limit 
      ? this.transactions.slice(-limit)
      : this.transactions;
  }

  // Get inventory
  getInventory(): InventoryCheck[] {
    return Array.from(this.inventory.values());
  }

  // Get customers
  getCustomers(): CustomerLoyalty[] {
    return Array.from(this.customers.values());
  }

  // Search products
  searchProducts(query: string): InventoryCheck[] {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.inventory.values()).filter(item => 
      item.productName.toLowerCase().includes(lowercaseQuery) ||
      item.productId.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Get low stock items
  getLowStockItems(): InventoryCheck[] {
    return Array.from(this.inventory.values()).filter(item => 
      item.availableStock <= item.lowStockThreshold
    );
  }

  // Get sales summary
  getSalesSummary(startDate?: Date, endDate?: Date): {
    totalSales: number;
    totalTransactions: number;
    averageSale: number;
    topProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      revenue: number;
    }>;
    paymentMethods: Record<PaymentMethod, number>;
  } {
    let filteredTransactions = this.transactions;

    if (startDate || endDate) {
      filteredTransactions = this.transactions.filter(t => {
        const transactionDate = new Date(t.createdAt);
        if (startDate && transactionDate < startDate) return false;
        if (endDate && transactionDate > endDate) return false;
        return true;
      });
    }

    const salesTransactions = filteredTransactions.filter(t => t.type === ReceiptType.SALE);
    const totalSales = salesTransactions.reduce((sum, t) => sum + t.total, 0);
    const totalTransactions = salesTransactions.length;
    const averageSale = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    // Calculate top products
    const productSales = new Map<string, { quantity: number; revenue: number; name: string }>();
    
    salesTransactions.forEach(transaction => {
      transaction.items.forEach(item => {
        const existing = productSales.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += item.totalPrice;
        } else {
          productSales.set(item.productId, {
            quantity: item.quantity,
            revenue: item.totalPrice,
            name: item.productName,
          });
        }
      });
    });

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        quantity: data.quantity,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Calculate payment methods
    const paymentMethods: Record<PaymentMethod, number> = {} as any;
    
    salesTransactions.forEach(transaction => {
      transaction.payments.forEach(payment => {
        paymentMethods[payment.method] = (paymentMethods[payment.method] || 0) + payment.amount;
      });
    });

    return {
      totalSales,
      totalTransactions,
      averageSale,
      topProducts,
      paymentMethods,
    };
  }

  // Generate receipt
  generateReceipt(transaction: Transaction): string {
    const receiptLines = [
      `${this.config.storeName}`,
      `${this.config.registerName}`,
      `Cashier: ${trData(transaction.cashierName)}`,
      `Date: ${transaction.createdAt.toLocaleDateString()}`,
      `Time: ${transaction.createdAt.toLocaleTimeString()}`,
      '',
      '--- ITEMS ---',
      '',
    ];

    transaction.items.forEach(item => {
      receiptLines.push(`${trData(item.productName)}`);
      receiptLines.push(`${item.quantity} x ${item.unitPrice.toLocaleString()} = ${item.totalPrice.toLocaleString()}`);
      if (item.discount > 0) {
        receiptLines.push(`Discount: ${item.discountType === 'percentage' ? `${item.discount}%` : item.discount.toLocaleString()}`);
      }
      receiptLines.push('');
    });

    receiptLines.push('--- SUMMARY ---');
    receiptLines.push(`Subtotal: ${transaction.subtotal.toLocaleString()}`);
    if (transaction.discount > 0) {
      receiptLines.push(`Discount: ${transaction.discount.toLocaleString()}`);
    }
    receiptLines.push(`Tax: ${transaction.tax.toLocaleString()}`);
    receiptLines.push(`Total: ${transaction.total.toLocaleString()}`);
    receiptLines.push(`Paid: ${transaction.paid.toLocaleString()}`);
    if (transaction.change > 0) {
      receiptLines.push(`Change: ${transaction.change.toLocaleString()}`);
    }
    receiptLines.push('');
    receiptLines.push('--- PAYMENTS ---');
    receiptLines.push('');

    transaction.payments.forEach(payment => {
      receiptLines.push(`${payment.method.toUpperCase()}: ${payment.amount.toLocaleString()}`);
    });

    receiptLines.push('');
    receiptLines.push('--- THANK YOU ---');
    receiptLines.push('Please come again!');

    return receiptLines.join('\n');
  }

  // Test POS system
  async testPOS(): Promise<{
    session: boolean;
    cart: boolean;
    payment: boolean;
    inventory: boolean;
  }> {
    console.log('Testing POS system...');
    
    const results = {
      session: false,
      cart: false,
      payment: false,
      inventory: false,
    };

    try {
      // Test session
      await this.startSession();
      results.session = true;
      
      // Test cart
      const item = this.addToCart({
        id: '1',
        name: '15G PREFORMA',
        code: 'PREFORMA-15G',
        price: 12500,
        category: 'preform',
        warehouse: 'preform',
      }, 2);
      results.cart = true;
      
      // Test payment
      const payment = await this.processPayment([{
        method: PaymentMethod.CASH,
        amount: this.getCartSummary().total,
      }]);
      results.payment = true;
      
      // Test inventory
      const inventory = this.getInventory();
      results.inventory = inventory.length > 0;
      
    } catch (error) {
      console.error('POS test failed:', error);
    }

    return results;
  }
}

// Create singleton instance
export const posSystem = ProfessionalPOSManager.getInstance;

// Convenience functions
export const startPOSSession = (config: POSConfig) => {
  const pos = ProfessionalPOSManager.getInstance(config);
  return pos.startSession();
};

export const addToCart = (product: any, quantity?: number) => {
  const pos = ProfessionalPOSManager.getInstance();
  return pos.addToCart(product, quantity);
};

export const processPayment = (payments: any[]) => {
  const pos = ProfessionalPOSManager.getInstance();
  return pos.processPayment(payments);
};

export default ProfessionalPOSManager;
