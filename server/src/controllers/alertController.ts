import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getActiveAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.alertLog.findMany({
      where: { isAcknowledged: false },
      include: { product: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acknowledgeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.alertLog.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { isAcknowledged: true, acknowledgedAt: new Date(), acknowledgedById: req.user!.id },
    });
    res.json({ message: 'Alert acknowledged' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAlertLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '50' } = req.query;
    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    const [logs, total] = await Promise.all([
      prisma.alertLog.findMany({
        include: { product: true, acknowledgedBy: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string, 10),
      }),
      prisma.alertLog.count(),
    ]);

    res.json({ data: logs, pagination: { total, page: parseInt(page as string, 10), limit: parseInt(limit as string, 10) } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addAlertRecipient = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, recipientType, contactValue } = req.body;
    const recipient = await prisma.alertRecipient.create({
      data: { userId, recipientType, contactValue },
    });
    res.status(201).json(recipient);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAlertRecipients = async (_req: Request, res: Response): Promise<void> => {
  try {
    const recipients = await prisma.alertRecipient.findMany({
      include: { user: { select: { fullName: true, username: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(recipients);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeAlertRecipient = async (req: Request, res: Response): Promise<void> => {
  try {
    await prisma.alertRecipient.delete({ where: { id: parseInt(req.params.id, 10) } });
    res.json({ message: 'Recipient removed' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const sendTestAlert = async (_req: Request, res: Response): Promise<void> => {
  try {
    // In production, this would actually send SMS/email
    const recipients = await prisma.alertRecipient.findMany({ where: { isActive: true } });
    res.json({
      message: `Test alert sent to ${recipients.length} recipients`,
      recipients: recipients.map((r) => ({ type: r.recipientType, contact: r.contactValue })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
