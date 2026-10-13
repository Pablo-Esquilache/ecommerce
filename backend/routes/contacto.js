const express = require('express');
const router = express.Router();
const contactoController = require('../controllers/contactoController');
const rateLimit = require('express-rate-limit');

// Escudo contra SPAM en el formulario de contacto (máximo 5 envíos por IP cada 15 minutos)
const contactoLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Has enviado demasiados mensajes recientemente. Por favor, espera unos minutos antes de intentar de nuevo.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/', contactoLimiter, contactoController.procesarContacto);

module.exports = router;
