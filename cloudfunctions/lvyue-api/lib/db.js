'use strict';

const { Pool } = require('pg');

const ssl = String(process.env.PGSSL || 'true') === 'false'
  ? false
  : { rejectUnauthorized: String(process.env.PGSSL_REJECT_UNAUTHORIZED || 'true') !== 'false' };

const pool = new Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  ssl,
  max: Number(process.env.PGPOOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
  application_name: 'lvyue-cloudfunction'
});

async function query(text, params, client) {
  return (client || pool).query(text, params || []);
}

async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, transaction };
