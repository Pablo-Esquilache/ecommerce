const db = require('./config/database');

async function alterTable() {
    try {
        await db.query(`ALTER TABLE administradores ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);`);
        console.log('✅ Columna otp_code agregada exitosamente a la tabla administradores.');
    } catch (e) {
        console.error('❌ Error alterando tabla:', e);
    } finally {
        process.exit();
    }
}

alterTable();
