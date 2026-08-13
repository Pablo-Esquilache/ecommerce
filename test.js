require('dotenv').config({path: 'backend/.env'});
const db = require('./backend/config/database');
async function test() {
  const res = await db.query('SELECT correo_activo, correo_cp FROM configuracion WHERE id = 1');
  console.log(res.rows[0]);
  process.exit(0);
}
test();
