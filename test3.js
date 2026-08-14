require('dotenv').config({path: 'backend/.env'});
const db = require('./backend/config/database');
async function test() {
  try {
    const query = `UPDATE configuracion SET email = $1, telefono = $2, direccion = $3, admin_nombre = $4, instagram_activo = $5, instagram_url = $6, facebook_activo = $7, facebook_url = $8, tiktok_activo = $9, tiktok_url = $10, twitter_activo = $11, twitter_url = $12, banner_activo = $13, banner_texto = $14, descuento_activo = $15, descuento_porcentaje = $16, envio_gratis_activo = $17, envio_gratis_limite = $18, sync_activo = $19, sync_api_key = $20, email_admin = $21, banco_nombre = $22, banco_titular = $23, banco_cuit = $24, banco_cbu = $25, banco_alias = $26, banco_usd_nombre = $27, banco_usd_titular = $28, banco_usd_cuit = $29, banco_usd_cbu = $30, banco_usd_alias = $31, correo_activo = $32, correo_cp = $33 WHERE id = 1 RETURNING *`;
    const values = ['', '', '', 'Admin', false, '', false, '', false, '', false, '', false, '', false, 0, false, 0, false, '', '', '', '', '', '', '', '', '', '', '', '', true, '6455'];
    await db.query(query, values);
    console.log('success');
  } catch(e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}
test();
