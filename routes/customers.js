import express from 'express';
import { getAllCustomers, getCustomerById, addCustomer, updateCustomer, deleteCustomer, getCustomerByMobile } from '../controllers/customersController.js';
const router = express.Router();

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', addCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);
router.delete('/by-mobile', getCustomerByMobile);

export default router;
