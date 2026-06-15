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
  paymentMethod?: 'CASH' | 'CARD';
  paymentDetails?: { uzs?: number; usd?: number; karta?: number };
  driverId?: string;
  driverCollectedAmount?: number;   // Haydovchi mijozdan yig'adigan summa
  deliveryFee?: number;             // Yetkazib berish narxi
  deliveryFeePaidBy?: 'CUSTOMER' | 'COMPANY'; // Kim to'laydi
  isKocha?: boolean;
  manualCustomerName?: string;
  manualCustomerPhone?: string;
  userId: string;
  userName: string;
  exchangeRate?: number;
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

  // Sotuv yaratish (transaction bilan)
  async createSale(input: CreateSaleInput): Promise<SaleWithRelations> {
    const {
      items, totalAmount, currency, paymentMethod, paymentDetails,
      customerId, driverId, userId, userName, isKocha,
      manualCustomerName, manualCustomerPhone,
      driverCollectedAmount = 0,
      deliveryFee = 0,
      deliveryFeePaidBy = 'COMPANY',
      exchangeRate = 12700,
    } = input;

    // paidAmount undefined bo'lmasligi uchun (Zod .optional() bo'lgani sababli)
    const paidAmount = typeof input.paidAmount === 'number' ? input.paidAmount : 0;

    if (!items?.length) throw new Error('Kamida bitta mahsulot tanlash kerak');

    // Haydovchi faqat belgilangan summani yig'adi.
    // Qolgan summa (remaining - actualDriverCollected) mijoz qarziga yoziladi.
    const remaining = Math.max(0, totalAmount - paidAmount);
    const actualDriverCollected = driverId
      ? Math.min(driverCollectedAmount || 0, remaining)   // haydovchi ko'pi bilan remaining yig'a oladi
      : 0;

    // To'lov statusini hisoblash — haydovchi summasi ham hisobga olinadi
    const totalCovered = DecimalHelper.add(paidAmount, actualDriverCollected);
    let calculatedPaymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' = 'UNPAID';
    if (DecimalHelper.isGreaterThanOrEqual(totalCovered, totalAmount) && totalAmount > 0) {
      // Haydovchi yoki mijoz to'liq to'ladi
      calculatedPaymentStatus = 'PAID';
    } else if (DecimalHelper.isGreaterThan(totalCovered, 0)) {
      calculatedPaymentStatus = 'PARTIAL';
    }

    const safePaymentMethod = paymentMethod === 'CARD' ? 'CARD' : 'CASH';
    const safeCurrency = (currency === 'UZS' || currency === 'USD') ? currency : 'USD';

    const result = await prisma.$transaction(async (tx) => {
      try {
        // 1. Mahsulotlarni olish
        const productIds = items.map(i => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: productIds } } });
      const productMap = new Map(products.map(p => [p.id, p]));

      // 2. Chek raqamini hisoblash
      const maxResult = await tx.sale.aggregate({ _max: { receiptNumber: true } });
      const nextReceiptNumber = (maxResult._max.receiptNumber ?? 0) + 1;

      // 3. Sotuv yaratish
      const sale = await tx.sale.create({
          data: {
            receiptNumber: nextReceiptNumber,
            customerId: isKocha ? null : (customerId || null),
            userId,
            driverId: driverId || null,
            quantity: items.reduce((sum, i) => DecimalHelper.add(sum, i.quantity), 0),
            pricePerBag: 0,
            bagType: 'SMALL',
            totalAmount,
            paidAmount,
            currency: safeCurrency,
            paymentMethod: safePaymentMethod,
            paymentStatus: calculatedPaymentStatus,
            paymentDetails: paymentDetails ? JSON.stringify(paymentDetails) : null,
            driverCollectedAmount: actualDriverCollected,
            driverPaymentStatus: 'PENDING',
            deliveryFee: deliveryFee || 0,
            deliveryFeePaidBy: deliveryFeePaidBy || 'COMPANY',
            isKocha: !!isKocha,
            manualCustomerName: manualCustomerName || null,
            manualCustomerPhone: manualCustomerPhone || null,
          },
        });

        // 5. CREATE SALE ITEMS — createMany() has SQLite issues, use sequential create()
        for (const item of items) {
          await tx.saleItem.create({
            data: {
              saleId: sale.id,
              productId: item.productId,
              quantity: item.quantity,
              pricePerBag: item.pricePerBag,
              subtotal: DecimalHelper.multiply(item.quantity, item.pricePerBag),
            }
          });
        }

        // 6. ATOMIC STOCK UPDATE — sequential to avoid SQLite concurrent write errors
        for (const item of items) {
          const product = productMap.get(item.productId);
          if (!product) {
            throw new Error(`Mahsulot topilmadi: ${item.productId}`);
          }

          const isPieceSale = item.saleType === 'piece';

          const unitsPerBag = product.unitsPerBag || 1;
          if (unitsPerBag <= 0) {
            throw new Error(`${product.name} uchun unitsPerBag noto'g'ri`);
          }

          const bagsToDeduct = isPieceSale
            ? DecimalHelper.divide(item.quantity, unitsPerBag)
            : item.quantity;
          const unitsToDeduct = isPieceSale
            ? item.quantity
            : DecimalHelper.multiply(item.quantity, unitsPerBag);

          // Minus stockka ruxsat — ishlab chiqarish keyinroq qo'shilganda to'g'rilanadi
          await tx.$executeRaw`
            UPDATE "Product"
            SET
              "currentStock" = "currentStock" - ${bagsToDeduct},
              "currentUnits" = "currentUnits" - ${unitsToDeduct},
              "updatedAt" = NOW()
            WHERE "id" = ${item.productId}
          `;

          const updatedProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { currentStock: true, currentUnits: true },
          });

          // StockMovement.quantity/units are Int in schema — must round floats
          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              type: 'SALE',
              quantity: -Math.round(bagsToDeduct),
              units: -Math.round(unitsToDeduct),
              previousStock: Math.round(product.currentStock),
              previousUnits: Math.round(product.currentUnits),
              newStock: Math.round(updatedProduct?.currentStock ?? 0),
              newUnits: Math.round(updatedProduct?.currentUnits ?? 0),
              userId,
              userName,
              reason: `Sotuv: ${sale.id}`,
            },
          });
        }

        // 7. CASHBOX TRANSACTIONS — sequential to avoid SQLite lock
        if (paymentDetails) {
          if (paymentDetails.uzs && paymentDetails.uzs > 0) {
            await tx.cashboxTransaction.create({
              data: {
                type: 'INCOME',
                amount: paymentDetails.uzs,
                currency: 'UZS',
                category: 'SALE',
                paymentMethod: safePaymentMethod,
                description: `Sotuv: Naqd UZS`,
                userId,
                userName,
                reference: sale.id,
              }
            });
          }
          if (paymentDetails.usd && paymentDetails.usd > 0) {
            await tx.cashboxTransaction.create({
              data: {
                type: 'INCOME',
                amount: paymentDetails.usd,
                currency: 'USD',
                category: 'SALE',
                paymentMethod: safePaymentMethod,
                description: `Sotuv: Naqd USD`,
                userId,
                userName,
                reference: sale.id,
              }
            });
          }
          if (paymentDetails.karta && paymentDetails.karta > 0) {
            await tx.cashboxTransaction.create({
              data: {
                type: 'INCOME',
                amount: paymentDetails.karta,
                currency: 'UZS',
                category: 'SALE',
                paymentMethod: 'CARD',
                description: `Sotuv: Karta UZS`,
                userId,
                userName,
                reference: sale.id,
              }
            });
          }
        } else if (paidAmount > 0) {
          const paymentType = safePaymentMethod === 'CARD' ? 'Karta' : 'Naqd';
          await tx.cashboxTransaction.create({
            data: {
              type: 'INCOME',
              amount: paidAmount,
              currency: safeCurrency,
              category: 'SALE',
              paymentMethod: safePaymentMethod,
              description: `Sotuv: ${paymentType} ${safeCurrency}`,
              userId,
              userName,
              reference: sale.id,
            }
          });
        }

        // 8. UPDATE CUSTOMER DEBT/BALANCE (if not Ko'cha)
        // actualDriverCollected hisobga olinadi — haydovchi tayinlansa mijoz qarz ko'rinmaydi
        if (!isKocha && customerId) {
          const effectivePaid = DecimalHelper.add(paidAmount, actualDriverCollected);
          const debtAmount = DecimalHelper.subtract(totalAmount, effectivePaid);
          
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
        // 9. DRIVER DEBT — haydovchi mijozdan pul yig'sa, kompaniyaga qarzdor bo'ladi
        // debtToCompany har doim UZS da saqlanadi — USD bo'lsa kursga ko'paytiramiz
        if (driverId && actualDriverCollected > 0) {
          const debtInUZS = safeCurrency === 'USD'
            ? actualDriverCollected * exchangeRate
            : actualDriverCollected;
          await tx.$executeRaw`
            UPDATE "Driver"
            SET "debtToCompany" = "debtToCompany" + ${debtInUZS},
                "updatedAt" = NOW()
            WHERE "id" = ${driverId}
          `;
        }

        // 10. DELIVERY FEE — yetkazib berish narxi
        if (deliveryFee > 0) {
          if (deliveryFeePaidBy === 'CUSTOMER' && !isKocha && customerId) {
            // Mijoz to'laydi: mijoz qarziga qo'shamiz
            const feeInCustomerCurrency = currency === 'UZS' ? deliveryFee : deliveryFee / exchangeRate;
            if (currency === 'UZS') {
              await tx.customer.update({ where: { id: customerId }, data: { debtUZS: { increment: Math.round(feeInCustomerCurrency) } } });
            } else {
              await tx.customer.update({ where: { id: customerId }, data: { debtUSD: { increment: parseFloat(feeInCustomerCurrency.toFixed(2)) } } });
            }
          } else if (deliveryFeePaidBy === 'COMPANY') {
            // Kompaniya to'laydi: kassa xarajat
            await tx.cashboxTransaction.create({
              data: {
                type: 'EXPENSE',
                amount: deliveryFee,
                currency: 'UZS',
                category: 'EXPENSE',
                paymentMethod: 'CASH',
                description: `Yetkazib berish: ${driverId ? 'Haydovchi' : 'Sotuv'} ${sale.id}`,
                userId,
                userName,
                reference: sale.id,
              }
            });
          }
        }

        return { saleId: sale.id };
      } catch (e) {
        throw e;
      }
    }, {
      maxWait: 30000,  // 30 seconds
      timeout: 60000,  // 60 seconds
    });

    // Fetch complete sale with relations
    const completeSale = await prisma.sale.findUnique({
      where: { id: result.saleId },
      include: {
        customer: true,
        items: { include: { product: true } }
      }
    });

    // Real-time backup: Excel faylni background da yangilash
    setImmediate(async () => {
      try {
        const { generateDailyExcelBackup } = await import('../utils/daily-excel-backup.js');
        await generateDailyExcelBackup();
      } catch { /* silent */ }
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

        // Yangi items qo'shish — createMany() SQLite bilan muammo, create() ishlatamiz
        for (const item of items) {
          await tx.saleItem.create({
            data: {
              saleId: id,
              productId: item.productId,
              quantity: item.quantity,
              pricePerBag: item.pricePerBag,
              subtotal: DecimalHelper.multiply(item.quantity, item.pricePerBag),
            }
          });
        }

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

          // Minus stockka ruxsat — ishlab chiqarish keyinroq qo'shilganda to'g'rilanadi
          await tx.$executeRaw`
            UPDATE "Product"
            SET
              "currentStock" = "currentStock" - ${bagsToDeduct},
              "currentUnits" = "currentUnits" - ${unitsToDeduct},
              "updatedAt" = NOW()
            WHERE "id" = ${item.productId}
          `;
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
