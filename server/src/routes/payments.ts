import { Router } from 'express';
import { recordCashPayment, initiateMomoPayment, momoCallback, initiateCryptoPayment, cryptoCallback, getPaymentById, getAllPayments, getReconciliation, processRefund } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Webhook callbacks (no auth required - they come from payment providers)
router.post('/momo/callback', momoCallback);
router.post('/crypto/callback', cryptoCallback);

// All other payment routes require authentication
router.use(authenticate);

router.get('/', getAllPayments);
router.get('/reconciliation', authorize('owner', 'manager'), getReconciliation);
router.get('/:id', getPaymentById);
router.post('/cash', recordCashPayment);
router.post('/momo/initiate', initiateMomoPayment);
router.post('/crypto/initiate', initiateCryptoPayment);
router.post('/refund', authorize('owner', 'manager'), processRefund);

export default router;
