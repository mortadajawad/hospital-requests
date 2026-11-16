import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requestScope, canHandle, canView } from '../lib/access.js';

const router = Router();
router.use(authenticate);

const isStaff = (user) => user.role === 'STAFF' || user.role === 'ADMIN';

const listInclude = {
  requester: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
};

// ---------- Create a request ----------
const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3).max(5000),
  categoryId: z.number().int(),
  departmentId: z.number().int().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  dueDate: z.string().datetime().optional(),
});

router.post('/', async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const data = parsed.data;
  const departmentId = data.departmentId ?? req.user.departmentId;
  if (!departmentId) return res.status(400).json({ error: 'A department is required' });

  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.request.create({
      data: {
        title: data.title,
        description: data.description,
        priority: data.priority,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        categoryId: data.categoryId,
        departmentId,
        requesterId: req.user.id,
      },
      include: listInclude,
    });
    await tx.activityLog.create({
      data: { action: 'CREATED', requestId: created.id, userId: req.user.id },
    });
    // Notify admins and the staff who handle this category
    const staff = await tx.user.findMany({
      where: {
        active: true,
        OR: [{ role: 'ADMIN' }, { role: 'STAFF', handledCategories: { some: { id: data.categoryId } } }],
      },
      select: { id: true },
    });
    await tx.notification.createMany({
      data: staff.map((s) => ({ userId: s.id, message: `New request #${created.id}: ${created.title}` })),
    });
    return created;
  });

  res.status(201).json({ request });
});

// ---------- List requests (with filters) ----------
const listSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  departmentId: z.coerce.number().int().optional(),
  categoryId: z.coerce.number().int().optional(),
  assigneeId: z.coerce.number().int().optional(),
  mine: z.enum(['true', 'false']).optional(), // staff: only requests assigned to me
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

router.get('/', async (req, res) => {
  const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid filters' });
  const f = parsed.data;

  const where = {
    ...(f.status && { status: f.status }),
    ...(f.priority && { priority: f.priority }),
    ...(f.departmentId && { departmentId: f.departmentId }),
    ...(f.categoryId && { categoryId: f.categoryId }),
    ...(f.assigneeId && { assigneeId: f.assigneeId }),
    ...(f.q && {
      OR: [
        { title: { contains: f.q, mode: 'insensitive' } },
        { description: { contains: f.q, mode: 'insensitive' } },
      ],
    }),
  };
  where.AND = [requestScope(req.user)]; // each person only sees what they are allowed to
  if (isStaff(req.user) && f.mine === 'true') where.assigneeId = req.user.id;

  const [items, total] = await Promise.all([
    prisma.request.findMany({
      where,
      include: listInclude,
      orderBy: { createdAt: 'desc' },
      skip: (f.page - 1) * f.pageSize,
      take: f.pageSize,
    }),
    prisma.request.count({ where }),
  ]);

  res.json({ items, total, page: f.page, pageSize: f.pageSize });
});

// ---------- One request ----------
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });

  const staff = isStaff(req.user);
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      ...listInclude,
      comments: {
        include: { author: { select: { id: true, name: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
      activity: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!request || !canView(req.user, request)) {
    return res.status(404).json({ error: 'Request not found' });
  }
  if (!canHandle(req.user, request)) request.comments = request.comments.filter((c) => !c.internal);
  res.json({ request });
});

// ---------- Update status / priority / assignee / due date (staff only) ----------
const updateSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.number().int().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
});

router.patch('/:id', requireRole('STAFF', 'ADMIN'), async (req, res) => {
  const id = Number(req.params.id);
  const parsed = updateSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing || !canHandle(req.user, existing)) return res.status(404).json({ error: 'Request not found' });

  const u = parsed.data;
  const data = {};
  const changes = {};

  if (u.status && u.status !== existing.status) {
    data.status = u.status;
    changes.status = [existing.status, u.status];
    const closing = u.status === 'DONE' || u.status === 'CANCELLED';
    data.closedAt = closing ? new Date() : null;
    if (!existing.firstResponseAt) data.firstResponseAt = new Date();
  }
  if (u.priority && u.priority !== existing.priority) {
    data.priority = u.priority;
    changes.priority = [existing.priority, u.priority];
  }
  if (u.assigneeId !== undefined && u.assigneeId !== existing.assigneeId) {
    if (u.assigneeId !== null) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: u.assigneeId,
          active: true,
          OR: [{ role: 'ADMIN' }, { role: 'STAFF', handledCategories: { some: { id: existing.categoryId } } }],
        },
      });
      if (!assignee) return res.status(400).json({ error: 'Assignee must be an active staff member who handles this category' });
    }
    data.assigneeId = u.assigneeId;
    changes.assigneeId = [existing.assigneeId, u.assigneeId];
    if (!existing.firstResponseAt) data.firstResponseAt = new Date();
  }
  if (u.dueDate !== undefined) {
    data.dueDate = u.dueDate ? new Date(u.dueDate) : null;
    changes.dueDate = [existing.dueDate, data.dueDate];
  }

  if (Object.keys(changes).length === 0) return res.json({ request: existing });

  const request = await prisma.$transaction(async (tx) => {
    const updated = await tx.request.update({ where: { id }, data, include: listInclude });
    await tx.activityLog.create({
      data: { action: 'UPDATED', details: changes, requestId: id, userId: req.user.id },
    });
    if (changes.status) {
      await tx.notification.create({
        data: { userId: existing.requesterId, message: `Request #${id} is now ${updated.status.replace('_', ' ')}` },
      });
    }
    if (changes.assigneeId && u.assigneeId && u.assigneeId !== req.user.id) {
      await tx.notification.create({
        data: { userId: u.assigneeId, message: `Request #${id} was assigned to you: ${updated.title}` },
      });
    }
    return updated;
  });

  res.json({ request });
});

// ---------- Add a comment ----------
const commentSchema = z.object({
  text: z.string().min(1).max(3000),
  internal: z.boolean().default(false),
});

router.post('/:id/comments', async (req, res) => {
  const id = Number(req.params.id);
  const parsed = commentSchema.safeParse(req.body);
  if (!Number.isInteger(id) || !parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const existing = await prisma.request.findUnique({ where: { id } });
  if (!existing || !canView(req.user, existing)) {
    return res.status(404).json({ error: 'Request not found' });
  }
  const staff = canHandle(req.user, existing);

  const internal = staff ? parsed.data.internal : false; // requesters can never write internal notes

  const comment = await prisma.$transaction(async (tx) => {
    const created = await tx.comment.create({
      data: { text: parsed.data.text, internal, requestId: id, authorId: req.user.id },
      include: { author: { select: { id: true, name: true, role: true } } },
    });
    if (staff && !existing.firstResponseAt && !internal) {
      await tx.request.update({ where: { id }, data: { firstResponseAt: new Date() } });
    }
    await tx.activityLog.create({
      data: { action: internal ? 'INTERNAL_NOTE' : 'COMMENTED', requestId: id, userId: req.user.id },
    });
    // Notify the other side
    if (!internal) {
      const targetId = staff ? existing.requesterId : existing.assigneeId;
      if (targetId && targetId !== req.user.id) {
        await tx.notification.create({
          data: { userId: targetId, message: `New comment on request #${id}` },
        });
      }
    }
    return created;
  });

  res.status(201).json({ comment });
});

export default router;
