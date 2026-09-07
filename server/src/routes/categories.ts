import { Router } from 'express';
import { getAllCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.post('/', authorize('owner', 'manager'), createCategory);
router.put('/:id', authorize('owner', 'manager'), updateCategory);
router.delete('/:id', authorize('owner', 'manager'), deleteCategory);

export default router;
