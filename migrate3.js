require('dotenv').config({path: 'backend/.env'});
const db = require('./backend/config/database');

async function fixConfigTable() {
  try {
    console.log('Adding USD bank columns...');
    await db.query(`
      ALTER TABLE configuracion 
      ADD COLUMN IF NOT EXISTS banco_usd_nombre VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS banco_usd_titular VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS banco_usd_cuit VARCHAR(50) DEFAULT '',
      ADD COLUMN IF NOT EXISTS banco_usd_cbu VARCHAR(100) DEFAULT '',
      ADD COLUMN IF NOT EXISTS banco_usd_alias VARCHAR(100) DEFAULT ''
    `);
    console.log('Columns added successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

fixConfigTable();
