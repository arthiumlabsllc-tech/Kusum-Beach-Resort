import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getAllSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany({ orderBy: { settingKey: 'asc' } });
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.settingKey] = s.settingValue || '';
    }
    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSettingByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { settingKey: req.params.key },
    });
    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }
    res.json({ key: setting.settingKey, value: setting.settingValue, description: setting.description });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { value } = req.body;
    const setting = await prisma.systemSetting.update({
      where: { settingKey: req.params.key },
      data: { settingValue: value, updatedById: req.user!.id },
    });
    res.json({ key: setting.settingKey, value: setting.settingValue });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSetting = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { key, value, description } = req.body;
    const setting = await prisma.systemSetting.create({
      data: { settingKey: key, settingValue: value, description, updatedById: req.user!.id },
    });
    res.status(201).json(setting);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
