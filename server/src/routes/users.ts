import { Router } from 'express';
import { getAllUsers, createUser, updateUser, deleteUser, getShifts, createShift, updateShift } from '../controllers/userController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', authorize('owner', 'manager'), getAllUsers);
router.post('/', authorize('owner', 'manager'), createUser);
router.put('/:id', authorize('owner', 'manager'), updateUser);
router.delete('/:id', authorize('owner', 'manager'), deleteUser);

// Shifts
router.get('/shifts', getShifts);
router.post('/shifts', authorize('owner', 'manager', 'supervisor'), createShift);
router.put('/shifts/:id', authorize('owner', 'manager', 'supervisor'), updateShift);

export default router;
