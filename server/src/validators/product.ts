import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  categoryId: z.number().int().positive('Category ID must be a positive integer'),
  unit: z.enum(['Bottle', 'Can', 'Glass', 'Shot', 'Pitcher', 'Carton', 'Cup', 'Jug', 'Pack']),
  stockQuantity: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(10),
  reorderQuantity: z.number().int().min(0).default(20),
  buyingPrice: z.number().min(0, 'Buying price must be non-negative'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  supplier: z.string().optional(),
  expiryDate: z.string().optional(),
  barcode: z.string().optional(),
  status: z.enum(['active', 'discontinued', 'out_of_stock']).default('active'),
});

export const updateProductSchema = createProductSchema.partial();

export const stockAdjustmentSchema = z.object({
  productId: z.number().int().positive(),
  quantityChange: z.number().int(),
  movementType: z.enum(['arrival', 'adjustment', 'wastage', 'return']),
  notes: z.string().optional(),
});
