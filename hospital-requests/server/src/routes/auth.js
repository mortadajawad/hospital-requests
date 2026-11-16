import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  const ok = user && user.active && (await bcrypt.compare(password, user.passwordHash));
  if (!ok) return res.status(401).json({ error: 'Wrong email or password' });

  const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, departmentId: user.departmentId },
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['REQUESTER', 'STAFF', 'ADMIN']),
  departmentId: z.number().int().optional(),
});

// Admin creates accounts (no public sign-up)
router.post('/users', authenticate, requireRole('ADMIN'), async (req, res) => {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });

  const { password, email, ...rest } = parsed.data;
  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) return res.status(409).json({ error: 'Email already in use' });

  const user = await prisma.user.create({
    data: { ...rest, email: email.toLowerCase(), passwordHash: await bcrypt.hash(password, 12) },
    select: { id: true, name: true, email: true, role: true, departmentId: true },
  });
  res.status(201).json({ user });
});

export default router;
