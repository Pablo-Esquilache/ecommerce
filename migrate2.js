require('dotenv').config({path: 'backend/.env'});
const db = require('./backend/config/database');
async function run() {
  try {
    await db.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_envio VARCHAR(50) DEFAULT 'domicilio';`);
    console.log('Column metodo_envio added to pedidos');
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
