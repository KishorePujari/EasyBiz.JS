import express from 'express';

import { getPlanStatus, initiateRecharge, processPaymentWebhook, getRechargeHistory } from '../controllers/plansController.js';

const router = express.Router();

router.get('/satus', getPlanStatus);
router.post('/recharge/initiate', initiateRecharge);
router.put('/recharge/webhook', processPaymentWebhook);
router.delete('/recharge/history', getRechargeHistory);

export default router;
