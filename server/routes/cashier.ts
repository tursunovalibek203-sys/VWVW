import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Cashier sales endpoint - handles sales created from cashier interface
router.post('/sales', authorize('CASHIER'), async (req: AuthRequest, res) => {
  try {
    console.log('📥 Cashier POST /sales - Data:', { 
      userId: req.user?.id, 
      bodySize: JSON.stringify(req.body).length 
    });

    // Import and use SalesService directly
    const { SalesService } = await import('../services/SalesService');
    const salesService = new SalesService();
    
    // Prepare user info for SalesService
    const userInfo = {
      id: req.user!.id,
      name: (req.user as any)?.name || req.user?.email || 'Cashier',
      email: req.user?.email || ''
    };

    // Create sale using SalesService
    const saleInput = {
      ...req.body,
      userId: req.user!.id,
      userName: userInfo.name
    };
    
    const result = await salesService.createSale(saleInput);
    
    console.log('✅ Cashier sale created successfully');
    res.json(result);
    
  } catch (error: any) {
    console.error('❌ Cashier sales error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ 
      error: 'Cashier sales creation failed', 
      details: error.message 
    });
  }
});

export default router;
