require('dotenv').config({path: 'backend/.env'});
const db = require('./backend/config/database');
async function run() {
  try {
    await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS correo_activo BOOLEAN DEFAULT FALSE;`);
    await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS correo_cp VARCHAR(10) DEFAULT '';`);
    console.log('Columns added');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
