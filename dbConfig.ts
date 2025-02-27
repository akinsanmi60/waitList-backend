import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { config } from "dotenv";
import * as schema from "./shared/schema";
import { CONFIG } from "./config";

config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: CONFIG.DB_RECONNECT_INTERVAL,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
});

// Test the connection with retry logic - non-blocking
async function connectWithRetry(
  retriesLeft: number = CONFIG.DB_RECONNECT_TRIES
): Promise<boolean> {
  try {
    const client = await pool.connect();
    client.release(); // Release the client back to the pool
    console.log("Successfully connected to the database", "database");
    return true;
  } catch (err) {
    console.error(
      `Failed to connect to database (attempts remaining: ${retriesLeft}):`,
      err
    );
    if (retriesLeft > 0) {
      setTimeout(
        () => connectWithRetry(retriesLeft - 1),
        CONFIG.DB_RECONNECT_INTERVAL
      );
      return false;
    }
    throw err;
  }
}

// Initialize connection asynchronously - don't block startup
connectWithRetry().catch((err) => {
  console.error(
    "Failed to establish database connection after all retries:",
    err
  );
  // Don't exit process, let the application handle reconnection
  console.log("Database connection failed, will retry on demand", "database");
});

export const DB = drizzle(pool, { schema });
