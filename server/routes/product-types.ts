import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken, authorize } from '../middleware/auth';

const router = Router();

// Barcha mahsulot turlarini olish
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await prisma.productType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });

    // Preserve original response shape: type fields + productCount
    const productTypes = rows.map(({ _count, ...type }) => ({
      ...type,
      productCount: _count.products,
    }));

    res.json(productTypes);
  } catch (error) {
    console.error('❌ Error fetching product types:', error);
    res.status(500).json({ error: 'Internal server error', details: (error as Error).message });
  }
});

// Yangi mahsulot turi yaratish
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, defaultCard } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required and must be a non-empty string' });
    }
    if (name.length > 100) {
      return res.status(400).json({ error: 'Name must not exceed 100 characters' });
    }
    if (description && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }
    if (defaultCard && typeof defaultCard !== 'string') {
      return res.status(400).json({ error: 'defaultCard must be a string' });
    }

    // Sanitize input
    const sanitizedName = name.trim();
    const sanitizedDescription = description ? description.trim() : null;
    const sanitizedDefaultCard = defaultCard ? defaultCard.trim() : null;

    // Nomni tekshirish
    const existingType = await prisma.productType.findFirst({
      where: { name: sanitizedName },
    });

    if (existingType) {
      return res.status(400).json({ error: 'Product type with this name already exists' });
    }

    const productType = await prisma.productType.create({
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        defaultCard: sanitizedDefaultCard,
        active: true,
      },
    });

    res.status(201).json(productType);
  } catch (error) {
    console.error('Error creating product type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mahsulot turini yangilash
router.put('/:id', authenticateToken, authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, defaultCard, active } = req.body;

    // Input validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)) {
      return res.status(400).json({ error: 'Name must be a non-empty string with max 100 characters' });
    }
    if (description !== undefined && description !== null && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }
    if (defaultCard !== undefined && defaultCard !== null && typeof defaultCard !== 'string') {
      return res.status(400).json({ error: 'defaultCard must be a string' });
    }
    if (active !== undefined && typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }

    // Faqat berilgan maydonlarni yangilash (mavjud qiymatlarni null bilan o'chirib yubormaslik uchun)
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (defaultCard !== undefined) data.defaultCard = defaultCard ? defaultCard.trim() : null;
    if (active !== undefined) data.active = active;

    const productType = await prisma.productType.update({
      where: { id },
      data,
    });

    res.json(productType);
  } catch (error) {
    console.error('Error updating product type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mahsulot turini o'chirish (deactivate)
router.delete('/:id', authenticateToken, authorize('ADMIN', 'WAREHOUSE_MANAGER'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productType.update({
      where: { id },
      data: { active: false },
    });

    res.json({ message: 'Product type deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating product type:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
