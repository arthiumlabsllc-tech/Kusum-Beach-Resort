import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getAllCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategoryById = async (req: Request, res: Response): Promise<void> => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { products: true },
    });
    if (!category) {
      res.status(404).json({ error: 'Category not found' });
      return;
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    const category = await prisma.category.create({
      data: { name, description, icon },
    });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;
    const category = await prisma.category.update({
      where: { id: parseInt(req.params.id, 10) },
      data: { name, description, icon },
    });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if category has products
    const productCount = await prisma.product.count({
      where: { categoryId: parseInt(req.params.id, 10) },
    });
    if (productCount > 0) {
      res.status(400).json({ error: 'Cannot delete category with existing products' });
      return;
    }
    await prisma.category.delete({
      where: { id: parseInt(req.params.id, 10) },
    });
    res.json({ message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
