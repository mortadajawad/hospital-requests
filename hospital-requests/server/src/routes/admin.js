import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// ---------- Users ----------
const userSelect = {
  id: true, name: true, email: true, role: true, active: true, departmentId: true,
  department: { select: { id: true, name: true } },
  handledCategories: { select: { id: true, name: true } },
};

router.get('/users', async (_req, res) => {
  const users = await prisma.user.findMany({ select: userSelect, orderBy: { name: 'asc' } });
  res.json({ users });
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['REQUESTER', 'STAFF', 'ADMIN']).optional(),
  departmentId: z.number().int().nullable().optional(),
  active: z.boolean().optional(),
  password: z.string().min(8).optional(), // reset password
  categoryIds: z.array(z.number().int()).optional(), // categories a staff member handles
});

router.patch('/users/:id', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateUserSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { password, categoryIds, ...rest } = parsed.data;
  if (id === req.user.id && (rest.active === false || (rest.role && rest.role !== 'ADMIN'))) {
    return res.status(400).json({ error: 'You cannot deactivate or demote your own account' });
  }

  const data = {
    ...rest,
    ...(password && { passwordHash: await bcrypt.hash(password, 12) }),
    ...(categoryIds && { handledCategories: { set: categoryIds.map((cid) => ({ id: cid })) } }),
  };
  try {
    const user = await prisma.user.update({ where: { id }, data, select: userSelect });
    res.json({ user });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

// ---------- Departments and categories (same rules for both) ----------
const nameSchema = z.object({ name: z.string().min(2).max(80) });

function lookupRoutes(path, model, usedBy) {
  router.post(`/${path}`, async (req, res) => {
    const parsed = nameSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid name' });
    try {
      res.status(201).json({ item: await prisma[model].create({ data: parsed.data }) });
    } catch {
      res.status(409).json({ error: 'That name already exists' });
    }
  });

  router.patch(`/${path}/:id`, async (req, res) => {
    const parsed = nameSchema.safeParse(req.body);
    const id = Number(req.params.id);
    if (!parsed.success || !Number.isInteger(id)) return res.status(400).json({ error: 'Invalid input' });
    try {
      res.json({ item: await prisma[model].update({ where: { id }, data: parsed.data }) });
    } catch {
      res.status(409).json({ error: 'Name already exists or item not found' });
    }
  });

  router.delete(`/${path}/:id`, async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
    const inUse = await prisma.request.count({ where: { [usedBy]: id } });
    const users = model === 'department' ? await prisma.user.count({ where: { departmentId: id } }) : 0;
    if (inUse > 0 || users > 0) {
      return res.status(409).json({ error: 'Cannot delete: it is used by existing requests or users' });
    }
    try {
      await prisma[model].delete({ where: { id } });
      res.json({ ok: true });
    } catch {
      res.status(404).json({ error: 'Not found' });
    }
  });
}

lookupRoutes('departments', 'department', 'departmentId');
lookupRoutes('categories', 'category', 'categoryId');

export default router;
