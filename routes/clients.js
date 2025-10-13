import express from 'express';
import { getAllClients, getClientById, addClient, updateClient, deleteClient, me } from '../controllers/clientsController.js';
const router = express.Router();

router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', addClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);
router.delete('/me', me);

export default router;
