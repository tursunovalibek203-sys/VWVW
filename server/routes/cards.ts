import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Barcha kartlarni olish
router.get('/', authenticate, async (req, res) => {
  try {
    const rows = await prisma.card.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        cardProducts: { where: { active: true }, select: { id: true } },
      },
    });

    // Preserve original response shape: card fields + productCount
    const cards = rows.map(({ cardProducts, ...card }) => ({
      ...card,
      productCount: cardProducts.length,
    }));

    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Yangi kart yaratish
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, price } = req.body;

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
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }

    // Sanitize input
    const sanitizedName = name.trim();
    const sanitizedDescription = description ? description.trim() : null;

    // Kart nomini tekshirish - use Prisma ORM
    const existingCard = await prisma.card.findFirst({
      where: { name: sanitizedName }
    });

    if (existingCard) {
      return res.status(400).json({ error: 'Card with this name already exists' });
    }

    const card = await prisma.card.create({
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        price: price || 0,
        active: true
      }
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kartni yangilash
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, active } = req.body;

    // Input validation
    if (name && (typeof name !== 'string' || name.trim().length === 0 || name.length > 100)) {
      return res.status(400).json({ error: 'Name must be a non-empty string with max 100 characters' });
    }
    if (description && typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }
    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return res.status(400).json({ error: 'Price must be a non-negative number' });
    }
    if (active !== undefined && typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Active must be a boolean' });
    }

    // Check if card exists
    const existingCard = await prisma.card.findUnique({ where: { id } });
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Sanitize input
    const sanitizedName = name ? name.trim() : undefined;
    const sanitizedDescription = description ? description.trim() : undefined;

    const card = await prisma.card.update({
      where: { id },
      data: {
        name: sanitizedName,
        description: sanitizedDescription,
        price,
        active
      }
    });

    res.json(card);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kartni o'chirish (deactivate)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if card exists
    const existingCard = await prisma.card.findUnique({ where: { id } });
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await prisma.card.update({
      where: { id },
      data: { active: false }
    });

    res.json({ message: 'Card deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kartga mahsulot qo'shish
router.post('/:id/products', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, quantity } = req.body;

    // Input validation
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'Product ID is required and must be a string' });
    }
    if (quantity !== undefined && (typeof quantity !== 'number' || quantity < 1)) {
      return res.status(400).json({ error: 'Quantity must be a positive number' });
    }

    // Mahsulot va kartni tekshirish - use Prisma ORM
    const [card, product] = await Promise.all([
      prisma.card.findUnique({ where: { id } }),
      prisma.product.findUnique({ where: { id: productId } })
    ]);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Avvaldan qo'shilganligini tekshirish - use Prisma ORM
    const existingCardProduct = await prisma.cardProduct.findFirst({
      where: { cardId: id, productId: productId }
    });

    if (existingCardProduct) {
      return res.status(400).json({ error: 'Product already added to this card' });
    }

    // Use Prisma ORM to create
    const cardProduct = await prisma.cardProduct.create({
      data: {
        cardId: id,
        productId: productId,
        quantity: quantity || 1,
        active: true
      },
      include: {
        product: {
          select: { name: true, pricePerBag: true }
        }
      }
    });

    // Format response
    const response = {
      ...cardProduct,
      productName: cardProduct.product.name,
      pricePerBag: cardProduct.product.pricePerBag
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error adding product to card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kartdan mahsulotni olib tashlash
router.delete('/:id/products/:productId', authenticate, async (req, res) => {
  try {
    const { id, productId } = req.params;

    // Input validation
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Card ID is required' });
    }
    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Use Prisma ORM to delete
    await prisma.cardProduct.deleteMany({
      where: { cardId: id, productId: productId }
    });

    res.json({ message: 'Product removed from card successfully' });
  } catch (error) {
    console.error('Error removing product from card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
