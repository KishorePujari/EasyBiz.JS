import pool from '../db/pool.js';

export const getAllOrders = async (req,res)=>{
  try{
    const result = await pool.query(`
      SELECT o.*, c.name AS customer_name, s.name AS store_name
      FROM customer_orders o
      LEFT JOIN customers c ON o.customer_id=c.id
      LEFT JOIN stores s ON o.store_id=s.id
      ORDER BY o.bill_date DESC
    `);
    res.json(result.rows);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const getOrderById = async (req,res)=>{
  const {id}=req.params;
  try{
    const result = await pool.query('SELECT * FROM customer_orders WHERE id=$1',[id]);
    if(!result.rows.length) return res.status(404).json({error:'Order not found'});
    res.json(result.rows[0]);
  } catch(err){ res.status(500).json({error: err.message}); }
};

export const createOrder = async (req,res)=>{
  const {customer_id, store_id, user_id, bill_number, total_amount, discount, tax, net_amount, paid_amount, payment_status, items} = req.body;
  const client = await pool.connect();
  try{
    await client.query('BEGIN');
    const orderRes = await client.query(
      `INSERT INTO customer_orders (customer_id, store_id, user_id, bill_number, total_amount, discount, tax, net_amount, paid_amount, payment_status)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [customer_id, store_id, user_id, bill_number, total_amount, discount, tax, net_amount, paid_amount||0, payment_status||'unpaid']
    );
    const orderId = orderRes.rows[0].id;
    
    for(let item of items){
      await client.query(
        `INSERT INTO customer_order_items (order_id, product_id, variant_id, quantity, unit_price, discount, tax, total_price)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
         [orderId, item.product_id, item.variant_id, item.quantity, item.unit_price, item.discount||0, item.tax||0, item.total_price]
      );
    }
    await client.query('COMMIT');
    res.json(orderRes.rows[0]);
  } catch(err){
    await client.query('ROLLBACK');
    res.status(500).json({error: err.message});
  } finally {
    client.release();
  }
};

export const updateOrder = async (req,res)=>{
  // Similar to createOrder but with update statements
};

export const deleteOrder = async (req,res)=>{
  const {id}=req.params;
  try{
    await pool.query('DELETE FROM customer_orders WHERE id=$1',[id]);
    res.json({success:true});
  } catch(err){ res.status(500).json({error: err.message}); }
};
