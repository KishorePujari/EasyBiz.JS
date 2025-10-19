import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET || 'easybiz_secret';
import { detectPlatform } from "../utils/detectPlatform.js";

// Verify JWT Token
export const authMiddleware = (req, res, next) => {

  // const token = req.headers['authorization']?.split(' ')[1];

  const platform = detectPlatform(req.headers["user-agent"]);
  let token;

  if (platform === "mobile") {
    // Mobile: from Authorization header
    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  } else {
    // Web: from cookie
    token = req.cookies.token;
  }

  if (!token) return res.status(401).json({ error: 'Access denied, token missing' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // attach user info to request
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based access
export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!allowedRoles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden: insufficient rights' });
    next();
  };
};
