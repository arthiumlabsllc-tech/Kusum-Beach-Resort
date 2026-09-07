import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalProducts,
      lowStockProducts,
      outOfStockProducts,
      todayOrders,
      todayRevenue,
      totalOrders,
      totalRevenue,
    ] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({
        where: {
          status: 'active',
          stockQuantity: { gt: 0 },
        },
      }).then((count) => {
        return prisma.product.findMany({
          where: { status: 'active' },
        }).then((products) => products.filter((p) => p.stockQuantity <= p.reorderLevel && p.stockQuantity > 0).length);
      }),
      prisma.product.count({ where: { status: 'out_of_stock' } }),
      prisma.order.count({
        where: {
          createdAt: { gte: today },
          orderStatus: { not: 'cancelled' },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today },
          orderStatus: { not: 'cancelled' },
          paymentStatus: 'paid',
        },
        _sum: { total: true },
      }),
      prisma.order.count({
        where: { orderStatus: { not: 'cancelled' } },
      }),
      prisma.order.aggregate({
        where: {
          orderStatus: { not: 'cancelled' },
          paymentStatus: 'paid',
        },
        _sum: { total: true },
      }),
    ]);

    res.json({
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      orders: {
        today: todayOrders,
        total: totalOrders,
      },
      revenue: {
        today: todayRevenue._sum.total?.toNumber() || 0,
        total: totalRevenue._sum.total?.toNumber() || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSalesReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    const where: any = {
      orderStatus: { not: 'cancelled' },
      paymentStatus: 'paid',
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary
    const totalRevenue = orders.reduce((sum, order) => sum + order.total.toNumber(), 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top selling products
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();

    for (const order of orders) {
      for (const item of order.items) {
        const existing = productSales.get(item.product.name) || {
          name: item.product.name,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.total.toNumber();
        productSales.set(item.product.name, existing);
      }
    }

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Payment method breakdown
    const paymentMethods = new Map<string, number>();
    for (const order of orders) {
      for (const payment of order.payments) {
        const method = payment.paymentMethod;
        paymentMethods.set(method, (paymentMethods.get(method) || 0) + payment.amount.toNumber());
      }
    }

    res.json({
      summary: {
        totalRevenue,
        totalOrders,
        avgOrderValue,
      },
      topProducts,
      paymentMethods: Object.fromEntries(paymentMethods),
      orders: orders.slice(0, 50),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getInventoryReport = async (_req: Request, res: Response): Promise<void> => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });

    const totalValue = products.reduce(
      (sum, p) => sum + p.buyingPrice.toNumber() * p.stockQuantity,
      0
    );

    const totalRetailValue = products.reduce(
      (sum, p) => sum + p.sellingPrice.toNumber() * p.stockQuantity,
      0
    );

    const byCategory = new Map<string, { count: number; value: number; items: number }>();

    for (const p of products) {
      const existing = byCategory.get(p.category.name) || { count: 0, value: 0, items: 0 };
      existing.count++;
      existing.value += p.buyingPrice.toNumber() * p.stockQuantity;
      existing.items += p.stockQuantity;
      byCategory.set(p.category.name, existing);
    }

    const lowStock = products.filter((p) => p.stockQuantity <= p.reorderLevel && p.stockQuantity > 0);
    const outOfStock = products.filter((p) => p.stockQuantity === 0);

    res.json({
      summary: {
        totalProducts: products.length,
        totalCostValue: totalValue,
        totalRetailValue,
        potentialProfit: totalRetailValue - totalValue,
      },
      byCategory: Object.fromEntries(byCategory),
      lowStock,
      outOfStock,
      allProducts: products,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAlerts = async (_req: Request, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.alertLog.findMany({
      where: { isAcknowledged: false },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const acknowledgeAlert = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.alertLog.update({
      where: { id: parseInt(id, 10) },
      data: {
        isAcknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    res.json({ message: 'Alert acknowledged' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
