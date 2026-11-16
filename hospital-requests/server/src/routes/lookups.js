import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

// Data for dropdowns in the forms
router.get('/', async (req, res) => {
  const [departments, categories, staff] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    req.user.role === 'REQUESTER'
      ? []
      : prisma.user.findMany({
          where: { active: true, role: { in: ['STAFF', 'ADMIN'] } },
          select: { id: true, name: true, role: true, handledCategories: { select: { id: true } } },
          orderBy: { name: 'asc' },
        }),
  ]);
  res.json({
    departments,
    categories,
    staff: staff.map((s) => ({ id: s.id, name: s.name, role: s.role, categoryIds: s.handledCategories.map((c) => c.id) })),
  });
});

export default router;
