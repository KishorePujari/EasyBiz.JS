import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'easybiz_secret';
const JWT_EXPIRE = '8h'; // token expiry

// Register a new user (for admin setup)
export const register = async (req, res) => {
  const { first_name, last_name, mobile_num, password, role, client_id } = req.body;
  try {
    // Check if mobile number exists
    const userExist = await pool.query('SELECT * FROM users WHERE mobile_num=$1', [mobile_num]);
    if (userExist.rows.length) return res.status(400).json({ error: 'Mobile number already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, mobile_num, password, role, client_id)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id, first_name, last_name, mobile_num, role`,
      [first_name, last_name, mobile_num, hashedPassword, role, client_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
export const login = async (req, res) => {
  const { mobile_num, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE mobile_num=$1', [mobile_num]);
    if (!userRes.rows.length) return res.status(400).json({ error: 'Invalid mobile number or password' });

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid mobile number or password' });

    const token = jwt.sign({ id: user.id, role: user.role, client_id: user.client_id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
    res.json({ token, user: { id: user.id, first_name: user.first_name, last_name: user.last_name, mobile_num: user.mobile_num, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
