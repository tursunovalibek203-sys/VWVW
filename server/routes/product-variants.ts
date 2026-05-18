import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Barcha mahsulot variantlarini olish
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rows = await prisma.productVariant.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
      include: { parent: { select: { name: true, bagType: true } } },
    });

    // Preserve original flattened response shape (parentName / parentBagType)
    const variants = rows.map(({ parent, ...pv }) => ({
      ...pv,
      parentName: parent?.name ?? null,
      parentBagType: parent?.bagType ?? null,
    }));

    res.json(variants);
  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Yangi mahsulot varianti yaratish
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { parentId, variantName, cardType, pricePerBag, currentStock = 0, currentUnits = 0 } = req.body;

    // Ota mahsulotni tekshirish
    const parentProduct = await prisma.product.findUnique({
      where: { id: parentId }
    });

    if (!parentProduct) {
      return res.status(404).json({ error: 'Parent product not found' });
    }

    // 15g preform uchun cardType ni tekshirish
    if (parentProduct.name.toLowerCase().includes('15g') && !cardType) {
      return res.status(400).json({ 
        error: 'Card type is required for 15g preforms',
        cardTypes: ['STANDART', 'PREMIUM', 'ECO', 'LUXURY']
      });
    }

    const created = await prisma.productVariant.create({
      data: {
        parentId,
        variantName,
        cardType: cardType || null,
        currentStock,
        currentUnits,
        pricePerBag,
        active: true,
      },
      include: { parent: { select: { name: true, bagType: true } } },
    });

    // Preserve original flattened response shape (parentName / parentBagType)
    const { parent, ...pv } = created;
    res.status(201).json({
      ...pv,
      parentName: parent?.name ?? null,
      parentBagType: parent?.bagType ?? null,
    });
  } catch (error) {
    console.error('Error creating product variant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mahsulot variantini yangilash
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { variantName, cardType, pricePerBag, currentStock, currentUnits, active } = req.body;

    const variant = await prisma.productVariant.update({
      where: { id },
      data: {
        variantName,
        cardType,
        pricePerBag,
        currentStock,
        currentUnits,
        active
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            bagType: true
          }
        }
      }
    });

    res.json(variant);
  } catch (error) {
    console.error('Error updating product variant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mahsulot variantini o'chirish
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.productVariant.delete({
      where: { id }
    });

    res.json({ message: 'Product variant deleted successfully' });
  } catch (error) {
    console.error('Error deleting product variant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 15g preform uchun kart turlarini olish
router.get('/card-types', authenticateToken, async (req, res) => {
  try {
    const cardTypes = [
      { value: 'STANDART', label: 'Standart', description: 'Oddiy kart qadoq' },
      { value: 'PREMIUM', label: 'Premium', description: 'Sifatli kart qadoq' },
      { value: 'ECO', label: 'Ekologik', description: 'Ekologik toza kart' },
      { value: 'LUXURY', label: 'Luxury', description: 'Hashamatli kart qadoq' }
    ];

    res.json(cardTypes);
  } catch (error) {
    console.error('Error fetching card types:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
