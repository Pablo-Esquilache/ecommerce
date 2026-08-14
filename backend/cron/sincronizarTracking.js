require('dotenv').config({ path: __dirname + '/../.env' });
const cron = require('node-cron');
const db = require('../config/database');
const correoArgentinoService = require('../services/correoArgentino');
const Pedido = require('../models/Pedido');

// Programar la tarea para ejecutarse a las 09:00 y a las 17:00 todos los días
cron.schedule('0 9,17 * * *', async () => {
    console.log('[CRON] Iniciando sincronización de Tracking de Correo Argentino...');
    try {
        const confRes = await db.query('SELECT correo_activo FROM configuracion WHERE id = 1');
        if (!confRes.rows[0]?.correo_activo) {
            console.log('[CRON] Correo Argentino desactivado. Omitiendo sincronización.');
            return;
        }

        // Buscar pedidos en estado preparando_envio o enviado que tengan tracking_number
        const { rows: pedidos } = await db.query(`
            SELECT id, tracking_number, estado 
            FROM pedidos 
            WHERE tracking_number IS NOT NULL AND estado IN ('preparando_envio', 'enviado')
        `);

        console.log(`[CRON] Se encontraron ${pedidos.length} pedidos para consultar tracking.`);

        for (const p of pedidos) {
            try {
                const result = await correoArgentinoService.consultarTracking(p.tracking_number);
                
                if (result && result.success && result.estado) {
                    // Si el estado que devuelve el correo es distinto al actual y es un estado válido hacia adelante
                    if (result.estado === 'enviado' && p.estado === 'preparando_envio') {
                        console.log(`[CRON] Pedido #${p.id} cambió a Enviado.`);
                        await Pedido.updateEstado(p.id, 'enviado'); // Esto ya envía el mail gracias a models/Pedido.js
                    } else if (result.estado === 'entregado' && p.estado !== 'entregado') {
                        console.log(`[CRON] Pedido #${p.id} cambió a Entregado.`);
                        await Pedido.updateEstado(p.id, 'entregado');
                    }
                }
            } catch (err) {
                console.error(`[CRON] Error al procesar tracking para pedido #${p.id}:`, err.message);
            }
        }
        console.log('[CRON] Sincronización de Tracking finalizada.');
    } catch (e) {
        console.error('[CRON] Error general en sincronización:', e);
    }
});

console.log('✅ Cron de sincronización de tracking cargado (Ejecución 09:00 y 17:00)');
