import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';




import customersRoutes from './routes/customers.js';
import productsRoutes from './routes/products.js';
import variantsRoutes from './routes/productVariants.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import storesRoutes from './routes/stores.js';
import suppliersRoutes from './routes/suppliers.js';
import employeesRoutes from './routes/employees.js';
import inventoryRoutes from './routes/inventory.js';
import expensesRoutes from './routes/expenses.js';
import transactionsRoutes from './routes/transactions.js';
import aiLogsRoutes from './routes/aiQueryLogs.js';
import authRoutes from './routes/auth.js';
import { authMiddleware, roleMiddleware } from './middleware/authMiddleware.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', authMiddleware,customersRoutes);
app.use('/api/products', authMiddleware, productsRoutes);
app.use('/api/variants', authMiddleware, variantsRoutes);
app.use('/api/orders', authMiddleware, ordersRoutes);
app.use('/api/payments', authMiddleware, paymentsRoutes);
app.use('/api/stores', authMiddleware, storesRoutes);
app.use('/api/suppliers', authMiddleware, suppliersRoutes);
app.use('/api/employees', authMiddleware, employeesRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/expenses', authMiddleware, expensesRoutes);
app.use('/api/transactions', authMiddleware, transactionsRoutes);
app.use('/api/ai-logs', authMiddleware, aiLogsRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
