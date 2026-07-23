const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

// Escudo Anti Fuerza Bruta
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 3, // Límite de 3 intentos
    message: { error: 'Demasiados intentos fallidos. Tu IP ha sido bloqueada temporalmente por 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Validar login y devolver JWT
router.post('/login', loginLimiter, adminController.login);

// Rutas de contraseña (públicas)
router.post('/forgot-password', adminController.forgotPassword);
router.post('/reset-password', adminController.resetPassword);

// Rutas protegidas (Requieren enviar token Bearer)
router.get('/dashboard', authMiddleware, adminController.getDashboard);
router.get('/clientes', authMiddleware, adminController.getAllClientes);
router.get('/clientes/excel', authMiddleware, adminController.exportClientesExcel);
router.put('/configuracion', authMiddleware, adminController.updateConfiguracion);

// Flujo de Cambio de Contraseña de 2 Pasos (OTP)
router.post('/change-password', authMiddleware, adminController.changePassword); // (Legacy o Fallback)
router.post('/request-change-otp', authMiddleware, adminController.requestChangeOtp);
router.post('/confirm-change-otp', authMiddleware, adminController.confirmChangeOtp);

// [NUEVO] Gestión de Administradores
router.get('/usuarios', authMiddleware, adminController.getAllAdmins);
router.post('/usuarios', authMiddleware, adminController.createAdmin);
router.delete('/usuarios/:id', authMiddleware, adminController.deleteAdmin);

module.exports = router;
