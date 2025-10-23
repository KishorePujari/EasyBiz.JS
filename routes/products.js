import express from 'express';
import { searchProduct, getAllProducts, getProductById, addProduct, updateProduct, deleteProduct, getVariantOptions, getProductOptionValues } from '../controllers/productsController.js';
const router = express.Router();

router.get('/search', searchProduct);
router.get('/', getAllProducts);
router.get('/:id', getProductById);
router.post('/', addProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);
router.get('/variants/options', getVariantOptions);
router.get('/variants/option-values', getProductOptionValues);
getProductOptionValues

export default router;
