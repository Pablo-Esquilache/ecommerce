const express = require('express');
const router = express.Router();
const correoArgentinoService = require('../services/correoArgentino');

// Calcular costo de envio
router.post('/cotizar', async (req, res) => {
  try {
    const { codigo_postal, carrito } = req.body;

    if (!codigo_postal) {
      return res.status(400).json({ error: 'Falta el código postal de destino' });
    }

    // Calcular peso estimado del carrito (1kg por default si los productos no tienen peso)
    // En el futuro, el modelo 'Producto' debería tener un campo `peso`
    let pesoTotal = 1; 

    const cotizacion = await correoArgentinoService.cotizarEnvio(codigo_postal, pesoTotal);

    res.json(cotizacion);

  } catch (error) {
    console.error("Error al cotizar envío:", error);
    res.status(500).json({ error: 'Fallo al calcular el costo de envío' });
  }
});

module.exports = router;
