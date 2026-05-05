import { z } from 'zod';

// 💰 Helper: Floating point xatolarni oldini olish uchun
export const parseMoney = (value: unknown): number => {
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
};

// ==========================================
// SALE VALIDATION SCHEMAS
// ==========================================

export const SaleItemSchema = z.object({
  productId: z.string().min(1, 'Mahsulot ID kiritilishi shart'),
  productName: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).transform((v) => parseFloat(String(v))),
  pricePerBag: z.union([z.string(), z.number()]).transform(parseMoney),
  pricePerPiece: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  variantId: z.string().optional(),
  unitsPerBag: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v), 10)).optional(),
  saleType: z.enum(['bag', 'piece', 'komplekt']).optional().default('bag'),
  // Frontenddan keladigan qo'shimcha maydonlar (optional)
  subtotal: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  warehouse: z.string().optional(),
});

export const SaleCreateSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'Kamida bitta mahsulot kiritilishi shart'),
  totalAmount: z.union([z.string(), z.number()]).transform(parseMoney),
  paidAmount: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  debtAmount: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  currency: z.enum(['USD', 'UZS']).default('USD'),
  paymentMethod: z.enum(['CASH', 'CARD', 'CLICK']).default('CASH'),
  paymentDetails: z.object({
    uzs: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
    usd: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
    click: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  }).optional(),
  driverId: z.string().optional(),
  factoryShare: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  customerShare: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  isKocha: z.boolean().optional(),
  manualCustomerName: z.string().optional(),
  manualCustomerPhone: z.string().optional(),
  // Frontenddan keladigan qo'shimcha maydonlar (optional)
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  exchangeRate: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  createdAt: z.string().or(z.date()).optional(),
  status: z.string().optional(),
}).refine((data) => {
  // Agar isKocha true bo'lsa, customerId talab qilinmaydi
  if (data.isKocha) {
    return true;
  }
  // Aks holda customerId bo'lishi shart
  return !!data.customerId && data.customerId.length > 0;
}, {
  message: 'Mijoz tanlanishi shart yoki Ko\'chaga sotishni tanlang',
  path: ['customerId']
});

export const SaleUpdateSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(SaleItemSchema).min(1, 'Kamida bitta mahsulot kiritilishi shart').optional(),
  totalAmount: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  paidAmount: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  currency: z.enum(['USD', 'UZS']).optional(),
  paymentDetails: z.object({
    uzs: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
    usd: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
    click: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  }).optional(),
  driverId: z.string().optional(),
  factoryShare: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  customerShare: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
  isKocha: z.boolean().optional(),
  manualCustomerName: z.string().optional(),
  manualCustomerPhone: z.string().optional(),
});

// ==========================================
// ORDER VALIDATION SCHEMAS
// ==========================================

export const OrderItemSchema = z.object({
  productId: z.string().min(1, 'Mahsulot ID kiritilishi shart'),
  quantityBags: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v), 10)),
  quantityUnits: z.union([z.string(), z.number()]).transform((v) => parseInt(String(v), 10)).optional(),
  priceType: z.enum(['BAG', 'UNIT']).default('BAG'),
  price: z.union([z.string(), z.number()]).transform(parseMoney).optional(),
});

export const OrderCreateSchema = z.object({
  customerId: z.string().min(1, 'Mijoz tanlanishi shart'),
  items: z.array(OrderItemSchema).min(1, 'Kamida bitta mahsulot kiritilishi shart'),
  notes: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  requestedDate: z.string().or(z.date()).optional(),
  source: z.enum(['BOT', 'WEB', 'MOBILE']).optional().default('WEB'),
});

export const OrderStatusUpdateSchema = z.object({
  status: z.enum(['CONFIRMED', 'IN_PRODUCTION', 'READY', 'SOLD', 'CANCELLED', 'DELIVERED']),
});

export const OrderPaymentSchema = z.object({
  paymentDetails: z.object({
    uzs: z.union([z.string(), z.number()]).transform(parseMoney).default(0),
    usd: z.union([z.string(), z.number()]).transform(parseMoney).default(0),
    click: z.union([z.string(), z.number()]).transform(parseMoney).default(0),
  }),
  dueDate: z.string().optional(),
});

// ==========================================
// AUTH VALIDATION SCHEMAS
// ==========================================

export const LoginSchema = z.object({
  login: z.string().min(1, 'Login kiritilishi shart'),
  password: z.string().min(1, 'Parol kiritilishi shart'),
});

export const RegisterSchema = z.object({
  login: z.string().min(3, 'Login kamida 3 ta belgidan iborat bo\'lishi kerak'),
  name: z.string().min(1, 'Ism kiritilishi shart'),
  password: z.string().min(6, 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'),
  role: z.enum(['ADMIN', 'CASHIER', 'SELLER', 'MANAGER', 'WAREHOUSE_MANAGER']).default('SELLER'),
});

// ==========================================
// QUERY VALIDATION SCHEMAS
// ==========================================

export const PaginationSchema = z.object({
  page: z.string().or(z.number()).transform((v) => parseInt(String(v), 10) || 1),
  limit: z.string().or(z.number()).transform((v) => Math.min(parseInt(String(v), 10) || 50, 100)),
});

export const ProductQuerySchema = z.object({
  productId: z.string().min(1).optional(),
  category: z.string().optional(),
  search: z.string().optional(),
});

// ==========================================
// VALIDATION MIDDLEWARE HELPER
// ==========================================

export const validateBody = <T extends z.ZodType>(schema: T) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Validatsiya xatosi',
          details: formattedErrors,
        });
      }
      return res.status(400).json({
        error: 'Validatsiya xatosi',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

export const validateQuery = <T extends z.ZodType>(schema: T) => {
  return (req: any, res: any, next: any) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        return res.status(400).json({
          error: 'Query validatsiya xatosi',
          details: formattedErrors,
        });
      }
      return res.status(400).json({
        error: 'Query validatsiya xatosi',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
};

// Export types for TypeScript
type SaleCreateInput = z.infer<typeof SaleCreateSchema>;
type SaleUpdateInput = z.infer<typeof SaleUpdateSchema>;
type OrderCreateInput = z.infer<typeof OrderCreateSchema>;
type OrderPaymentInput = z.infer<typeof OrderPaymentSchema>;
type LoginInput = z.infer<typeof LoginSchema>;
type RegisterInput = z.infer<typeof RegisterSchema>;
