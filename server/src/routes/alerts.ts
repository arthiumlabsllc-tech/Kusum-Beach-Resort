import { Router } from 'express';
import { getActiveAlerts, acknowledgeAlert, getAlertLogs, addAlertRecipient, getAlertRecipients, removeAlertRecipient, sendTestAlert } from '../controllers/alertController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getActiveAlerts);
router.post('/:id/acknowledge', acknowledgeAlert);
router.get('/logs', authorize('owner', 'manager'), getAlertLogs);
router.post('/recipients', authorize('owner', 'manager'), addAlertRecipient);
router.get('/recipients', authorize('owner', 'manager'), getAlertRecipients);
router.delete('/recipients/:id', authorize('owner', 'manager'), removeAlertRecipient);
router.post('/test', authorize('owner', 'manager'), sendTestAlert);

export default router;
