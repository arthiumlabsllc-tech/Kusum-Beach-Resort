import { Router } from 'express';
import { login, changePassword } from '../controllers/authController';
import { getCurrentUser, clockIn, clockOut } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { loginSchema, changePasswordSchema } from '../validators/auth';

const router = Router();

// Public routes
router.post('/login', validate(loginSchema), login);

// Protected routes
router.get('/me', authenticate, getCurrentUser);
router.post('/change-password', authenticate, validate(changePasswordSchema), changePassword);
router.post('/clock-in', authenticate, clockIn);
router.post('/clock-out', authenticate, clockOut);
router.post('/logout', authenticate, (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});

export default router;
