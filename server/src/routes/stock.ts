import { Router } from 'express';
import { getStockMovements, recordAdjustment, recordArrival, recordWastage, getStockValuation, getLowStockReport, bulkStockUpdate } from '../controllers/stockController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/movements', getStockMovements);
router.post('/adjustment', authorize('owner', 'manager', 'supervisor'), recordAdjustment);
router.post('/arrival', authorize('owner', 'manager', 'supervisor'), recordArrival);
router.post('/wastage', authorize('owner', 'manager', 'supervisor'), recordWastage);
router.get('/valuation', getStockValuation);
router.get('/low-stock-report', getLowStockReport);
router.post('/bulk-update', authorize('owner', 'manager'), bulkStockUpdate);

export default router;
