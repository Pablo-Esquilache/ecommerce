const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// Escudo contra ataques o spam de compras automatizadas (máximo 10 pedidos cada 15 minutos por IP)
const checkoutLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Demasiadas solicitudes de compra consecutivas. Por favor espera unos minutos antes de reintentar.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Crear un pedido (Checkout - Público con protección Rate-Limit)
router.post('/checkout', checkoutLimiter, pedidoController.createCheckout);

// Rutas Privadas (Admin)
router.get('/', authMiddleware, pedidoController.getAllPedidos);
router.get('/:id', authMiddleware, pedidoController.getPedidoById);
router.put('/:id/estado', authMiddleware, pedidoController.updatePedidoStatus);

module.exports = router;
