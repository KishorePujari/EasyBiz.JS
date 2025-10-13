import pool from '../db/pool.js';

export const getAllPayments = async (req,res)=>{
  try{
    const result = await pool.query(`
      SELECT p.*, o.bill_number, c.name AS customer_name
      FROM customer_payments p
      LEFT JOIN customer_orders o ON p.order_id=o.id
      LEFT JOIN customers c ON o.customer_id=c.id
      ORDER BY p.payment_date DESC
    `);
    res.json(result.rows);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const addPayment = async (req,res)=>{
  const {order_id, store_id, user_id, payment_mode, amount, remarks} = req.body;
  try{
    const result = await pool.query(
      `INSERT INTO customer_payments (order_id, store_id, user_id, payment_mode, amount, remarks)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
       [order_id, store_id, user_id, payment_mode, amount, remarks]
    );
    // Update order paid_amount and payment_status
    await pool.query(
      `UPDATE customer_orders SET paid_amount = paid_amount + $1, 
       payment_status = CASE WHEN paid_amount + $1 >= net_amount THEN 'paid' ELSE payment_status END
       WHERE id=$2`,
       [amount, order_id]
    );
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};
