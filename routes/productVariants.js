import express from 'express';
import { getAllVariants, getVariantById, addVariant, updateVariant, deleteVariant } from '../controllers/productVariantsController.js';
const router = express.Router();

router.get('/', getAllVariants);
router.get('/:id', getVariantById);
router.post('/', addVariant);
router.put('/:id', updateVariant);
router.delete('/:id', deleteVariant);

export default router;
