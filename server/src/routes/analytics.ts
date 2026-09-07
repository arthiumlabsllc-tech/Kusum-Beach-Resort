import { Router } from 'express';
import { getDashboardData, getSalesAnalytics, getTopProducts, getPaymentBreakdown, getStaffPerformance, getPeakHours, getProfitability } from '../controllers/analyticsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/dashboard', getDashboardData);
router.get('/sales', getSalesAnalytics);
router.get('/top-products', getTopProducts);
router.get('/payment-breakdown', getPaymentBreakdown);
router.get('/staff', authorize('owner', 'manager'), getStaffPerformance);
router.get('/peak-hours', getPeakHours);
router.get('/profitability', authorize('owner', 'manager'), getProfitability);

export default router;
