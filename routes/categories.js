import express from 'express';

import { createCategory, getCategories, updateCategory, deleteCategory, getChildCategories } from '../controllers/categoriesController.js';

const router = express.Router();

router.get('/', getCategories);
router.post('/', createCategory);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);
router.get('/children', getChildCategories);

export default router;
