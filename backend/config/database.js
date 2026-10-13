const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const isCloudOrProd = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL || process.env.DB_SSL === 'true';

const poolConfig = process.env.DATABASE_URL 
    ? { 
        connectionString: process.env.DATABASE_URL, 
        ssl: { rejectUnauthorized: false },
        max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 2,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 8000
      }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: isCloudOrProd ? { rejectUnauthorized: false } : false,
        max: process.env.DB_MAX_CONNECTIONS ? parseInt(process.env.DB_MAX_CONNECTIONS, 10) : 2,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 8000
      };

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    console.error('Error inesperado en el pool de PostgreSQL', err);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
};
