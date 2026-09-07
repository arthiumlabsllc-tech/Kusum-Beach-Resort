import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getAllUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, fullName: true, phone: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, fullName, phone, email, role } = req.body;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      res.status(400).json({ error: 'Username already exists' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash, fullName, phone, email, role },
      select: { id: true, username: true, fullName: true, role: true, phone: true, email: true },
    });
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, phone, email, role, isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { fullName, phone, email, role, isActive },
      select: { id: true, username: true, fullName: true, role: true, phone: true, email: true, isActive: true },
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.user.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { isActive: false },
    });
    res.json({ message: 'User deactivated' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, fullName: true, phone: true, email: true, role: true, lastLogin: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getShifts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, startDate, endDate } = req.query;
    const where: any = {};
    if (userId) where.userId = parseInt(userId as string, 10);
    if (startDate || endDate) {
      where.shiftDate = {};
      if (startDate) where.shiftDate.gte = new Date(startDate as string);
      if (endDate) where.shiftDate.lte = new Date(endDate as string);
    }
    const shifts = await prisma.shift.findMany({
      where,
      include: { user: { select: { fullName: true, username: true } }, createdBy: { select: { fullName: true } } },
      orderBy: { shiftDate: 'desc' },
    });
    res.json(shifts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createShift = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, shiftDate, startTime, endTime, notes } = req.body;
    const shift = await prisma.shift.create({
      data: { userId, shiftDate: new Date(shiftDate), startTime: new Date(`1970-01-01T${startTime}`), endTime: new Date(`1970-01-01T${endTime}`), notes, createdById: req.user!.id },
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateShift = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;
    if (status === 'in_progress') data.actualStart = new Date();
    if (status === 'completed') data.actualEnd = new Date();
    const shift = await prisma.shift.update({ where: { id: parseInt(req.params.id, 10) }, data });
    res.json(shift);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clockIn = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const existingShift = await prisma.shift.findFirst({
      where: { userId: req.user!.id, shiftDate: today, status: { in: ['scheduled', 'in_progress'] } },
    });
    if (existingShift?.status === 'in_progress') {
      res.status(400).json({ error: 'Already clocked in' });
      return;
    }
    if (existingShift) {
      const updated = await prisma.shift.update({
        where: { id: existingShift.id },
        data: { status: 'in_progress', actualStart: new Date() },
      });
      res.json(updated);
    } else {
      const shift = await prisma.shift.create({
        data: {
          userId: req.user!.id,
          shiftDate: today,
          startTime: new Date(),
          endTime: new Date(new Date().getTime() + 8 * 60 * 60 * 1000),
          status: 'in_progress',
          actualStart: new Date(),
          createdById: req.user!.id,
        },
      });
      res.json(shift);
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const clockOut = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shift = await prisma.shift.findFirst({
      where: { userId: req.user!.id, shiftDate: today, status: 'in_progress' },
    });
    if (!shift) {
      res.status(400).json({ error: 'No active shift found' });
      return;
    }
    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: { status: 'completed', actualEnd: new Date() },
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
