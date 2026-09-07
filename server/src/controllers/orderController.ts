import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { Prisma } from '@prisma/client';

// Generate unique order number
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `KB-${timestamp}-${random}`;
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      customerType,
      customerName,
      tableNumber,
      eventName,
      items,
      discountType,
      discountValue,
      taxRate,
      notes,
      paymentMethod,
    } = req.body;

    // Fetch products and calculate subtotal
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate stock availability and calculate totals
    let subtotal = 0;
    const orderItems: Array<{
      productId: number;
      quantity: number;
      unitPrice: number;
      total: number;
      notes?: string;
    }> = [];

    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        res.status(400).json({ error: `Product ${item.productId} not found` });
        return;
      }

      if (product.stockQuantity < item.quantity) {
        res.status(400).json({
          error: `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}`,
        });
        return;
      }

      const total = product.sellingPrice.toNumber() * item.quantity;
      subtotal += total;

      orderItems.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.sellingPrice,
        total,
        notes: item.notes,
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (discountType && discountValue) {
      if (discountType === 'percentage') {
        discountAmount = (subtotal * discountValue) / 100;
      } else {
        discountAmount = discountValue;
      }
    }

    // Calculate tax
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = (taxableAmount * (taxRate || 0)) / 100;
    const total = taxableAmount + taxAmount;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerType,
          customerName,
          tableNumber,
          eventName,
          subtotal,
          discountType,
          discountValue,
          discountAmount,
          taxRate,
          taxAmount,
          total,
          paymentStatus: 'paid', // Cash/MoMo payments are immediate
          orderStatus: 'received',
          notes,
          createdById: req.user!.id,
        },
      });

      // Create order items
      await tx.orderItem.createMany({
        data: orderItems.map((item) => ({
          ...item,
          orderId: newOrder.id,
        })),
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: newOrder.id,
          paymentMethod,
          amount: total,
          status: 'completed',
          settledAt: new Date(),
          createdById: req.user!.id,
        },
      });

      // Update stock quantities and create movements
      for (const item of items) {
        const product = productMap.get(item.productId)!;
        const newQuantity = product.stockQuantity - item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: newQuantity,
            status: newQuantity === 0 ? 'out_of_stock' : 'active',
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChange: -item.quantity,
            movementType: 'sale',
            reference: newOrder.orderNumber,
            previousQuantity: product.stockQuantity,
            newQuantity,
            createdById: req.user!.id,
          },
        });
      }

      return newOrder;
    });

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, paymentStatus, date, limit } = req.query;

    const where: any = {};

    if (status) {
      where.orderStatus = status;
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }

    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
      where.createdAt = { gte: startDate, lte: endDate };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
        createdBy: {
          select: { fullName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit as string, 10) : 50,
    });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        items: {
          include: { product: true },
        },
        payments: true,
        createdBy: {
          select: { fullName: true, username: true },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    const order = await prisma.order.update({
      where: { id: parseInt(id, 10) },
      data: { orderStatus },
    });

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: parseInt(id, 10) },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (order.orderStatus === 'cancelled') {
      res.status(400).json({ error: 'Order is already cancelled' });
      return;
    }

    // Restore stock and create order in transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          orderStatus: 'cancelled',
          paymentStatus: 'refunded',
        },
      });

      // Restore stock for each item
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const newQuantity = product.stockQuantity + item.quantity;

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newQuantity,
              status: 'active',
            },
          });

          await tx.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChange: item.quantity,
              movementType: 'return',
              reference: `Cancelled order: ${order.orderNumber}`,
              previousQuantity: product.stockQuantity,
              newQuantity,
              createdById: req.user!.id,
            },
          });
        }
      }
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
