require("dotenv").config();
const { Pool } = require("pg");
const { drizzle } = require("drizzle-orm/node-postgres");

// ✅ Create the pg Pool like normal:
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ✅ Pass the Pool to drizzle:
const db = drizzle(pool);

module.exports = db;
