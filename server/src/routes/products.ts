import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getCategories,
  getStockMovements,
  getInventoryAlerts,
} from '../controllers/productController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createProductSchema, updateProductSchema, stockAdjustmentSchema } from '../validators/product';

const router = Router();

// All product routes require authentication
router.use(authenticate);

// Categories
router.get('/categories', getCategories);

// Products
router.get('/', getAllProducts);
router.get('/inventory-alerts', getInventoryAlerts);
router.get('/low-stock', getLowStockProducts);
router.get('/movements', getStockMovements);
router.get('/:id', getProductById);
router.post('/', authorize('owner', 'manager'), validate(createProductSchema), createProduct);
router.put('/:id', authorize('owner', 'manager'), validate(updateProductSchema), updateProduct);
router.delete('/:id', authorize('owner', 'manager'), deleteProduct);

// Stock management
router.post('/adjust-stock', authorize('owner', 'manager', 'supervisor'), validate(stockAdjustmentSchema), adjustStock);

export default router;
