import { prisma } from '../utils/prisma';
import type { Sale, SaleItem, Product, Customer, Prisma } from '@prisma/client';
import { DecimalHelper } from '../utils/decimal-helper';
import Decimal from 'decimal.js';

// Types
export interface CreateSaleInput {
  customerId?: string;
  items: Array<{
    productId: string;
    quantity: number;
    pricePerBag: number;
    saleType?: 'bag' | 'piece';
  }>;
  totalAmount: number;
  paidAmount: number;
  currency: string;
  paymentMethod?: 'CASH' | 'CARD' | 'CLICK';
  paymentDetails?: { uzs?: number; usd?: number; click?: number };
  driverId?: string;
  isKocha?: boolean;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
  userId: string;
  userName: string;
}

export interface UpdateSaleInput {
  id: string;
  customerId?: string;
  items?: CreateSaleInput['items'];
  totalAmount?: number;
  paidAmount?: number;
  currency?: string;
  paymentStatus?: string;
  paymentDetails?: CreateSaleInput['paymentDetails'];
  driverId?: string;
  isKocha?: boolean;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
}

export interface SaleWithRelations extends Sale {
  items: (SaleItem & { product: Product | null })[];
  customer: Customer | null;
}

export interface SaleFilters {
  productId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  paymentStatus?: string;
  userId?: string;
}

export class SalesService {
  
  // Barcha sotuvlarni olish (optimized - N+1 fixed)
  async getAllSales(filters?: SaleFilters): Promise<SaleWithRelations[]> {
    const where: Prisma.SaleWhereInput = {};

    if (filters?.productId) {
      where.items = { some: { productId: filters.productId } };
    }
    if (filters?.customerId) {
      where.customerId = filters.customerId;
    }
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    return prisma.sale.findMany({
      where,
      include: {
        customer: true,
        driver: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unitsPerBag: true,
                currentStock: true,
                currentUnits: true,
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    }) as unknown as Promise<SaleWithRelations[]>;
  }

  // Bitta sotuvni olish
  async getSaleById(id: string): Promise<SaleWithRelations | null> {
    return prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        driver: true,
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unitsPerBag: true,
                currentStock: true,
                currentUnits: true,
              }
            }
          }
        },
        invoice: true,
      },
    }) as unknown as Promise<SaleWithRelations | null>;
  }

  // Sotuv yaratish (transaction bilan - FULLY SAFE)
  async createSale(input: CreateSaleInput): Promise<SaleWithRelations> {
    const {
      items, totalAmount, paidAmount, currency, paymentMethod, paymentDetails,
      customerId, driverId, userId, userName, isKocha,
      manualCustomerName, manualCustomerPhone
    } = input;

    // Basic validatsiya (faqat input tekshiruvi)
    if (!items?.length) {
      throw new Error('Kamida bitta mahsulot tanlash kerak');
    }

    // To'lov statusini hisoblash (using DecimalHelper for comparisons)
    let calculatedPaymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (DecimalHelper.isGreaterThanOrEqual(paidAmount, totalAmount) && totalAmount > 0) {
      calculatedPaymentStatus = 'PAID';
    } else if (DecimalHelper.isGreaterThan(paidAmount, 0) && DecimalHelper.isLessThan(paidAmount, totalAmount)) {
      calculatedPaymentStatus = 'PARTIAL';
    }

    // 🔒 TRANSACTION with ReadCommitted isolation (better performance)
    const result = await prisma.$transaction(async (tx) => {
      // 1. FETCH PRODUCTS - Inside transaction for consistency
      const productIds = items.map(i => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const productMap = new Map(products.map(p => [p.id, p]));

      // 2. STOCK VALIDATION REMOVED - Will be done atomically during update

      // 3. ATOMIC RECEIPT NUMBER — MAX + 1 inside transaction prevents gaps/duplicates
      const maxResult = await tx.sale.aggregate({ _max: { receiptNumber: true } });
      const nextReceiptNumber = (maxResult._max.receiptNumber ?? 0) + 1;

      // 4. CREATE SALE
      const sale = await tx.sale.create({
        data: {
          receiptNumber: nextReceiptNumber,
          customerId: isKocha ? null : customerId,
          userId,
          driverId: driverId || null,
          quantity: items.reduce((sum, i) => DecimalHelper.add(sum, i.quantity), 0),
          pricePerBag: 0,
          totalAmount,
          paidAmount,
          currency,
          paymentMethod: paymentMethod || 'CASH',
          paymentStatus: calculatedPaymentStatus,
          paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
          isKocha: !!isKocha,
          manualCustomerName: manualCustomerName || null,
          manualCustomerPhone: manualCustomerPhone || null,
        },
      });

      // 5. CREATE SALE ITEMS
      await tx.saleItem.createMany({
        data: items.map(item => ({
          saleId: sale.id,
          productId: item.productId,
          quantity: item.quantity,
          pricePerBag: item.pricePerBag,
          subtotal: DecimalHelper.multiply(item.quantity, item.pricePerBag),
        }))
      });

      // 5. ATOMIC STOCK UPDATE (prevents overselling with conditional update)
      const stockPromises = items.map(async (item) => {
        const product = productMap.get(item.productId)!;
        const isPieceSale = item.saleType === 'piece';
        
        const unitsPerBag = product.unitsPerBag || 1;
        if (unitsPerBag <= 0) {
          throw new Error(`${product.name} uchun unitsPerBag noto'g'ri`);
        }
        
        // ✅ USE DECIMAL for stock calculations
        const bagsToDeduct = isPieceSale 
          ? DecimalHelper.divide(item.quantity, unitsPerBag)
          : item.quantity;
        const unitsToDeduct = isPieceSale 
          ? item.quantity 
          : DecimalHelper.multiply(item.quantity, unitsPerBag);

        // 🔒 ATOMIC CONDITIONAL UPDATE - Prevents race conditions
        // This single query checks stock AND updates atomically
        const updateResult = await tx.$executeRaw`
          UPDATE "Product"
          SET 
            "currentStock" = "currentStock" - ${bagsToDeduct},
            "currentUnits" = "currentUnits" - ${unitsToDeduct},
            "updatedAt" = NOW()
          WHERE 
            "id" = ${item.productId}
            AND "currentStock" >= ${bagsToDeduct}
            AND "currentUnits" >= ${unitsToDeduct}
        `;

        // If no rows affected, stock was insufficient
        if (updateResult === 0) {
          throw new Error(`${product.name} uchun omborda yetarli mahsulot yo'q (race condition prevented)`);
        }

        // Fetch updated stock for logging
        const updatedProduct = await tx.product.findUnique({
          where: { id: item.productId },
          select: { currentStock: true, currentUnits: true }
        });

        // Stock movement log
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: -bagsToDeduct,
            units: -unitsToDeduct,
            previousStock: product.currentStock,
            previousUnits: product.currentUnits,
            newStock: updatedProduct?.currentStock || 0,
            newUnits: updatedProduct?.currentUnits || 0,
            userId,
            userName,
            reason: `Sotuv: ${sale.id}`,
          }
        });
      });
      
      await Promise.all(stockPromises);

      // 6. CASHBOX TRANSACTIONS - ENABLED
      const method = paymentMethod || 'CASH';
      const cashboxPromises: Promise<any>[] = [];
      
      if (paymentDetails) {
        if (paymentDetails.uzs && paymentDetails.uzs > 0) {
          const paymentType = method === 'CLICK' ? 'Click' : (method === 'CARD' ? 'Karta' : 'Naqd');
          cashboxPromises.push(tx.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paymentDetails.uzs,
              currency: 'UZS',
              category: 'SALE',
              paymentMethod: method,
              description: `Sotuv: ${paymentType} UZS`,
              userId,
              userName,
              reference: sale.id,
            }
          }));
        }
        
        if (paymentDetails.usd && paymentDetails.usd > 0) {
          const paymentType = method === 'CLICK' ? 'Click' : (method === 'CARD' ? 'Karta' : 'Naqd');
          cashboxPromises.push(tx.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paymentDetails.usd,
              currency: 'USD',
              category: 'SALE',
              paymentMethod: method,
              description: `Sotuv: ${paymentType} USD`,
              userId,
              userName,
              reference: sale.id,
            }
          }));
        }
        
        if (paymentDetails.click && paymentDetails.click > 0) {
          cashboxPromises.push(tx.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paymentDetails.click,
              currency: 'UZS',
              category: 'SALE',
              paymentMethod: 'CLICK',
              description: `Sotuv: Click UZS`,
              userId,
              userName,
              reference: sale.id,
            }
          }));
        }
      } else if (paidAmount > 0) {
        const paymentType = method === 'CLICK' ? 'Click' : (method === 'CARD' ? 'Karta' : 'Naqd');
        cashboxPromises.push(tx.cashboxTransaction.create({
          data: {
            type: 'INCOME',
            amount: paidAmount,
            currency: currency,
            category: 'SALE',
            paymentMethod: method,
            description: `Sotuv: ${paymentType} ${currency}`,
            userId,
            userName,
            reference: sale.id,
          }
        }));
      }
      
      if (cashboxPromises.length > 0) {
        await Promise.all(cashboxPromises);
      }

      // 7. UPDATE CUSTOMER DEBT/BALANCE (if not Ko'cha) - FIXED
      if (!isKocha && customerId) {
        const debtAmount = DecimalHelper.subtract(totalAmount, paidAmount);
        
        // Use DecimalHelper for comparisons
        if (DecimalHelper.isGreaterThan(debtAmount, 0.01)) {
          // Customer owes money - add to debt
          if (currency === 'UZS') {
            const roundedDebt = DecimalHelper.round(debtAmount, 0);
            await tx.customer.update({
              where: { id: customerId },
              data: {
                debtUZS: { increment: roundedDebt },
                debt: { increment: DecimalHelper.divide(roundedDebt, parseInt(process.env.USD_TO_UZS_RATE || '12500', 10)) }, // Legacy USD
                lastPurchase: new Date()
              }
            });
          } else {
            const roundedDebt = DecimalHelper.round(debtAmount, 2);
            await tx.customer.update({
              where: { id: customerId },
              data: {
                debtUSD: { increment: roundedDebt },
                debt: { increment: roundedDebt }, // Legacy USD
                lastPurchase: new Date()
              }
            });
          }
        } else if (DecimalHelper.isLessThan(debtAmount, -0.01)) {
          // Overpayment - add to balance
          const overpayment = new Decimal(debtAmount).abs().toNumber();
          if (currency === 'UZS') {
            const roundedBalance = DecimalHelper.round(overpayment, 0);
            await tx.customer.update({
              where: { id: customerId },
              data: {
                balanceUZS: { increment: roundedBalance },
                balance: { increment: DecimalHelper.divide(roundedBalance, parseInt(process.env.USD_TO_UZS_RATE || '12500', 10)) }, // Legacy USD
                lastPurchase: new Date()
              }
            });
          } else {
            const roundedBalance = DecimalHelper.round(overpayment, 2);
            await tx.customer.update({
              where: { id: customerId },
              data: {
                balanceUSD: { increment: roundedBalance },
                balance: { increment: roundedBalance }, // Legacy USD
                lastPurchase: new Date()
              }
            });
          }
        } else {
          // Exact payment - just update lastPurchase
          await tx.customer.update({
            where: { id: customerId },
            data: { lastPurchase: new Date() }
          });
        }
      }

      return { sale };
    }, {
      isolationLevel: 'ReadCommitted', // Better performance than Serializable
      maxWait: 30000,  // 30 seconds
      timeout: 60000,  // 60 seconds
    });

    // Fetch complete sale with relations
    const completeSale = await prisma.sale.findUnique({
      where: { id: result.sale.id },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    return completeSale as SaleWithRelations;
  }

  // Sotuv yangilash
  async updateSale(input: UpdateSaleInput): Promise<SaleWithRelations> {
    const { id, items, ...updateData } = input;

    return prisma.$transaction(async (tx) => {
      // Eski sotuvni olish
      const oldSale = await tx.sale.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          customer: true,
        }
      });

      if (!oldSale) throw new Error('Sotuv topilmadi');

      // Eski stock qaytarish
      for (const item of oldSale.items) {
        if (!item.productId || !item.product) continue;
        
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            currentUnits: { 
              increment: item.quantity * item.product.unitsPerBag 
            },
          }
        });
      }

      // To'lov statusini hisoblash (using DecimalHelper)
      const totalAmount = updateData.totalAmount ?? oldSale.totalAmount;
      const paidAmount = updateData.paidAmount ?? oldSale.paidAmount;
      
      let calculatedPaymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
      if (DecimalHelper.isGreaterThanOrEqual(paidAmount, totalAmount) && totalAmount > 0) {
        calculatedPaymentStatus = 'PAID';
      } else if (DecimalHelper.isGreaterThan(paidAmount, 0) && DecimalHelper.isLessThan(paidAmount, totalAmount)) {
        calculatedPaymentStatus = 'PARTIAL';
      }

      // Sotuvni yangilash
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          totalAmount: updateData.totalAmount,
          paidAmount: updateData.paidAmount,
          currency: updateData.currency,
          paymentDetails: updateData.paymentDetails ? JSON.stringify(updateData.paymentDetails) : undefined,
          driverId: updateData.driverId,
          isKocha: updateData.isKocha,
          manualCustomerName: updateData.manualCustomerName,
          manualCustomerPhone: updateData.manualCustomerPhone,
          ...(updateData.customerId !== undefined && { customerId: updateData.customerId }),
          paymentStatus: updateData.paymentStatus || calculatedPaymentStatus,
        },
      });

      // Yangi items bo'lsa, stock yangilash
      if (items && items.length > 0) {
        // Eski itemsni o'chirish
        await tx.saleItem.deleteMany({ where: { saleId: id } });

        // Yangi items qo'shish
        await tx.saleItem.createMany({
          data: items.map(item => ({
            saleId: id,
            productId: item.productId,
            quantity: item.quantity,
            pricePerBag: item.pricePerBag,
            subtotal: DecimalHelper.multiply(item.quantity, item.pricePerBag),
          }))
        });

        // Yangi stock o'chirish
        const productIds = items.map(i => i.productId);
        const products = await tx.product.findMany({
          where: { id: { in: productIds } },
        });

        const productMap = new Map(products.map(p => [p.id, p]));

        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) continue;

          const isPieceSale = item.saleType === 'piece';
          const unitsPerBag = product.unitsPerBag || 1;
          
          const bagsToDeduct = isPieceSale 
            ? DecimalHelper.divide(item.quantity, unitsPerBag)
            : item.quantity;
          const unitsToDeduct = isPieceSale 
            ? item.quantity 
            : DecimalHelper.multiply(item.quantity, unitsPerBag);

          // Atomic conditional update — same pattern as createSale to prevent negative stock
          const updateResult = await tx.$executeRaw`
            UPDATE "Product"
            SET
              "currentStock" = "currentStock" - ${bagsToDeduct},
              "currentUnits" = "currentUnits" - ${unitsToDeduct},
              "updatedAt" = NOW()
            WHERE
              "id" = ${item.productId}
              AND "currentStock" >= ${bagsToDeduct}
              AND "currentUnits" >= ${unitsToDeduct}
          `;

          if (updateResult === 0) {
            throw new Error(`${product.name} uchun omborda yetarli mahsulot yo'q`);
          }
        }
      }

      // Mijoz qarzini yangilash (agar kerak bo'lsa)
      if (updateData.paidAmount !== undefined && oldSale.customerId) {
        const oldDebt = DecimalHelper.subtract(oldSale.totalAmount, oldSale.paidAmount);
        const newDebt = DecimalHelper.subtract(totalAmount, paidAmount);
        const debtDifference = DecimalHelper.subtract(newDebt, oldDebt);

        if (Math.abs(debtDifference) > 0.01) {
          const currency = updateData.currency || oldSale.currency;
          if (currency === 'UZS') {
            await tx.customer.update({
              where: { id: oldSale.customerId },
              data: {
                debtUZS: { increment: DecimalHelper.round(debtDifference, 0) },
                debt: { increment: DecimalHelper.divide(DecimalHelper.round(debtDifference, 0), parseInt(process.env.USD_TO_UZS_RATE || '12500', 10)) },
              }
            });
          } else {
            await tx.customer.update({
              where: { id: oldSale.customerId },
              data: {
                debtUSD: { increment: DecimalHelper.round(debtDifference, 2) },
                debt: { increment: DecimalHelper.round(debtDifference, 2) },
              }
            });
          }
        }
      }

      // Yangilangan sotuvni qaytarish
      return tx.sale.findUnique({
        where: { id },
        include: {
          customer: true,
          items: { include: { product: true } }
        }
      }) as Promise<SaleWithRelations>;
    });
  }

  // Sotuvni o'chirish
  async deleteSale(id: string): Promise<void> {
    return prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { product: true } } }
      });

      if (!sale) throw new Error('Sotuv topilmadi');

      // Stockni qaytarish
      for (const item of sale.items) {
        if (!item.productId || !item.product) continue;
        
        await tx.product.update({
          where: { id: item.productId },
          data: {
            currentStock: { increment: item.quantity },
            currentUnits: { 
              increment: item.quantity * item.product.unitsPerBag 
            },
          }
        });
      }

      // Itemsni o'chirish
      await tx.saleItem.deleteMany({ where: { saleId: id } });

      // Sotuvni o'chirish
      await tx.sale.delete({ where: { id } });
    });
  }
}

export const salesService = new SalesService();
