import { Router } from 'express';
import { recordCashPayment, initiateMomoPayment, momoCallback, initiateCryptoPayment, cryptoCallback, getPaymentById, getAllPayments, getReconciliation, processRefund, paystackInitialize, paystackVerify, paystackWebhook, bconInitialize, bconCallback, bconCheckStatus } from '../controllers/paymentController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Webhook callbacks (no auth required - they come from payment providers)
router.post('/momo/callback', momoCallback);
router.post('/crypto/callback', cryptoCallback);
router.post('/paystack/webhook', paystackWebhook);
router.post('/crypto/bcon/callback', bconCallback);

// All other payment routes require authentication
router.use(authenticate);

router.get('/', getAllPayments);
router.get('/reconciliation', authorize('owner', 'manager'), getReconciliation);
router.get('/:id', getPaymentById);
router.post('/cash', recordCashPayment);
router.post('/momo/initiate', initiateMomoPayment);
router.post('/crypto/initiate', initiateCryptoPayment);
router.post('/refund', authorize('owner', 'manager'), processRefund);

// Paystack routes
router.post('/paystack/initialize', paystackInitialize);
router.post('/paystack/verify', paystackVerify);

// BCon Global crypto routes
router.post('/crypto/bcon/initialize', bconInitialize);
router.get('/crypto/bcon/status/:externalId', bconCheckStatus);

export default router;
