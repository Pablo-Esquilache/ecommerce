const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://ecommerce_db_ax2f_user:d1VVANePTrMqTHArvtS2GgZe0aIXilZ3@dpg-d75d7s4r85hc739n1vgg-a.oregon-postgres.render.com/ecommerce_db_ax2f",
    ssl: { rejectUnauthorized: false }
});

async function runSchema() {
    try {
        console.log('Leyendo schema.sql...');
        const sql = fs.readFileSync(path.join(__dirname, 'database', 'schema.sql'), 'utf-8');
        console.log('Ejecutando schema en Render...');
        await pool.query(sql);
        console.log('¡Tablas creadas con éxito!');
        process.exit(0);
    } catch (e) {
        console.error('Error creando tablas:', e);
        process.exit(1);
    }
}

runSchema();
