import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { requestScope, sqlScope } from '../lib/access.js';

const router = Router();
router.use(authenticate, requireRole('STAFF', 'ADMIN'));

const TZ = process.env.TIMEZONE || 'Asia/Beirut'; // used for "per day" and "peak hour" grouping
const RANGES = { 7: 'day', 30: 'day', 90: 'week', 365: 'month' };

function parseDays(q) {
  const d = Number(q);
  return RANGES[d] ? d : 30;
}

// Local-time expression for a timestamp column (Prisma stores UTC without time zone)
const local = (col) => `(${col} AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}'`;

router.get('/', async (req, res) => {
  const days = parseDays(req.query.days);
  const unit = RANGES[days];
  const now = new Date();
  const since = new Date(now.getTime() - days * 86400000);
  const scope = requestScope(req.user);
  const scopeSql = sqlScope(req.user);
  const inRange = { createdAt: { gte: since }, ...scope };

  const [byStatus, byDept, byCat, depts, cats, times, deadlines, createdTrend, closedTrend, byHour, byWeekday] = await Promise.all([
    prisma.request.groupBy({ by: ['status'], where: inRange, _count: true }),
    prisma.request.groupBy({ by: ['departmentId'], where: inRange, _count: true }),
    prisma.request.groupBy({ by: ['categoryId'], where: inRange, _count: true }),
    prisma.department.findMany(),
    prisma.category.findMany(),
    prisma.$queryRawUnsafe(`
      SELECT
        (AVG(EXTRACT(EPOCH FROM ("firstResponseAt" - "createdAt"))) FILTER (WHERE "firstResponseAt" IS NOT NULL) / 3600)::float8 AS response_hours,
        (AVG(EXTRACT(EPOCH FROM ("closedAt" - "createdAt"))) FILTER (WHERE "status" = 'DONE' AND "closedAt" IS NOT NULL) / 3600)::float8 AS resolution_hours
      FROM "Request" WHERE "createdAt" >= $1 AND ${scopeSql}`, since),
    prisma.$queryRawUnsafe(`
      SELECT
        COUNT(*) FILTER (WHERE "dueDate" IS NOT NULL)::int AS with_deadline,
        COUNT(*) FILTER (WHERE "dueDate" IS NOT NULL AND "status" <> 'CANCELLED' AND (
          ("closedAt" IS NOT NULL AND "closedAt" > "dueDate") OR ("closedAt" IS NULL AND "dueDate" < $2)
        ))::int AS late
      FROM "Request" WHERE "createdAt" >= $1 AND ${scopeSql}`, since, now),
    prisma.$queryRawUnsafe(
      `SELECT date_trunc('${unit}', ${local('"createdAt"')}) AS bucket, COUNT(*)::int AS count FROM "Request" WHERE "createdAt" >= $1 AND ${scopeSql} GROUP BY 1 ORDER BY 1`, since),
    prisma.$queryRawUnsafe(
      `SELECT date_trunc('${unit}', ${local('"closedAt"')}) AS bucket, COUNT(*)::int AS count FROM "Request" WHERE "closedAt" >= $1 AND "status" = 'DONE' AND ${scopeSql} GROUP BY 1 ORDER BY 1`, since),
    prisma.$queryRawUnsafe(
      `SELECT EXTRACT(HOUR FROM ${local('"createdAt"')})::int AS k, COUNT(*)::int AS count FROM "Request" WHERE "createdAt" >= $1 AND ${scopeSql} GROUP BY 1`, since),
    prisma.$queryRawUnsafe(
      `SELECT EXTRACT(DOW FROM ${local('"createdAt"')})::int AS k, COUNT(*)::int AS count FROM "Request" WHERE "createdAt" >= $1 AND ${scopeSql} GROUP BY 1`, since),
  ]);

  const count = (s) => byStatus.find((x) => x.status === s)?._count ?? 0;
  const total = byStatus.reduce((n, x) => n + x._count, 0);
  const named = (rows, key, list) =>
    rows.map((r) => ({ label: list.find((l) => l.id === r[key])?.name ?? '?', value: r._count })).sort((a, b) => b.value - a.value);

  // Trend: fill empty days with zero so the chart has no gaps
  const keyOf = (d) => new Date(d).toISOString().slice(0, 10);
  const cMap = new Map(createdTrend.map((r) => [keyOf(r.bucket), r.count]));
  const dMap = new Map(closedTrend.map((r) => [keyOf(r.bucket), r.count]));
  let keys;
  if (unit === 'day') {
    const today = new Date(now.toLocaleDateString('en-CA', { timeZone: TZ }) + 'T00:00:00Z');
    keys = Array.from({ length: days }, (_, i) => new Date(today.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
  } else {
    keys = [...new Set([...cMap.keys(), ...dMap.keys()])].sort();
  }
  const trend = keys.map((k) => ({ label: k, created: cMap.get(k) ?? 0, closed: dMap.get(k) ?? 0 }));

  const hourMap = new Map(byHour.map((r) => [r.k, r.count]));
  const dayMap = new Map(byWeekday.map((r) => [r.k, r.count]));
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  res.json({
    days,
    unit,
    summary: {
      total,
      done: count('DONE'),
      cancelled: count('CANCELLED'),
      open: total - count('DONE') - count('CANCELLED'),
      avgResponseHours: times[0]?.response_hours ?? null,
      avgResolutionHours: times[0]?.resolution_hours ?? null,
      withDeadline: deadlines[0]?.with_deadline ?? 0,
      late: deadlines[0]?.late ?? 0,
    },
    byStatus: byStatus.map((x) => ({ label: x.status, value: x._count })),
    byDepartment: named(byDept, 'departmentId', depts),
    byCategory: named(byCat, 'categoryId', cats),
    trend,
    byHour: Array.from({ length: 24 }, (_, h) => ({ label: String(h), value: hourMap.get(h) ?? 0 })),
    byWeekday: weekdays.map((label, i) => ({ label, value: dayMap.get(i) ?? 0 })),
  });
});

// Download as CSV (opens in Excel)
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const fmt = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 16) : '');

router.get('/export', async (req, res) => {
  const days = parseDays(req.query.days);
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.request.findMany({
    where: { createdAt: { gte: since }, ...requestScope(req.user) },
    include: {
      department: { select: { name: true } },
      category: { select: { name: true } },
      requester: { select: { name: true } },
      assignee: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = ['ID', 'Title', 'Department', 'Category', 'Priority', 'Status', 'Requester', 'Assignee', 'Created (UTC)', 'First response (UTC)', 'Due (UTC)', 'Closed (UTC)'];
  const lines = rows.map((r) =>
    [r.id, r.title, r.department.name, r.category.name, r.priority, r.status, r.requester.name, r.assignee?.name, fmt(r.createdAt), fmt(r.firstResponseAt), fmt(r.dueDate), fmt(r.closedAt)].map(csvCell).join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="requests-last-${days}-days.csv"`);
  res.send('\uFEFF' + [header.map(csvCell).join(','), ...lines].join('\r\n'));
});

export default router;
