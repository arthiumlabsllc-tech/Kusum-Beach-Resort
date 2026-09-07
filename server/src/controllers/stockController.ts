import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

export const getStockMovements = async (req: Request, res: Response): Promise<void> => {
  try {
    const { productId, movementType, startDate, endDate, page = '1', limit = '50' } = req.query;
    const where: any = {};

    if (productId) where.productId = parseInt(productId as string, 10);
    if (movementType) where.movementType = movementType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const skip = (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10);

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { include: { category: true } },
          createdBy: { select: { fullName: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit as string, 10),
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({
      data: movements,
      pagination: {
        total,
        page: parseInt(page as string, 10),
        limit: parseInt(limit as string, 10),
        totalPages: Math.ceil(total / parseInt(limit as string, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const recordAdjustment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantityChange, notes } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newQuantity = product.stockQuantity + quantityChange;
    if (newQuantity < 0) {
      res.status(400).json({ error: 'Insufficient stock' });
      return;
    }

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
          movementType: 'adjustment',
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

export const recordArrival = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, reference, notes } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newQuantity = product.stockQuantity + quantity;

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: {
          stockQuantity: newQuantity,
          status: 'active',
        },
        include: { category: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          quantityChange: quantity,
          movementType: 'arrival',
          reference,
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

export const recordWastage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity, notes } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    const newQuantity = product.stockQuantity - quantity;
    if (newQuantity < 0) {
      res.status(400).json({ error: 'Insufficient stock for wastage' });
      return;
    }

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
          quantityChange: -quantity,
          movementType: 'wastage',
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

export const getStockValuation = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
    });

    const totalCostValue = products.reduce(
      (sum, p) => sum + p.buyingPrice.toNumber() * p.stockQuantity,
      0
    );
    const totalRetailValue = products.reduce(
      (sum, p) => sum + p.sellingPrice.toNumber() * p.stockQuantity,
      0
    );

    const byCategory = new Map<string, { count: number; costValue: number; retailValue: number; items: number }>();
    for (const p of products) {
      const existing = byCategory.get(p.category.name) || { count: 0, costValue: 0, retailValue: 0, items: 0 };
      existing.count++;
      existing.costValue += p.buyingPrice.toNumber() * p.stockQuantity;
      existing.retailValue += p.sellingPrice.toNumber() * p.stockQuantity;
      existing.items += p.stockQuantity;
      byCategory.set(p.category.name, existing);
    }

    res.json({
      totalCostValue,
      totalRetailValue,
      potentialProfit: totalRetailValue - totalCostValue,
      totalProducts: products.length,
      byCategory: Object.fromEntries(byCategory),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLowStockReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { status: 'active' },
      include: { category: true },
    });

    const lowStock = products.filter((p) => p.stockQuantity <= p.reorderLevel && p.stockQuantity > 0);
    const outOfStock = products.filter((p) => p.stockQuantity === 0);
    const critical = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.reorderLevel * 0.3);

    res.json({ lowStock, outOfStock, critical, summary: { lowStock: lowStock.length, outOfStock: outOfStock.length, critical: critical.length } });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkStockUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body; // [{ productId, quantityChange, movementType, notes }]
    const results = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) continue;

      const newQuantity = product.stockQuantity + item.quantityChange;
      if (newQuantity < 0) continue;

      const [updatedProduct, movement] = await prisma.$transaction([
        prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newQuantity, status: newQuantity === 0 ? 'out_of_stock' : 'active' },
        }),
        prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChange: item.quantityChange,
            movementType: item.movementType || 'adjustment',
            notes: item.notes,
            previousQuantity: product.stockQuantity,
            newQuantity,
            createdById: req.user!.id,
          },
        }),
      ]);

      results.push({ product: updatedProduct, movement });
    }

    res.json({ updated: results.length, results });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
