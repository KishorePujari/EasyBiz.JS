import express from 'express';

import { createBrand, getBrands, updateBrand, deleteBrand } from '../controllers/brandsController.js';

const router = express.Router();

router.get('/', getBrands);
router.post('/', createBrand);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

export default router;
