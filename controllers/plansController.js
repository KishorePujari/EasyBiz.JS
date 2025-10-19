// GET /api/billing/status - Fetches the client's current plan and status

export const getPlanStatus = async (req, res) => {
    // ⚠️ Assumes JWT middleware populates req.user.client_id and checks VIEW_PLANS permission
    if (!req.user || !req.user.features.includes('VIEW_PLANS')) {
        return res.status(403).json({ message: "Forbidden: Billing view access required." });
    }
    
    try {
        const pool = await getPool();
        const clientId = req.user.client_id;

        // Fetch plan expiry and related client details
        const query = `
            SELECT 
                c.plan_expiry_date, 
                c.business_name, 
                c.current_plan_id,
                p.name AS plan_name,
                (c.plan_expiry_date > NOW()::date) AS is_active
            FROM clients c
            LEFT JOIN plans p ON c.current_plan_id = p.id
            WHERE c.id = $1;
        `;
        
        const result = await pool.query(query, [clientId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Client details not found." });
        }
        
        const status = result.rows[0];

        res.status(200).json({ 
            message: "Billing status fetched successfully.", 
            data: {
                clientName: status.business_name,
                planExpiryDate: status.plan_expiry_date,
                planName: status.plan_name || 'N/A',
                isPlanActive: status.is_active,
                // Include other plan/usage limits here if fetched
            }
        });

    } catch (err) {
        console.error("Get Billing Status Error:", err.message);
        res.status(500).json({ message: "Server error fetching billing status." });
    }
};

// POST /api/billing/initiate-recharge - Creates PENDING transaction and initiates gateway payment

export const initiateRecharge = async (req, res) => {
    // ⚠️ Assumes JWT middleware populates req.user.client_id and checks RECHARGE permission
    if (!req.user || !req.user.features.includes('RECHARGE')) {
        return res.status(403).json({ message: "Forbidden: Recharge access required." });
    }

    try {
        const pool = await getPool();
        const { plan_id, amount, plan_months, return_url } = req.body;
        const clientId = req.user.client_id;
        const userId = req.user.id; // User initiating the recharge

        if (!plan_id || !amount || !plan_months || !return_url) {
            return res.status(400).json({ message: "Missing required plan or payment data." });
        }

        // 1. Log PENDING Transaction
        const logQuery = `
            INSERT INTO client_recharge_transactions 
            (client_id, amount_paid, plan_months, status, updated_by)
            VALUES ($1, $2, $3, 'PENDING', $4)
            RETURNING id, transaction_date;
        `;
        const logResult = await pool.query(logQuery, [clientId, amount, plan_months, userId]);
        const transactionId = logResult.rows[0].id;

        // 2. ⚠️ Call Payment Gateway (Mock Implementation)
        // In a real application, this calls a service like Razorpay/Stripe API
        const gatewayResponse = {
            order_id: `ORDER-${transactionId}-${Date.now()}`,
            payment_url: `https://mock-gateway.com/pay?ref=${transactionId}&amount=${amount}&return=${encodeURIComponent(return_url)}`
        };

        // 3. Update Transaction Record with Gateway Ref (Crucial for webhook matching)
        await pool.query(
            `UPDATE client_recharge_transactions SET payment_gateway_ref = $1 WHERE id = $2`,
            [gatewayResponse.order_id, transactionId]
        );

        res.status(200).json({ 
            message: "Payment initiated successfully.", 
            transaction_id: transactionId,
            payment_url: gatewayResponse.payment_url // Send the URL for client redirection
        });

    } catch (err) {
        console.error("Initiate Recharge Error:", err.message);
        res.status(500).json({ message: "Server error during recharge initiation." });
    }
};

// POST /api/billing/webhook/payment - CRITICAL: Handles payment confirmation from gateway

// Utility to calculate the new expiry date
const calculateNewExpiryDate = (currentDate, months) => {
    const date = new Date(currentDate);
    // Add 1 day to ensure it's calculated from the day after expiry if already expired
    date.setDate(date.getDate() + 1); 
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0]; // Return as 'YYYY-MM-DD' date string
};

export const processPaymentWebhook = async (req, res) => {
    const paymentData = req.body; // Data received from the payment gateway

    // 1. ⚠️ Perform Gateway Security Check (Crucial)
    // In a real app, this verifies the signature/hash provided by the gateway
    // if (!verifyGatewaySignature(req.headers, paymentData)) {
    //     return res.status(401).send("Unauthorized: Invalid signature.");
    // }
    
    // Assume paymentData contains the essential fields (mapped from gateway payload):
    const { order_id, status, transaction_id, failure_reason } = paymentData;
    
    // Status must be mapped to one of the DB enums: 'SUCCESS', 'FAILED', etc.
    const dbStatus = (status === 'paid' || status === 'success') ? 'SUCCESS' : 'FAILED';
    
    const pool = await getPool();
    const client = await pool.connect(); 
    
    try {
        await client.query('BEGIN');

        // 2. Retrieve and Lock the PENDING Transaction Record
        const getTransactionQuery = `
            SELECT client_id, plan_months FROM client_recharge_transactions 
            WHERE payment_gateway_ref = $1 AND status = 'PENDING' FOR UPDATE;
        `;
        const transactionResult = await client.query(getTransactionQuery, [order_id]);

        if (transactionResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(200).send("Transaction already handled or not found.");
        }
        
        const { client_id, plan_months } = transactionResult.rows[0];
        let newExpiry = null;

        // 3. Update Transaction Record Status
        const updateTransactionQuery = `
            UPDATE client_recharge_transactions
            SET status = $1, failure_reason = $2, updated_at = NOW()
            WHERE payment_gateway_ref = $3;
        `;
        await client.query(updateTransactionQuery, [dbStatus, failure_reason, order_id]);
        
        // 4. Update Client Plan (Only on SUCCESS)
        if (dbStatus === 'SUCCESS') {
            const getClientExpiryQuery = `SELECT plan_expiry_date FROM clients WHERE id = $1;`;
            const clientExpiryResult = await client.query(getClientExpiryQuery, [client_id]);
            
            const currentExpiry = clientExpiryResult.rows[0].plan_expiry_date;
            
            // Calculate new expiry date
            newExpiry = calculateNewExpiryDate(currentExpiry, plan_months);
            
            const updateClientQuery = `
                UPDATE clients SET plan_expiry_date = $1, updated_at = NOW() WHERE id = $2;
            `;
            await client.query(updateClientQuery, [newExpiry, client_id]);

            // Optional: Update the successful transaction record with the final expiry date
            await client.query(`UPDATE client_recharge_transactions SET new_expiry_date = $1 WHERE payment_gateway_ref = $2`, [newExpiry, order_id]);
        }

        await client.query('COMMIT');
        res.status(200).send("Webhook received and plan processed successfully.");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Webhook Critical Error:", error);
        res.status(500).send("Server error processing webhook.");
    } finally {
        client.release();
    }
};

// GET /api/billing/history - Fetches paginated list of client's recharge transactions

export const getRechargeHistory = async (req, res) => {
    // ⚠️ Assumes JWT middleware populates req.user.client_id and checks VIEW_PLANS permission
    if (!req.user || !req.user.features.includes('VIEW_PLANS')) {
        return res.status(403).json({ message: "Forbidden: Billing view access required." });
    }
    
    try {
        const pool = await getPool();
        const clientId = req.user.client_id;
        
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 25;
        const offset = (page - 1) * limit;

        // 1. Get Total Count for Pagination
        const countQuery = `SELECT COUNT(*) FROM client_recharge_transactions WHERE client_id = $1;`;
        const totalResult = await pool.query(countQuery, [clientId]);
        const totalRecords = parseInt(totalResult.rows[0].count);

        // 2. Get Paginated History Data
        const dataQuery = `
            SELECT 
                id, transaction_date, amount_paid, plan_months, 
                status, new_expiry_date, payment_gateway_ref
            FROM client_recharge_transactions
            WHERE client_id = $1
            ORDER BY transaction_date DESC
            LIMIT $2 OFFSET $3;
        `;
        
        const dataResult = await pool.query(dataQuery, [clientId, limit, offset]);
        const totalPages = Math.ceil(totalRecords / limit);

        res.status(200).json({ 
            message: "Recharge history fetched successfully.", 
            transactions: dataResult.rows,
            pagination: {
                currentPage: page, pageSize: limit, totalPages, totalRecords
            }
        });
    } catch (err) {
        console.error("Get Billing History Error:", err.message);
        res.status(500).json({ message: "Server error fetching billing history." });
    }
};