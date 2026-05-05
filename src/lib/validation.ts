import { z } from 'zod';

// Common validation patterns
const phoneRegex = /^\+998[0-9]{9}$/;

// Customer validation schema
export const customerSchema = z.object({
  name: z.string()
    .min(2, 'Ism kamida 2 ta belgidan iborat bo\'lishi kerak')
    .max(100, 'Ism 100 ta belgidan oshmasligi kerak'),
  phone: z.string()
    .regex(phoneRegex, 'Telefon raqami +998 bilan boshlanib 9 ta raqamdan iborat bo\'lishi kerak'),
  email: z.string().email('Email formati noto\'g\'ri').optional().or(z.literal('')),
  address: z.string().max(200, 'Manzil 200 ta belgidan oshmasligi kerak').optional().or(z.literal('')),
  category: z.enum(['NORMAL', 'VIP', 'PROBLEMATIC', 'NEW'], {
    errorMap: () => ({ message: 'Kategoriya noto\'g\'ri tanlangan' })
  }),
  balanceUZS: z.number().optional(),
  balanceUSD: z.number().optional(),
  debtUZS: z.number().optional(),
  debtUSD: z.number().optional()
});

// Product validation schema
export const productSchema = z.object({
  name: z.string()
    .min(2, 'Mahsulot nomi kamida 2 ta belgidan iborat bo\'lishi kerak')
    .max(150, 'Mahsulot nomi 150 ta belgidan oshmasligi kerak'),
  pricePerBag: z.number()
    .min(1, 'Summa 1 dan katta bo\'lishi kerak')
    .max(10000000, 'Summa 10 milliondan oshmasligi kerak'),
  pricePerPiece: z.number()
    .min(0, 'Summa manfiy bo\'lmasligi kerak')
    .max(100000, 'Summa 100 mingdan oshmasligi kerak'),
  currentStock: z.number()
    .min(0, 'Qoldiq manfiy bo\'lmasligi kerak')
    .max(1000000, 'Qoldiq 1 milliondan oshmasligi kerak'),
  unitsPerBag: z.number()
    .min(1, 'Bir qopdagi donalar soni 1 dan katta bo\'lishi kerak')
    .max(10000, 'Bir qopdagi donalar soni 10 mingdan oshmasligi kerak'),
  warehouse: z.enum(['preform', 'krishka', 'ruchka', 'other'], {
    errorMap: () => ({ message: 'Ombor xonasi noto\'g\'ri tanlangan' })
  }),
  minStockLimit: z.number().min(0, 'Minimal qoldiq manfiy bo\'lmasligi kerak').optional(),
  optimalStock: z.number().min(0, 'Optimal qoldiq manfiy bo\'lmasligi kerak').optional(),
  active: z.boolean().default(true)
});

// Sale item validation schema
export const saleItemSchema = z.object({
  productId: z.string().min(1, 'Mahsulot tanlanmagan'),
  productName: z.string().min(1, 'Mahsulot nomi noto\'g\'ri'),
  quantity: z.number()
    .min(0.01, 'Miqdor 0.01 dan katta bo\'lishi kerak')
    .max(10000, 'Miqdor 10 mingdan oshmasligi kerak'),
  pricePerBag: z.number()
    .min(1, 'Narx 1 dan katta bo\'lishi kerak')
    .max(10000000, 'Narx 10 milliondan oshmasligi kerak'),
  pricePerPiece: z.number().min(0, 'Narx manfiy bo\'lmasligi kerak'),
  unitsPerBag: z.number().min(1, 'Bir qopdagi donalar soni 1 dan katta bo\'lishi kerak'),
  subtotal: z.number().min(0, 'Jami summa manfiy bo\'lmasligi kerak'),
  warehouse: z.string(),
  saleType: z.enum(['bag', 'piece', 'komplekt'])
});

// Sale validation schema
export const saleSchema = z.object({
  customerId: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  manualCustomerName: z.string().optional(),
  manualCustomerPhone: z.string().optional(),
  items: z.array(saleItemSchema)
    .min(1, 'Kamida bitta mahsulot qo\'shilishi kerak')
    .max(100, 'Mahsulotlar soni 100 dan oshmasligi kerak'),
  paymentDetails: z.object({
    uzs: z.number().min(0, 'UZS summasi manfiy bo\'lmasligi kerak'),
    usd: z.number().min(0, 'USD summasi manfiy bo\'lmasligi kerak'),
    click: z.number().min(0, 'Click summasi manfiy bo\'lmasligi kerak')
  }),
  paymentMethod: z.enum(['CASH', 'CARD', 'CLICK', 'MIXED']),
  currency: z.enum(['UZS', 'USD']),
  totalAmount: z.number().min(1, 'Jami summa 1 dan katta bo\'lishi kerak'),
  paidAmount: z.number().min(0, 'To\'langan summa manfiy bo\'lmasligi kerak'),
  debtAmount: z.number().min(0, 'Qarz summasi manfiy bo\'lmasligi kerak'),
  exchangeRate: z.number().min(1, 'Kurs 1 dan katta bo\'lishi kerak'),
  isKocha: z.boolean().default(false)
}).refine((data) => {
  // Either select existing customer OR provide manual customer info
  if (!data.customerId && (!data.manualCustomerName || data.manualCustomerName.trim().length < 2)) {
    return false;
  }
  return true;
}, {
  message: 'Mijoz tanlang yoki yangi mijoz ma\'lumotlarini kiriting',
  path: ['customerId']
}).refine((data) => {
  // Total paid amount should be enough for the sale
  return data.paidAmount >= 0;
}, {
  message: 'To\'langan summa noto\'g\'ri',
  path: ['paidAmount']
});

// Cashbox transaction validation schema
export const cashboxTransactionSchema = z.object({
  amount: z.number()
    .min(100, 'Summa kamida 100 bo\'lishi kerak')
    .max(100000000, 'Summa 100 milliondan oshmasligi kerak'),
  currency: z.enum(['UZS', 'USD']),
  paymentMethod: z.enum(['CASH', 'CARD', 'CLICK']),
  description: z.string()
    .min(3, 'Izoh kamida 3 ta belgidan iborat bo\'lishi kerak')
    .max(200, 'Izoh 200 ta belgidan oshmasligi kerak')
});

// Exchange transaction validation schema
export const exchangeTransactionSchema = z.object({
  fromCurrency: z.enum(['UZS', 'USD']),
  toCurrency: z.enum(['UZS', 'USD']),
  amount: z.number()
    .min(100, 'Summa kamida 100 bo\'lishi kerak')
    .max(100000000, 'Summa 100 milliondan oshmasligi kerak'),
  fromType: z.enum(['CASH', 'CARD', 'CLICK']),
  toType: z.enum(['CASH', 'CARD', 'CLICK']),
  exchangeRate: z.number()
    .min(1, 'Kurs 1 dan katta bo\'lishi kerak')
    .max(50000, 'Kurs 50 mingdan oshmasligi kerak'),
  description: z.string().max(200, 'Izoh 200 ta belgidan oshmasligi kerak').optional()
}).refine((data) => {
  return data.fromCurrency !== data.toCurrency;
}, {
  message: 'Valyutalar bir xil bo\'lmasligi kerak',
  path: ['toCurrency']
});

// Expense validation schema
export const expenseSchema = z.object({
  amount: z.number()
    .min(100, 'Summa kamida 100 bo\'lishi kerak')
    .max(10000000, 'Summa 10 milliondan oshmasligi kerak'),
  currency: z.enum(['UZS', 'USD']),
  category: z.string().min(1, 'Kategoriya tanlanmagan'),
  paymentMethod: z.enum(['CASH', 'CARD', 'CLICK']),
  description: z.string()
    .min(3, 'Izoh kamida 3 ta belgidan iborat bo\'lishi kerak')
    .max(500, 'Izoh 500 ta belgidan oshmasligi kerak'),
  receiptNumber: z.string().max(50, 'Chek raqami 50 ta belgidan oshmasligi kerak').optional(),
  date: z.string().min(1, 'Sana tanlanmagan')
});

// Budget validation schema
export const budgetSchema = z.object({
  category: z.string().min(1, 'Kategoriya tanlanmagan'),
  amount: z.number()
    .min(1000, 'Byudjet summasi kamida 1000 bo\'lishi kerak')
    .max(100000000, 'Byudjet summasi 100 milliondan oshmasligi kerak'),
  currency: z.enum(['UZS', 'USD']),
  month: z.number().min(1, 'Oy 1-12 oraliqida bo\'lishi kerak').max(12),
  year: z.number()
    .min(2020, 'Yil 2020 dan katta bo\'lishi kerak')
    .max(2030, 'Yil 2030 dan kichik bo\'lishi kerak'),
  alertThreshold: z.number()
    .min(1, 'Ogohlantirish darajasi 1-100 oraliqida bo\'lishi kerak')
    .max(100)
});

// Loan validation schema
export const loanSchema = z.object({
  employeeName: z.string()
    .min(2, 'Xodim ismi kamida 2 ta belgidan iborat bo\'lishi kerak')
    .max(100, 'Xodim ismi 100 ta belgidan oshmasligi kerak'),
  employeeId: z.string().optional(),
  amount: z.number()
    .min(1000, 'Qarz summasi kamida 1000 bo\'lishi kerak')
    .max(50000000, 'Qarz summasi 50 milliondan oshmasligi kerak'),
  currency: z.enum(['UZS', 'USD']),
  purpose: z.string()
    .min(5, 'Maqsad kamida 5 ta belgidan iborat bo\'lishi kerak')
    .max(200, 'Maqsad 200 ta belgidan oshmasligi kerak'),
  loanDate: z.string().min(1, 'Qarz sanasi tanlanmagan'),
  dueDate: z.string().optional(),
  repaymentType: z.enum(['SALARY_DEDUCTION', 'MANUAL', 'INSTALLMENT']),
  monthlyDeduction: z.number().min(0, 'Oylik to\'lov manfiy bo\'lmasligi kerak').optional(),
  notes: z.string().max(500, 'Izoh 500 ta belgidan oshmasligi kerak').optional()
});

// Type exports
export type CustomerFormData = z.infer<typeof customerSchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type SaleFormData = z.infer<typeof saleSchema>;
export type SaleItemFormData = z.infer<typeof saleItemSchema>;
export type CashboxTransactionFormData = z.infer<typeof cashboxTransactionSchema>;
export type ExchangeTransactionFormData = z.infer<typeof exchangeTransactionSchema>;
export type ExpenseFormData = z.infer<typeof expenseSchema>;
export type BudgetFormData = z.infer<typeof budgetSchema>;
export type LoanFormData = z.infer<typeof loanSchema>;
