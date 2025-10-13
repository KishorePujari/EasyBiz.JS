import express from 'express';
import { getAllCustomers, getCustomerById, addCustomer, updateCustomer, deleteCustomer } from '../controllers/customersController.js';
const router = express.Router();

router.get('/', getAllCustomers);
router.get('/:id', getCustomerById);
router.post('/', addCustomer);
router.put('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
