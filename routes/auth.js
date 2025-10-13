import express from 'express';
import { register, login } from '../controllers/authController.js';
const router = express.Router();

router.post('/register', register); // optional: only admin can register new users
router.post('/login', login);

export default router;
