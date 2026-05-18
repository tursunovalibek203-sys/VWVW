import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { generateSuperManagerReport } from '../ai/super-manager';

const router = Router();

router.use(authenticate);

// Super AI Manager hisoboti
router.get('/report', async (req, res) => {
  try {
    console.log('🤖 Super AI Manager hisoboti so\'ralmoqda...');
    const report = await generateSuperManagerReport();
    res.json(report);
  } catch (error) {
    console.error('Super Manager error:', error);
    res.status(500).json({ error: 'Hisobotni yaratishda xatolik' });
  }
});

export default router;
