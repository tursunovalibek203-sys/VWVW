import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Export all data
router.get('/export', authenticate, async (req: AuthRequest, res) => {
  try {
    // Only admins can export data
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    const data = {
      exportDate: new Date().toISOString(),
      version: '1.0',
      data: {
        users: await prisma.user.findMany({
          select: {
            id: true,
            login: true,
            name: true,
            role: true,
            active: true,
            createdAt: true,
            updatedAt: true,
            // ✅ password excluded
          }
        }),
        customers: await prisma.customer.findMany(),
        products: await prisma.product.findMany(),
        sales: await prisma.sale.findMany(),
        expenses: await prisma.expense.findMany(),
        rawMaterials: await prisma.rawMaterial.findMany(),
        suppliers: await prisma.supplier.findMany(),
        qualityChecks: await prisma.qualityCheck.findMany(),
        tasks: await prisma.task.findMany(),
        cashierShifts: await prisma.cashierShift.findMany(),
        systemSettings: await prisma.systemSettings.findMany(),
        notifications: await prisma.notification.findMany(),
        auditLogs: await prisma.auditLog.findMany(),
      },
    };

    res.json(data);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Eksport qilishda xatolik' });
  }
});

// Import data
router.post('/import', authenticate, async (req: any, res) => {
  try {
    // Only admins can import data
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Ruxsat yo\'q' });
    }

    const { data } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'Ma\'lumotlar topilmadi' });
    }

    // Use transaction to ensure data integrity
    await prisma.$transaction(async (tx) => {
      // Delete existing data (in reverse order of dependencies)
      await tx.auditLog.deleteMany();
      await tx.notification.deleteMany();
      await tx.qualityCheck.deleteMany();
      await tx.task.deleteMany();
      await tx.cashierShift.deleteMany();
      await tx.sale.deleteMany();
      await tx.expense.deleteMany();
      await tx.rawMaterial.deleteMany();
      await tx.supplier.deleteMany();
      await tx.product.deleteMany();
      await tx.customer.deleteMany();
      await tx.systemSettings.deleteMany();
      // Don't delete users to preserve login access

      // Import new data
      if (data.systemSettings?.length) {
        await tx.systemSettings.createMany({ data: data.systemSettings });
      }
      if (data.customers?.length) {
        await tx.customer.createMany({ data: data.customers });
      }
      if (data.products?.length) {
        await tx.product.createMany({ data: data.products });
      }
      if (data.suppliers?.length) {
        await tx.supplier.createMany({ data: data.suppliers });
      }
      if (data.rawMaterials?.length) {
        await tx.rawMaterial.createMany({ data: data.rawMaterials });
      }
      if (data.expenses?.length) {
        await tx.expense.createMany({ data: data.expenses });
      }
      if (data.sales?.length) {
        await tx.sale.createMany({ data: data.sales });
      }
      if (data.cashierShifts?.length) {
        await tx.cashierShift.createMany({ data: data.cashierShifts });
      }
      if (data.tasks?.length) {
        await tx.task.createMany({ data: data.tasks });
      }
      if (data.qualityChecks?.length) {
        await tx.qualityCheck.createMany({ data: data.qualityChecks });
      }
      if (data.notifications?.length) {
        await tx.notification.createMany({ data: data.notifications });
      }
      if (data.auditLogs?.length) {
        await tx.auditLog.createMany({ data: data.auditLogs });
      }
    });

    res.json({ message: 'Ma\'lumotlar muvaffaqiyatli import qilindi' });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Import qilishda xatolik' });
  }
});

export default router;
