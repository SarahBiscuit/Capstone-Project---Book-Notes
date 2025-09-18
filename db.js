// db.js
import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  max: 30, // optional: max connections in the pool
});

export default db;