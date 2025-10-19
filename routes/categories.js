import express from 'express';

import { createCategory, getCategories, updateCategory, deleteCategory } from '../controllers/categoriesController.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

export default router;
