import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

/** Expiry alert window: 90 days, matching the pharmacy reference project. */
const EXPIRY_ALERT_WINDOW_DAYS = 90;

/**
 * Compute the stock level for a product.
 * - 'out'     : stockQuantity <= 0
 * - 'low'     : stockQuantity > 0 but <= reorderLevel (and reorderLevel > 0)
 * - 'ok'      : stockQuantity > reorderLevel
 */
function stockLevel(quantity: number, reorderLevel: number): 'out' | 'low' | 'ok' {
  if (quantity <= 0) return 'out';
  if (reorderLevel > 0 && quantity <= reorderLevel) return 'low';
  return 'ok';
}

/**
 * Compute the expiry state for a product.
 * - 'expired' : expiryDate has passed
 * - 'soon'    : expiryDate is within EXPIRY_ALERT_WINDOW_DAYS
 * - 'ok'      : expiryDate is more than EXPIRY_ALERT_WINDOW_DAYS away
 * - 'none'    : no expiry date set
 */
function expiryState(expiryDate: Date | null | undefined): 'none' | 'expired' | 'soon' | 'ok' {
  if (!expiryDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const daysUntil = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil < 0) return 'expired';
  if (daysUntil <= EXPIRY_ALERT_WINDOW_DAYS) return 'soon';
  return 'ok';
}

/**
 * Enrich a product row with computed stockLevel and expiryState.
 */
function enrichProduct(p: Record<string, any>): Record<string, any> {
  return {
    ...p,
    buyingPrice: Number(p.buyingPrice),
    sellingPrice: Number(p.sellingPrice),
    stockLevel: stockLevel(p.stockQuantity, p.reorderLevel),
    expiryState: expiryState(p.expiryDate),
    daysUntilExpiry: p.expiryDate
      ? Math.floor(
          (new Date(p.expiryDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86_400_000
        )
      : null,
  };
}

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

/**
 * GET /products/inventory-alerts
 *
 * Returns a comprehensive inventory overview:
 * - all products enriched with stockLevel + expiryState
 * - summary counts: total, lowStock, outOfStock, expiringSoon, expired
 * - filtered lists: lowStockProducts, expiringProducts, outOfStockProducts
 */
export const getInventoryAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      where: { status: { not: 'discontinued' } },
      include: { category: true },
      orderBy: { name: 'asc' },
    });

    const enriched = products.map((p) => {
      const expiryDate = p.expiryDate ? new Date(p.expiryDate) : null;
      let daysUntilExpiry: number | null = null;
      if (expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDate);
        expiry.setHours(0, 0, 0, 0);
        daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);
      }

      return {
        id: p.id,
        name: p.name,
        categoryId: p.categoryId,
        category: p.category,
        unit: p.unit,
        stockQuantity: p.stockQuantity,
        reorderLevel: p.reorderLevel,
        reorderQuantity: p.reorderQuantity,
        buyingPrice: Number(p.buyingPrice),
        sellingPrice: Number(p.sellingPrice),
        supplier: p.supplier,
        expiryDate: p.expiryDate ? p.expiryDate.toISOString() : null,
        imageUrl: p.imageUrl,
        barcode: p.barcode,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        stockLevel: stockLevel(p.stockQuantity, p.reorderLevel),
        expiryState: expiryState(p.expiryDate),
        daysUntilExpiry,
      };
    });

    const lowStockProducts = enriched.filter((p) => p.stockLevel === 'low');
    const outOfStockProducts = enriched.filter((p) => p.stockLevel === 'out');
    const expiringProducts = enriched.filter((p) => p.expiryState === 'soon' || p.expiryState === 'expired');

    res.json({
      products: enriched,
      summary: {
        total: enriched.length,
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
        expiringSoon: enriched.filter((p) => p.expiryState === 'soon').length,
        expired: enriched.filter((p) => p.expiryState === 'expired').length,
      },
      lowStockProducts,
      outOfStockProducts,
      expiringProducts,
    });
  } catch (error: any) {
    console.error('Inventory alerts error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};
