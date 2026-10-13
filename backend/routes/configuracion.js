const express = require('express');
const router = express.Router();
const db = require('../config/database');

// GET /api/configuracion (Público - Lista blanca estricta de columnas para la tienda)
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                email, telefono, direccion,
                instagram_activo, instagram_url,
                facebook_activo, facebook_url,
                tiktok_activo, tiktok_url,
                twitter_activo, twitter_url,
                banner_activo, banner_texto,
                descuento_activo, descuento_porcentaje,
                envio_gratis_activo, envio_gratis_limite,
                banco_nombre, banco_titular, banco_cuit, banco_cbu, banco_alias,
                banco_usd_nombre, banco_usd_titular, banco_usd_cuit, banco_usd_cbu, banco_usd_alias,
                correo_activo, correo_cp
            FROM configuracion 
            WHERE id = 1
        `;
        const { rows } = await db.query(query);
        if (rows.length === 0) {
            return res.json({});
        }
        res.json(rows[0]);
    } catch (e) {
        console.error('Error obteniendo configuracion publica:', e);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

module.exports = router;
