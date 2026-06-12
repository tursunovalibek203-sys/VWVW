import { prisma } from './prisma';

interface AddToCashboxParams {
  amount: number;
  currency?: string;
  paymentMethod?: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  description: string;
  userId: string;
  userName: string;
  relatedId?: string;
  relatedType?: string;
}

export async function addToCashbox(params: AddToCashboxParams) {
  try {
    const method = (params.paymentMethod || 'CASH').toUpperCase();
    const resolvedCurrency = method === 'CARD' ? 'UZS' : (params.currency || 'UZS');
    const transaction = await prisma.cashboxTransaction.create({
      data: {
        type: params.type,
        amount: params.amount,
        currency: resolvedCurrency,
        paymentMethod: method,
        category: params.category,
        description: params.description,
        userId: params.userId,
        userName: params.userName,
        reference: params.relatedId || null,
      },
    });
    return transaction;
  } catch (error) {
    console.error('addToCashbox xatolik:', error);
    throw error;
  }
}

export async function getCashboxBalance() {
  try {
    const transactions = await prisma.cashboxTransaction.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const income = transactions
      .filter(t => t.type === 'INCOME')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expense = transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expense,
      balance: income - expense,
    };
  } catch (error) {
    console.error('getCashboxBalance xatolik:', error);
    throw error;
  }
}
