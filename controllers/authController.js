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

// New function to fetch permissions based on role
const fetchUserRolePermissions = async (pool, role) => {
  // Assuming role_functionalities links roles to feature names
  const query = `
    SELECT
        f.functionality_key
    FROM
        role_functionalities rf  -- Junction table linking roles to features
    JOIN
        functionalities f ON rf.functionality_id = f.id
    JOIN
        roles r ON rf.role_id = r.id  -- Link to roles table
    WHERE
        r.user_role = $1  -- Filter using the role name passed as $1
  `;
  const result = await pool.query(query, [role]);
  return result.rows.map(row => row.functionality_key);
};

// NEW: Function to fetch user-specific overrides
const fetchUserOverrides = async (pool, userId) => {
  // Assuming user_functionality_overrides stores comma-separated strings
  const query = `
        SELECT add_functionalities, remove_functionalities 
        FROM user_functionality_overrides 
        WHERE user_id = $1
    `;
  const result = await pool.query(query, [userId]);
  const overrides = result.rows[0] || {};

  // Convert comma-separated strings to arrays, filtering out empty strings
  const adds = (overrides.add_functionalities || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const removes = (overrides.remove_functionalities || '')
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  return { adds, removes };
};

/**
 * Applies overrides to the base permissions.
 */
const applyOverrides = (basePermissions, overrides) => {
  let finalPermissions = new Set(basePermissions);

  // 1. Add specific permissions
  overrides.adds.forEach(feature => finalPermissions.add(feature));

  // 2. Remove specific permissions
  overrides.removes.forEach(feature => finalPermissions.delete(feature));

  return Array.from(finalPermissions);
};


export const login = async (req, res) => {
  try {

    const pool = await getPool();

    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ message: "Mobile number and password are required", data: "" });
    }

    // 1. Check user exists
    const userResult = await pool.query('SELECT * FROM users WHERE mobile_num = $1', [mobile]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 2. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // --- NEW: FETCH CLIENT DETAILS AND CHECK PLAN STATUS ---
    const clientResult = await pool.query(
      `SELECT plan_expiry_date FROM clients WHERE id = $1`,
      [user.client_id]
    );
    const client = clientResult.rows[0];

    if (!client) {
      return res.status(401).json({ message: "Client record not found." });
    }

    const expiryDate = new Date(client.plan_expiry_date);
    const now = new Date();

    // Determine the core access status
    const isPlanActive = expiryDate > now;


    // 3. FETCH BASE PERMISSIONS AND OVERRIDES (MODIFIED)
    const [basePermissions, overrides] = await Promise.all([
      fetchUserRolePermissions(pool, user.role),
      fetchUserOverrides(pool, user.id)
    ]);

    // 4. APPLY OVERRIDES TO GET FINAL PERMISSIONS
    const userPermissions = applyOverrides(basePermissions, overrides);

    if (!isPlanActive) {
      // Block all features except recharge/billing if the plan is expired
      userPermissions = ["DASHBOARD", "VIEW_BILLING", "RECHARGE"];
      loginMessage = "Plan Expired. Please recharge to continue...";
    }

    // 5. Generate JWT with the 'features' claim (Uses final userPermissions)
    const token = jwt.sign(
      {
        id: user.id,
        client_id: user.client_id,
        role: user.role,
        store_id: user.store_id,
        isPlanActive: isPlanActive,
        name: `${user.first_name} ${user.last_name}`,
        features: userPermissions,
      },
      JWT_SECRET || "supersecret",
      { expiresIn: "8h" }
    );

    const platform = detectPlatform(req.headers["user-agent"]);

    // Prepare the user object for the response
    const userResponse = {
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isPlanActive: isPlanActive,
      permissions: userPermissions, // FINAL list sent to client-side
    };

    // if (platform === "mobile") {
    //   console.log("Login from mobile:", req.headers["user-agent"]);
    //   return res.json({
    //     message: "Login successful (mobile)",
    //     token,
    //     user: userResponse,
    //   });
    // } else {
      
      // console.log("Login from web:", req.headers["user-agent"]);
      // res.cookie("token", token, {
      //   httpOnly: true,
      //   secure: false, //KKN process.env.NODE_ENV === "production",
      //   sameSite: "lax",// KKN"strict",
      //   maxAge: 24 * 60 * 60 * 1000,
      // });

    return res.json({
      message: "Login successful (web)",
      token: token,
      user: userResponse,
    });
    // }
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};
// GET /api/permissions/matrix
export const getPermissionsMatrix = async (req, res) => {
    // ⚠️ Authorization check: Must be an ADMIN or have permission to manage roles
    //KKN 
    // if (!req.user || req.user.role !== 'ADMIN') {
    //     return res.status(403).json({ message: "Forbidden: Admin access required." });
    // }

    try {
        const pool = await getPool();

        // 1. Fetch ALL Roles (e.g., 'ADMIN', 'MANAGER', 'STAFF')
        const rolesResult = await pool.query(`SELECT id, user_role FROM roles ORDER BY user_role ASC`);
        const roles = rolesResult.rows;

        // 2. Fetch ALL Functionalities (e.g., 'POS', 'MANAGE_PRODUCTS')
        const functionalitiesResult = await pool.query(`SELECT id, functionality_key FROM functionalities ORDER BY functionality_key ASC`);
        const functionalities = functionalitiesResult.rows;

        // 3. Fetch ALL Existing Assignments
        // This is the raw data used to check the boxes
        const assignmentsResult = await pool.query(`
          SELECT rf.role_id, rf.functionality_id 
          FROM role_functionalities rf`);
        
        // Convert assignments to a quick-lookup set: "ROLE_KEY-FUNCTION_ID"
        const assignmentSet = new Set(
            assignmentsResult.rows.map(row => `${row.role_id}-${row.functionality_id}`)
        );

        
        res.status(200).json({
            roles,
            functionalities,
            assignmentSet: Array.from(assignmentSet) // Send as an array for the frontend
        });

    } catch (err) {
        console.error("Error fetching permission matrix:", err.message);
        res.status(500).json({ message: "Failed to load permission data." });
    }
};

// POST/DELETE /api/permissions/assign - Handles adding or removing a role-functionality assignment

export const updatePermissionAssignment = async (req, res) => {
    // ⚠️ Authorization check: Must be an ADMIN
    //KKN
    // if (!req.user || req.user.role !== 'ADMIN') {
    //     return res.status(403).json({ message: "Forbidden: Only administrators can manage permissions." });
    // }

    // Expecting integer IDs from the frontend
    const { role_id, functionality_id } = req.body;
    const pool = await getPool();

    // Input validation
    if (!role_id || !functionality_id || isNaN(role_id) || isNaN(functionality_id)) {
        return res.status(400).json({ message: "Invalid role_id or functionality_id provided." });
    }

    try {
        if (req.method === 'POST') {
            // --- ADD ASSIGNMENT (Checkbox Checked) ---
            const insertQuery = `
                INSERT INTO role_functionalities (role_id, functionality_id)
                VALUES ($1, $2)
                -- Prevents duplicate errors if the assignment already exists
                ON CONFLICT (role_id, functionality_id) DO NOTHING;
            `;
            await pool.query(insertQuery, [role_id, functionality_id]);
            return res.status(200).json({ message: "Permission assigned successfully." });
            
        } else if (req.method === 'DELETE') {
            // --- REMOVE ASSIGNMENT (Checkbox Unchecked) ---
            const deleteQuery = `
                DELETE FROM role_functionalities
                WHERE role_id = $1 AND functionality_id = $2;
            `;
            await pool.query(deleteQuery, [role_id, functionality_id]);
            return res.status(200).json({ message: "Permission revoked successfully." });
        } else {
            return res.status(405).json({ message: "Method Not Allowed." });
        }

    } catch (error) {
        console.error("Database Error during permission update:", error.message);
        res.status(500).json({ message: "Server error while updating permissions." });
    }
};

// Login
// export const login = async (req, res) => {
//   try {
//     const pool = await getPool();

//     // Body-parser's json() already parses JSON body
//     const { mobile, password } = req.body;

//     if (!mobile || !password) {
//       return res.status(400).json({ message: "Mobile number and password are required", data: "" });
//     }
//     // Check user exists
//     const result = await pool.query('SELECT * FROM users WHERE mobile_num = $1', [mobile]);

//     const user = result.rows[0];

//     if (!user) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // compare password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // ✅ Generate JWT
//     const token = jwt.sign(
//       {
//         id: user.id,
//         client_id: user.client_id,
//         role: user.role,
//         name: `${user.first_name} ${user.last_name}`,
//       },
//       process.env.JWT_SECRET || "supersecret",
//       { expiresIn: "8h" }
//     );

//     const platform = detectPlatform(req.headers["user-agent"]);

//     if (platform === "mobile") {
//       console.log("Login from mobile:", req.headers["user-agent"]);
//       // Send token in response for mobile apps
//       return res.json({
//         message: "Login successful (mobile)",
//         token,
//         user: {
//           id: user.id,
//           name: `${user.first_name} ${user.last_name}`,
//           role: user.role,
//         },
//       });
//     } else {
//       console.log("Login from web:", req.headers["user-agent"]);
//       // Send cookie for browsers
//       res.cookie("token", token, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "strict",
//         maxAge: 24 * 60 * 60 * 1000,
//       });

//       return res.json({
//         message: "Login successful (web)",
//         user: {
//           id: user.id,
//           name: `${user.first_name} ${user.last_name}`,
//           role: user.role,
//         },
//       });
//     }
//   } catch (err) {
//     console.error("Login error:", err.message);
//     res.status(500).json({ message: "Server error" });
//   }
// };
