import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive('Quantity must be positive'),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  customerType: z.enum(['walkin', 'table', 'event', 'takeaway']).default('walkin'),
  customerName: z.string().optional(),
  tableNumber: z.string().optional(),
  eventName: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'At least one item is required'),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).default(0),
  notes: z.string().optional(),
  paymentMethod: z.enum(['cash', 'momo_mtn', 'momo_vodafone', 'momo_airteltigo', 'crypto_stablecoin', 'crypto_other']),
});

export const updateOrderStatusSchema = z.object({
  orderStatus: z.enum(['received', 'preparing', 'ready', 'served', 'cancelled']),
});

export const processPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  paymentMethod: z.enum(['cash', 'momo_mtn', 'momo_vodafone', 'momo_airteltigo', 'crypto_stablecoin', 'crypto_other']),
  amount: z.number().min(0.01, 'Amount must be positive'),
  transactionId: z.string().optional(),
});
