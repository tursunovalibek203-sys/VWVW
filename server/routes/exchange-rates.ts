import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = Router();

router.use(authenticate);

// Get all active exchange rates
router.get('/', async (req: AuthRequest, res) => {
  try {
    const rates = await prisma.exchangeRate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(successResponse(rates));
  } catch (error: any) {
    console.error('Error fetching exchange rates:', error);
    res.status(500).json(errorResponse('Failed to fetch exchange rates', error.message));
  }
});

// Get specific exchange rate
router.get('/pair', async (req: AuthRequest, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json(errorResponse('from and to currencies are required'));
    }

    const rate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrency: from as string,
        toCurrency: to as string,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(successResponse(rate));
  } catch (error: any) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json(errorResponse('Failed to fetch exchange rate', error.message));
  }
});

// Create new exchange rate (admin only)
router.post('/', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { fromCurrency, toCurrency, rate } = req.body;

    if (!fromCurrency || !toCurrency || !rate) {
      return res.status(400).json(errorResponse('fromCurrency, toCurrency and rate are required'));
    }

    // Deactivate old rates for the same pair
    await prisma.exchangeRate.updateMany({
      where: { fromCurrency, toCurrency, isActive: true },
      data: { isActive: false }
    });

    const newRate = await prisma.exchangeRate.create({
      data: {
        fromCurrency,
        toCurrency,
        rate: parseFloat(rate),
        isActive: true
      }
    });

    res.status(201).json(successResponse(newRate));
  } catch (error: any) {
    console.error('Error creating exchange rate:', error);
    res.status(500).json(errorResponse('Failed to create exchange rate', error.message));
  }
});

// Update exchange rate (admin only)
router.put('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { rate } = req.body;

    const updatedRate = await prisma.exchangeRate.update({
      where: { id },
      data: { rate: parseFloat(rate) }
    });

    res.json(successResponse(updatedRate));
  } catch (error: any) {
    console.error('Error updating exchange rate:', error);
    res.status(500).json(errorResponse('Failed to update exchange rate', error.message));
  }
});

// Deactivate exchange rate (admin only)
router.delete('/:id', authorize('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.exchangeRate.update({
      where: { id },
      data: { isActive: false }
    });

    res.json(successResponse({ message: 'Exchange rate deactivated' }));
  } catch (error: any) {
    console.error('Error deactivating exchange rate:', error);
    res.status(500).json(errorResponse('Failed to deactivate exchange rate', error.message));
  }
});

export default router;
