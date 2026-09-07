import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';
import logger from '../lib/logger';
import { paystackService } from '../services/paystackService';

// Record cash payment
export const recordCashPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amount, amountReceived } = req.body;
    const change = amountReceived - amount;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentMethod: 'cash',
        amount,
        status: 'completed',
        settledAt: new Date(),
        paymentData: { amountReceived, change },
        createdById: req.user!.id,
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { paymentStatus: 'paid' },
    });

    res.json({ payment, change });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Initiate MTN MoMo payment
export const initiateMomoPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amount, phone, provider } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Generate a reference ID for the MoMo transaction
    const referenceId = `KB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would make an actual API call to MTN MoMo
    // For now, we create a pending payment record
    const paymentMethod = provider === 'vodafone' ? 'momo_vodafone' :
                          provider === 'airteltigo' ? 'momo_airteltigo' : 'momo_mtn';

    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentMethod: paymentMethod as any,
        amount,
        transactionId: referenceId,
        status: 'pending',
        paymentData: { phone, provider, referenceId },
        createdById: req.user!.id,
      },
    });

    // In production: Make API call to MoMo
    // const momoResponse = await callMomoAPI(referenceId, amount, phone);

    res.json({
      payment,
      referenceId,
      message: `Payment request sent to ${phone}. Customer will receive a prompt to authorize.`,
      status: 'pending_customer_authorization',
    });
  } catch (error) {
    logger.error('MoMo payment initiation failed:', error);
    res.status(500).json({ error: 'Failed to initiate MoMo payment' });
  }
};

// MoMo callback webhook
export const momoCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { referenceId, status, transactionId } = req.body;

    logger.info('MoMo callback received:', { referenceId, status });

    const payment = await prisma.payment.findFirst({
      where: { transactionId: referenceId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (status === 'completed' || status === 'success') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'completed', settledAt: new Date() },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'paid' },
        }),
      ]);

      // Deduct stock
      for (const item of payment.order.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } });
        if (product) {
          const newQty = product.stockQuantity - item.quantity;
          await prisma.product.update({
            where: { id: item.productId },
            data: { stockQuantity: Math.max(0, newQty), status: newQty <= 0 ? 'out_of_stock' : 'active' },
          });
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              quantityChange: -item.quantity,
              movementType: 'sale',
              reference: `MoMo: ${referenceId}`,
              previousQuantity: product.stockQuantity,
              newQuantity: Math.max(0, newQty),
            },
          });
        }
      }
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('MoMo callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
};

// Initiate crypto payment
export const initiateCryptoPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, amountGHS, cryptoType = 'USDC' } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const referenceId = `KB-CRYPTO-${Date.now()}`;

    // In production, call Breet API to get wallet address and conversion rate
    // For now, simulate the response
    const mockWalletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18';
    const mockRate = 15.0; // 1 USDC = ~15 GHS (example rate)
    const cryptoAmount = amountGHS / mockRate;

    const payment = await prisma.payment.create({
      data: {
        orderId,
        paymentMethod: 'crypto_stablecoin',
        amount: amountGHS,
        transactionId: referenceId,
        status: 'pending',
        paymentData: {
          cryptoType,
          cryptoAmount,
          walletAddress: mockWalletAddress,
          exchangeRate: mockRate,
          referenceId,
        },
        createdById: req.user!.id,
      },
    });

    res.json({
      payment,
      walletAddress: mockWalletAddress,
      cryptoAmount: cryptoAmount.toFixed(2),
      cryptoType,
      exchangeRate: mockRate,
      qrCode: `crypto:${mockWalletAddress}?amount=${cryptoAmount.toFixed(2)}&currency=${cryptoType}`,
      message: 'Send the exact crypto amount to the wallet address',
    });
  } catch (error) {
    logger.error('Crypto payment initiation failed:', error);
    res.status(500).json({ error: 'Failed to initiate crypto payment' });
  }
};

// Crypto callback webhook
export const cryptoCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { referenceId, status, txHash } = req.body;

    logger.info('Crypto callback received:', { referenceId, status });

    const payment = await prisma.payment.findFirst({
      where: { transactionId: referenceId },
      include: { order: { include: { items: true } } },
    });

    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }

    if (status === 'completed' || status === 'confirmed') {
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'completed',
            settledAt: new Date(),
            paymentData: { ...(payment.paymentData as any), txHash },
          },
        }),
        prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'paid' },
        }),
      ]);
    } else {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('Crypto callback error:', error);
    res.status(500).json({ error: 'Callback processing failed' });
  }
};

// Get payment details
export const getPaymentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { order: true, createdBy: { select: { fullName: true } } },
    });
    if (!payment) {
      res.status(404).json({ error: 'Payment not found' });
      return;
    }
    res.json(payment);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// List payments
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, method, startDate, endDate } = req.query;
    const where: any = {};
    if (status) where.status = status;
    if (method) where.paymentMethod = method;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({
      where,
      include: { order: true, createdBy: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reconciliation report
export const getReconciliation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate } = req.query;
    const where: any = { status: 'completed' };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const payments = await prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' } });

    const byMethod = new Map<string, { count: number; total: number }>();
    for (const p of payments) {
      const existing = byMethod.get(p.paymentMethod) || { count: 0, total: 0 };
      existing.count++;
      existing.total += p.amount.toNumber();
      byMethod.set(p.paymentMethod, existing);
    }

    const grandTotal = payments.reduce((sum, p) => sum + p.amount.toNumber(), 0);

    res.json({
      grandTotal,
      totalTransactions: payments.length,
      byMethod: Object.fromEntries(byMethod),
      payments,
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Process refund
export const processRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, reason } = req.body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { paymentStatus: 'refunded', orderStatus: 'cancelled' },
      }),
      prisma.payment.updateMany({
        where: { orderId },
        data: { status: 'refunded' },
      }),
    ]);

    // Restore stock
    for (const item of order.items) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (product) {
        const newQty = product.stockQuantity + item.quantity;
        await prisma.product.update({
          where: { id: item.productId },
          data: { stockQuantity: newQty, status: 'active' },
        });
        await prisma.stockMovement.create({
          data: {
            productId: item.productId,
            quantityChange: item.quantity,
            movementType: 'return',
            reference: `Refund: ${order.orderNumber}`,
            notes: reason,
            previousQuantity: product.stockQuantity,
            newQuantity: newQty,
            createdById: req.user!.id,
          },
        });
      }
    }

    res.json({ message: 'Refund processed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// =============================================
// PAYSTACK PAYMENT ENDPOINTS
// =============================================

/**
 * Initialize a Paystack transaction.
 * Returns the authorization_url where the customer completes payment.
 */
export const paystackInitialize = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { orderId, email } = req.body;

    if (!orderId) {
      res.status(400).json({ error: 'orderId is required' });
      return;
    }

    // Fetch the order to get the amount
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    const amount = Number(order.total);
    const customerEmail = email || 'guest@kusumbeach.com';

    const result = await paystackService.initialize({
      orderId: order.id,
      email: customerEmail,
      amount,
    });

    res.json({
      authorizationUrl: result.authorizationUrl,
      accessCode: result.accessCode,
      reference: result.reference,
    });
  } catch (error: any) {
    logger.error('Paystack initialize error:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize Paystack payment' });
  }
};

/**
 * Verify a Paystack transaction after the customer completes payment.
 */
export const paystackVerify = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { reference } = req.body;

    if (!reference) {
      res.status(400).json({ error: 'reference is required' });
      return;
    }

    const result = await paystackService.verify(reference);

    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json({
      success: true,
      message: result.message,
      order: result.order,
    });
  } catch (error: any) {
    logger.error('Paystack verify error:', error);
    res.status(500).json({ error: error.message || 'Failed to verify Paystack payment' });
  }
};

/**
 * Paystack webhook handler.
 * Receives charge.success, charge.failed, etc.
 * No auth required — Paystack sends this directly.
 */
export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify the webhook signature
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      res.status(401).json({ error: 'Missing webhook signature' });
      return;
    }

    const body = JSON.stringify(req.body);
    if (!paystackService.verifyWebhookSignature(signature, body)) {
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    // Process the webhook event
    await paystackService.processWebhook(req.body);

    res.json({ status: 'ok' });
  } catch (error: any) {
    logger.error('Paystack webhook error:', error);
    // Always return 200 to Paystack to prevent retries
    res.status(200).json({ status: 'error', message: error.message });
  }
};
