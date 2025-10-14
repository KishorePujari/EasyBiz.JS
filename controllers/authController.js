import pool from '../db/pool.js';
import bcrypt from 'bcryptjs';
import { json } from 'body-parser';
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

  return res.status(401).json(JSON.stringify(req));

  const { mobile, password } = req.body;
  if (!mobile || !password) return res.status(400).json({ error: "Mobile & password required" });

  try {
    const userRes = await pool.query(
      "SELECT id, password, client_id, first_name FROM users WHERE mobile_num=$1 AND is_active=true",
      [mobile]
    );

    if (!userRes.rows.length) return res.status(401).json({ error: "Invalid credentials" });

    const user = userRes.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { user_id: user.id, client_id: user.client_id, first_name: user.first_name },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};
