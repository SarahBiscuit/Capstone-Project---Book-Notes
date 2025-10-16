import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';
const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,  // Neon requires this for SSL
  },
  max: 30, // optional, max connections
});

db.on('connect', () => {
  console.log('Connected to Neon database');
});

db.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default db;
