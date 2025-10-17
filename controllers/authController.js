import { getPool } from '../db/pool.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { detectPlatform } from "../utils/detectPlatform.js";

const JWT_SECRET = process.env.JWT_SECRET || 'easybiz_secret';
const JWT_EXPIRE = '8h'; // token expiry

// Register a new user (for admin setup)
export const register = async (req, res) => {
  const { first_name, last_name, mobile, password, role, client_id } = req.body;
  try {
    // Check if mobile number exists
    const userExist = await pool.query('SELECT * FROM users WHERE mobile_num=$1', [mobile]);
    if (userExist.rows.length) return res.status(400).json({ error: 'Mobile number already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (first_name, last_name, mobile_num, password, role, client_id)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING id, first_name, last_name, mobile_num, role`,
      [first_name, last_name, mobile, hashedPassword, role, client_id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const pool = await getPool();

    // Body-parser's json() already parses JSON body
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ message: "Mobile number and password are required", data: "" });
    }
    // Check user exists
    const result = await pool.query('SELECT * FROM users WHERE mobile_num = $1', [mobile]);

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Generate JWT
    const token = jwt.sign(
      {
        id: user.id,
        client_id: user.client_id,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
      },
      process.env.JWT_SECRET || "supersecret",
      { expiresIn: "8h" }
    );

    const platform = detectPlatform(req.headers["user-agent"]);

    if (platform === "mobile") {
      console.log("Login from mobile:", req.headers["user-agent"]);
      // Send token in response for mobile apps
      return res.json({
        message: "Login successful (mobile)",
        token,
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
        },
      });
    } else {
      console.log("Login from web:", req.headers["user-agent"]);
      // Send cookie for browsers
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.json({
        message: "Login successful (web)",
        user: {
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          role: user.role,
        },
      });
    }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
