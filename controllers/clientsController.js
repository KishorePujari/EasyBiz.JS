import pool from '../db/pool.js';

export const getAllClients = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getClientById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);
        if (!result.rows.length) return res.status(404).json({ error: 'Customer not found' });
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const addClient = async (req, res) => {
    const { name, phone, email, address, credit_limit } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO clients (name, phone, email, address, credit_limit) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
            [name, phone, email, address, credit_limit || 0]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateClient = async (req, res) => {
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

export const deleteClient = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM clients WHERE id=$1', [id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
};
export const me = async (req, res) => {
    try {
        const clientRes = await pool.query(
            "SELECT id, business_name, name FROM clients WHERE id=$1",
            [req.user.client_id]
        );
        if (!clientRes.rows.length) return res.status(404).json({ error: "Client not found" });
        res.json(clientRes.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};