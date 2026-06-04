import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// ============ BUDGET MANAGEMENT ============

// Get all budgets
router.get('/', authenticate, async (req, res) => {
  try {
    const { year, month, category } = req.query;
    
    const where: any = {};
    if (year) where.year = parseInt(year as string);
    if (month) where.month = parseInt(month as string);
    if (category) where.category = category;
    
    const budgets = await prisma.budget.findMany({
      where,
      include: {
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
        { category: 'asc' }
      ]
    });
    
    res.json(budgets);
  } catch (error) {
    console.error('Budget fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// Create budget
router.post('/', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { category, year, month, amount, currency, description, alertThreshold } = req.body;
    
    // Check if budget already exists
    const existing = await prisma.budget.findUnique({
      where: {
        category_year_month: { category, year, month }
      }
    });
    
    if (existing) {
      return res.status(400).json({ error: 'Budget already exists for this category and period' });
    }
    
    const budget = await prisma.budget.create({
      data: {
        category,
        year,
        month,
        amount: parseFloat(amount),
        remaining: parseFloat(amount),
        currency: currency || 'UZS',
        description,
        alertThreshold: alertThreshold || 80,
        createdBy: (req as any).user?.id || 'system'
      }
    });
    
    res.status(201).json(budget);
  } catch (error) {
    console.error('Budget creation error:', error);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Update budget
router.put('/:id', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount, description, alertThreshold } = req.body;
    
    const budget = await prisma.budget.update({
      where: { id },
      data: {
        amount: amount !== undefined ? parseFloat(amount) : undefined,
        description,
        alertThreshold: alertThreshold !== undefined ? parseFloat(alertThreshold) : undefined
      }
    });
    
    res.json(budget);
  } catch (error) {
    console.error('Budget update error:', error);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Delete budget
router.delete('/:id', authenticate, authorize('ADMIN', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    await prisma.budget.delete({
      where: { id }
    });
    
    res.json({ message: 'Budget deleted successfully' });
  } catch (error) {
    console.error('Budget delete error:', error);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

// Get budget report
router.get('/report/:year/:month', authenticate, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    const yearInt = parseInt(year);
    const monthInt = parseInt(month);
    
    // Get all budgets for the month
    const budgets = await prisma.budget.findMany({
      where: { year: yearInt, month: monthInt }
    });
    
    // Get expenses for each category
    const expenses = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        createdAt: {
          gte: new Date(yearInt, monthInt - 1, 1),
          lt: new Date(yearInt, monthInt, 1)
        }
      },
      _sum: { amount: true }
    });
    
    // Combine budget and expense data
    const report = budgets.map(budget => {
      const expense = expenses.find(e => e.category === budget.category);
      const spent = expense?._sum.amount || 0;
      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      
      return {
        category: budget.category,
        budgetAmount: budget.amount,
        spentAmount: spent,
        remaining: budget.amount - spent,
        percentageUsed: parseFloat(percentage.toFixed(2)),
        currency: budget.currency,
        alertThreshold: budget.alertThreshold,
        status: percentage >= 100 ? 'EXCEEDED' : percentage >= budget.alertThreshold ? 'WARNING' : 'OK'
      };
    });
    
    res.json({
      year: yearInt,
      month: monthInt,
      categories: report,
      totalBudget: report.reduce((sum, r) => sum + r.budgetAmount, 0),
      totalSpent: report.reduce((sum, r) => sum + r.spentAmount, 0)
    });
  } catch (error) {
    console.error('Budget report error:', error);
    res.status(500).json({ error: 'Failed to generate budget report' });
  }
});

// Get category analysis
router.get('/analysis/:category', authenticate, async (req, res) => {
  try {
    const { category } = req.params;
    const { months = 6 } = req.query;
    
    const monthsBack = parseInt(months as string);
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1);
    
    // Get monthly data
    const monthlyData = await prisma.expense.groupBy({
      by: ['category'],
      where: {
        category,
        createdAt: { gte: startDate }
      },
      _sum: { amount: true }
    });
    
    // Get budgets for comparison
    const budgets = await prisma.budget.findMany({
      where: {
        category,
        year: { gte: startDate.getFullYear() },
        month: { gte: startDate.getMonth() + 1 }
      }
    });
    
    res.json({
      category,
      monthlyData,
      budgets,
      analysis: {
        averageMonthly: monthlyData.length > 0 ? 
          monthlyData.reduce((sum, m) => sum + (m._sum.amount || 0), 0) / monthlyData.length : 0,
        totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
        variance: 0 // Calculate based on data
      }
    });
  } catch (error) {
    console.error('Category analysis error:', error);
    res.status(500).json({ error: 'Failed to generate analysis' });
  }
});

// Mark alert as read
router.put('/alerts/:id/read', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const alert = await prisma.budgetAlert.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });
    
    res.json(alert);
  } catch (error) {
    console.error('Alert update error:', error);
    res.status(500).json({ error: 'Failed to update alert' });
  }
});

// Get unread alerts
router.get('/alerts/unread', authenticate, async (req, res) => {
  try {
    const alerts = await prisma.budgetAlert.findMany({
      where: { isRead: false },
      include: {
        budget: true
      },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(alerts);
  } catch (error) {
    console.error('Alerts fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

export default router;
