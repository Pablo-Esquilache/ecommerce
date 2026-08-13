const express = require('express');
const router = express.Router();
const correoArgentinoService = require('../services/correoArgentino');

const db = require('../config/database');

// Calcular costo de envio
router.post('/cotizar', async (req, res) => {
  try {
    const { codigo_postal, carrito } = req.body;

    if (!codigo_postal) {
      return res.status(400).json({ error: 'Falta el código postal de destino' });
    }
    if (!carrito || !carrito.length) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }

    // Verificar si el correo está activo en la configuración
    const confRes = await db.query('SELECT correo_activo, correo_cp FROM configuracion WHERE id = 1');
    const conf = confRes.rows[0] || {};
    
    if (!conf.correo_activo || !conf.correo_cp) {
      // Si no está activo o falta el CP de origen, devolvemos un flag para que el frontend use el fallback/envío a convenir
      return res.json({ success: false, reason: 'inactivo', message: 'Cotización dinámica desactivada.' });
    }

    // Obtener peso real de los productos físicos en la base de datos
    let pesoTotalGramos = 0;
    const ids = carrito.map(item => item.id);
    const { rows } = await db.query('SELECT id, peso, tipo_producto FROM productos WHERE id = ANY($1::int[])', [ids]);

    for (let item of carrito) {
      const dbProduct = rows.find(r => r.id == item.id);
      if (dbProduct && dbProduct.tipo_producto !== 'digital') {
        const pesoProducto = parseFloat(dbProduct.peso) || 1000; // 1kg por defecto si no está cargado
        pesoTotalGramos += pesoProducto * item.cantidad;
      }
    }

    if (pesoTotalGramos === 0) {
      // Si el carrito es full digital, el frontend no debería llamar a cotizar, pero por las dudas
      return res.json({ success: true, isDigital: true, opciones: [] });
    }

    const cotizacion = await correoArgentinoService.cotizarEnvio(conf.correo_cp, codigo_postal, pesoTotalGramos);
    res.json(cotizacion);

  } catch (error) {
    console.error("Error al cotizar envío:", error);
    res.status(500).json({ error: 'Fallo al calcular el costo de envío' });
  }
});

module.exports = router;
