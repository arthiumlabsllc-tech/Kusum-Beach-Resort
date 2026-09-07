import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { category, status, search, lowStock } = req.query;

    const where: any = {};

    if (category) {
      where.categoryId = parseInt(category as string, 10);
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.name = { contains: search as string, mode: 'insensitive' };
    }

    if (lowStock === 'true') {
      where.stockQuantity = { lte: prisma.product.fields?.reorderLevel ?? undefined };
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        category: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await prisma.product.create({
      data: req.body,
      include: { category: true },
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: req.body,
      include: { category: true },
    });

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.product.update({
      where: { id: parseInt(id, 10) },
      data: { status: 'discontinued' },
    });

    res.json({ message: 'Product discontinued successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const adjustStock = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantityChange, movementType, notes } = req.body;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newQuantity = product.stockQuantity + quantityChange;

    if (newQuantity < 0) {
      res.status(400).json({ error: 'Insufficient stock' });
      return;
    }

    // Update product stock and create movement record in a transaction
    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newQuantity,
          status: newQuantity === 0 ? 'out_of_stock' : 'active',
        },
        include: { category: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          quantityChange,
          movementType,
          notes,
          previousQuantity: product.stockQuantity,
          newQuantity,
          createdById: req.user!.id,
        },
      }),
    ]);

    res.json({ product: updatedProduct, movement });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLowStockProducts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'active',
      },
      include: { category: true },
    });

    const lowStockProducts = products.filter((p) => p.stockQuantity <= p.reorderLevel);

    res.json(lowStockProducts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getCategories = async (_req: Request, res: Response): Promise<void> => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStockMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId } = req.query;

    const where: any = {};

    if (productId) {
      where.productId = parseInt(productId as string, 10);
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        createdBy: {
          select: { fullName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    res.json(movements);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
