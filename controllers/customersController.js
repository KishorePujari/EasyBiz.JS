import pool from '../db/pool.js';

export const getAllCustomers = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getCustomerById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const addCustomer = async (req, res) => {
  const { name, phone, email, address, credit_limit } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO customers (name, phone, email, address, credit_limit) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, phone, email, address, credit_limit || 0]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateCustomer = async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, credit_limit } = req.body;
  try {
    const result = await pool.query(
      `UPDATE customers SET name=$1, phone=$2, email=$3, address=$4, credit_limit=$5, created_at=now() WHERE id=$6 RETURNING *`,
      [name, phone, email, address, credit_limit, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const deleteCustomer = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM customers WHERE id=$1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
};


export const getCustomerByMobile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM customers WHERE phone = $1', [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
