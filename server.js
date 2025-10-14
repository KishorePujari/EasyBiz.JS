import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import pkg from 'pg';
import bcrypt from 'bcrypt';


import customersRoutes from './routes/customers.js';
import clientsRoutes from './routes/clients.js';
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

await createFirstUser();

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', authMiddleware, clientsRoutes);
app.use('/api/customers', authMiddleware, customersRoutes);
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


async function createFirstUser() {
    dotenv.config();
    const { Pool } = pkg;

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL, // or use user, password, host, db, port
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });


    try {
        const mobile_num = '9886798761'; // 👈 change this
        const password = '9886798761';    // 👈 change this (strong one)
        const first_name = 'Kishore';
        const last_name = 'Pujari';
        const email = 'urfriendkishor@gmail.com';
        const role = 'BOSS';
        const client_id = null; // BOSS is global, not tied to a specific client

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (first_name, last_name, mobile_num, password, role, email, client_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id, first_name, last_name, role, email`,
            [first_name, last_name, mobile_num, hashedPassword, role, email, client_id]
        );

        console.log('✅ First user created successfully:', result.rows[0]);
    } catch (err) {
        console.error('❌ Error creating first user:', err.message);
    } finally {
        await pool.end();
    }
}