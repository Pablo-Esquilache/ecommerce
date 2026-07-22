const express = require('express');
const router = express.Router();
const pedidoController = require('../controllers/pedidoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Crear un pedido (Checkout - Público)
router.post('/checkout', pedidoController.createCheckout);

// Rutas Privadas (Admin)
router.get('/', authMiddleware, pedidoController.getAllPedidos);
// Si los clientes pueden ver su e-ticket públicamente usando su ID, esto puede quedar público, pero por seguridad general lo protegeremos si solo el admin entra. 
// En admin.js: verEticket usa /pedidos/:id. En public, no hay vista de ticket de pedido implementada desde ID suelto.
router.get('/:id', authMiddleware, pedidoController.getPedidoById);
router.put('/:id/estado', authMiddleware, pedidoController.updatePedidoStatus);

module.exports = router;
