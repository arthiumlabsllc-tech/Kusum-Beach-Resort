import { Router } from 'express';
import { getAllSettings, getSettingByKey, updateSetting, createSetting } from '../controllers/settingsController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getAllSettings);
router.get('/:key', getSettingByKey);
router.put('/:key', authorize('owner', 'manager'), updateSetting);
router.post('/', authorize('owner', 'manager'), createSetting);

export default router;
