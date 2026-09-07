import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getDashboardData = async (_req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalProducts, outOfStock, todayOrders, todayRevenue, totalRevenue, activeAlerts] = await Promise.all([
      prisma.product.count({ where: { status: 'active' } }),
      prisma.product.count({ where: { status: 'out_of_stock' } }),
      prisma.order.count({ where: { createdAt: { gte: today }, orderStatus: { not: 'cancelled' } } }),
      prisma.order.aggregate({
        where: { createdAt: { gte: today }, orderStatus: { not: 'cancelled' }, paymentStatus: 'paid' },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { orderStatus: { not: 'cancelled' }, paymentStatus: 'paid' },
        _sum: { total: true },
      }),
      prisma.alertLog.count({ where: { isAcknowledged: false } }),
    ]);

    // Low stock count
    const allProducts = await prisma.product.findMany({ where: { status: 'active' } });
    const lowStock = allProducts.filter((p) => p.stockQuantity <= p.reorderLevel && p.stockQuantity > 0).length;

    // Revenue chart data (last 7 days)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const revenue = await prisma.order.aggregate({
        where: {
          createdAt: { gte: date, lt: nextDate },
          orderStatus: { not: 'cancelled' },
          paymentStatus: 'paid',
        },
        _sum: { total: true },
      });

      chartData.push({
        date: date.toISOString().split('T')[0],
        revenue: revenue._sum.total?.toNumber() || 0,
      });
    }

    // Payment breakdown
    const payments = await prisma.payment.findMany({
      where: { status: 'completed', createdAt: { gte: today } },
    });
    const paymentBreakdown = new Map<string, number>();
    for (const p of payments) {
      paymentBreakdown.set(p.paymentMethod, (paymentBreakdown.get(p.paymentMethod) || 0) + p.amount.toNumber());
    }

    // Top products
    const orderItems = await prisma.orderItem.findMany({
      where: { order: { createdAt: { gte: today }, orderStatus: { not: 'cancelled' } } },
      include: { product: true },
    });
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of orderItems) {
      const existing = productSales.get(item.product.name) || { name: item.product.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.total.toNumber();
      productSales.set(item.product.name, existing);
    }
    const topProducts = Array.from(productSales.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    res.json({
      summary: {
        totalProducts,
        lowStock,
        outOfStock,
        todayOrders,
        todayRevenue: todayRevenue._sum.total?.toNumber() || 0,
        totalRevenue: totalRevenue._sum.total?.toNumber() || 0,
        activeAlerts,
      },
      chartData,
      paymentBreakdown: Object.fromEntries(paymentBreakdown),
      topProducts,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSalesAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        orderStatus: { not: 'cancelled' },
        paymentStatus: 'paid',
      },
      include: { items: { include: { product: true } }, payments: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyData = new Map<string, { revenue: number; orders: number; items: number }>();
    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = dailyData.get(dateKey) || { revenue: 0, orders: 0, items: 0 };
      existing.revenue += order.total.toNumber();
      existing.orders++;
      existing.items += order.items.length;
      dailyData.set(dateKey, existing);
    }

    res.json({
      period,
        startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalRevenue: orders.reduce((s, o) => s + o.total.toNumber(), 0),
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0 ? orders.reduce((s, o) => s + o.total.toNumber(), 0) / orders.length : 0,
      dailyBreakdown: Array.from(dailyData.entries()).map(([date, data]) => ({ date, ...data })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTopProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: start, lte: end },
          orderStatus: { not: 'cancelled' },
        },
      },
      include: { product: { include: { category: true } } },
    });

    const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number; profit: number }>();
    for (const item of orderItems) {
      const existing = productMap.get(item.product.name) || {
        name: item.product.name,
        category: item.product.category.name,
        quantity: 0,
        revenue: 0,
        profit: 0,
      };
      existing.quantity += item.quantity;
      existing.revenue += item.total.toNumber();
      existing.profit += (item.unitPrice.toNumber() - item.product.buyingPrice.toNumber()) * item.quantity;
      productMap.set(item.product.name, existing);
    }

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, parseInt(limit as string, 10));

    res.json(topProducts);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPaymentBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: 'completed' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({ where });
    const byMethod = new Map<string, { count: number; total: number }>();
    for (const p of payments) {
      const existing = byMethod.get(p.paymentMethod) || { count: 0, total: 0 };
      existing.count++;
      existing.total += p.amount.toNumber();
      byMethod.set(p.paymentMethod, existing);
    }

    res.json(Object.fromEntries(byMethod));
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getStaffPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { orderStatus: { not: 'cancelled' }, paymentStatus: 'paid' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const orders = await prisma.order.findMany({
      where,
      include: { createdBy: { select: { id: true, fullName: true, username: true, role: true } } },
    });

    const staffMap = new Map<string, { name: string; role: string; orders: number; revenue: number }>();
    for (const order of orders) {
      if (!order.createdBy) continue;
      const key = order.createdBy.fullName;
      const existing = staffMap.get(key) || { name: order.createdBy.fullName, role: order.createdBy.role, orders: 0, revenue: 0 };
      existing.orders++;
      existing.revenue += order.total.toNumber();
      staffMap.set(key, existing);
    }

    const performance = Array.from(staffMap.values()).sort((a, b) => b.revenue - a.revenue);
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPeakHours = async (_req: Request, res: Response): Promise<void> => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: thirtyDaysAgo }, orderStatus: { not: 'cancelled' } },
      select: { createdAt: true, total: true },
    });

    const hourData = new Map<number, { count: number; revenue: number }>();
    for (let i = 0; i < 24; i++) hourData.set(i, { count: 0, revenue: 0 });

    for (const order of orders) {
      const hour = new Date(order.createdAt).getHours();
      const existing = hourData.get(hour)!;
      existing.count++;
      existing.revenue += order.total.toNumber();
    }

    const peakHours = Array.from(hourData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => b.count - a.count);

    res.json(peakHours);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getProfitability = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { orderStatus: { not: 'cancelled' }, paymentStatus: 'paid' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const orderItems = await prisma.orderItem.findMany({
      where: { order: where },
      include: { product: { include: { category: true } } },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    const byCategory = new Map<string, { revenue: number; cost: number; profit: number }>();

    for (const item of orderItems) {
      const revenue = item.total.toNumber();
      const cost = item.product.buyingPrice.toNumber() * item.quantity;
      totalRevenue += revenue;
      totalCost += cost;

      const catName = item.product.category?.name || 'Unknown';
      const existing = byCategory.get(catName) || { revenue: 0, cost: 0, profit: 0 };
      existing.revenue += revenue;
      existing.cost += cost;
      existing.profit += revenue - cost;
      byCategory.set(catName, existing);
    }

    res.json({
      totalRevenue,
      totalCost,
      totalProfit: totalRevenue - totalCost,
      profitMargin: totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0,
      byCategory: Object.fromEntries(byCategory),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
