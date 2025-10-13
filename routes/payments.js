import express from 'express';
import { getAllPayments, addPayment } from '../controllers/paymentsController.js';
const router = express.Router();

router.get('/', getAllPayments);
router.post('/', addPayment);

export default router;
