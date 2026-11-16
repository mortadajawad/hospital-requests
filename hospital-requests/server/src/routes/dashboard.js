import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requestScope } from '../lib/access.js';

const router = Router();
router.use(authenticate, requireRole('STAFF', 'ADMIN'));

const OPEN = { status: { notIn: ['DONE', 'CANCELLED'] } };
const listInclude = {
  requester: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

router.get('/', async (req, res) => {
  const scope = requestScope(req.user);
  const activityWhere = req.user.role === 'ADMIN' ? {} : { request: { is: scope } };
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [newCount, inProgress, waiting, overdue, urgent, unassignedCount, createdToday, closedToday, myTasks, unassigned, recent] =
    await Promise.all([
      prisma.request.count({ where: { status: 'NEW', ...scope } }),
      prisma.request.count({ where: { status: 'IN_PROGRESS', ...scope } }),
      prisma.request.count({ where: { status: 'WAITING', ...scope } }),
      prisma.request.count({ where: { ...OPEN, dueDate: { lt: now }, ...scope } }),
      prisma.request.count({ where: { ...OPEN, priority: 'URGENT', ...scope } }),
      prisma.request.count({ where: { ...OPEN, assigneeId: null, ...scope } }),
      prisma.request.count({ where: { createdAt: { gte: startOfToday }, ...scope } }),
      prisma.request.count({ where: { closedAt: { gte: startOfToday }, ...scope } }),
      prisma.request.findMany({
        where: { ...OPEN, assigneeId: req.user.id, ...scope },
        include: listInclude,
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 8,
      }),
      prisma.request.findMany({
        where: { ...OPEN, assigneeId: null, ...scope },
        include: listInclude,
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: 5,
      }),
      prisma.activityLog.findMany({
        where: activityWhere,
        include: {
          user: { select: { id: true, name: true } },
          request: { select: { id: true, title: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

  res.json({
    counts: { new: newCount, inProgress, waiting, overdue, urgent, unassigned: unassignedCount, createdToday, closedToday },
    myTasks,
    unassigned,
    recent,
  });
});

export default router;
