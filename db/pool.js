// pool.js
import pg from "pg";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory (ESM compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;
let poolInstance = null;

async function createPool() 
{
  // Validate environment variables
  const requiredEnvVars = [
    "DB_USER",
    "DB_PASSWORD",
    "DB_HOST",
    "DB_PORT",
    "DB_NAME"
  ];

  requiredEnvVars.forEach((key) => {
    if (!process.env[key]) {
      console.error(`Missing required environment variable: ${key}`);
    }
  });
  let pool;

  try {
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,  // required for hosted DBs like Render, Neon, etc.
      },
    });


    // Test connection immediately
    await pool.connect()
      .then(client => {
        console.log("PostgreSQL connected successfully.");
        poolInstance = pool;
        client.release();
      })
      .catch(err => {
        console.error("Failed to connect to PostgreSQL:", err.message);
        if (err.message.includes("password must be a string")) {
          console.error("💡 Hint: Check your DB_PASSWORD value in .env");
          poolInstance = null;
        }
      });

    // Handle unexpected errors
    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL error:", err.message);
      poolInstance = null;
    });

  } catch (error) {
    console.error("Fatal error initializing PostgreSQL pool:", error.message);
    poolInstance = null;
  }
  return pool;
};

// Export a promise that resolves to a pool
export const getPool = async () => {
  if (!poolInstance) {
    await createPool();
    // poolInstance = 
  }
  return poolInstance;
};

export default getPool;
