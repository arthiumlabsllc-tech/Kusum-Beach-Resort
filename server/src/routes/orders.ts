import { Router } from 'express';
import {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from '../controllers/orderController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createOrderSchema, updateOrderStatusSchema } from '../validators/order';

const router = Router();

// All order routes require authentication
router.use(authenticate);

router.post('/', validate(createOrderSchema), createOrder);
router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.patch('/:id/status', validate(updateOrderStatusSchema), updateOrderStatus);
router.post('/:id/cancel', cancelOrder);

export default router;
