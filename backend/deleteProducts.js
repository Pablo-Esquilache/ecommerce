const pool = require('./config/database');

async function run() {
    try {
        console.log('Eliminando detalles de pedido y productos...');
        await pool.query('DELETE FROM detalles_pedido');
        await pool.query('DELETE FROM pedidos'); // optional, but good for cleaning test orders
        const res = await pool.query('DELETE FROM productos');
        console.log('Productos eliminados. Filas afectadas:', res.rowCount);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

run();
