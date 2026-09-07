import { Router } from 'express';
import {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getAlerts,
  acknowledgeAlert,
} from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardStats);
router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);
router.get('/alerts', getAlerts);
router.patch('/alerts/:id/acknowledge', acknowledgeAlert);

export default router;
