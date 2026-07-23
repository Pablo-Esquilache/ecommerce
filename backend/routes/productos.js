const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configurar multer para subida de imágenes en memoria (Serverless)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const uploadImages = upload.fields([
  { name: 'imagen_1', maxCount: 1 },
  { name: 'imagen_2', maxCount: 1 },
  { name: 'imagen_3', maxCount: 1 },
  { name: 'archivo_digital', maxCount: 1 }
]);

// Rutas Públicas (Cualquiera puede ver productos)
router.get('/', productoController.getAllProductos);
router.get('/:id', productoController.getProductoById);

// Rutas Privadas (Admin)
router.get('/admin/all', authMiddleware, productoController.getAdminProductos);
router.get('/admin/:id', authMiddleware, productoController.getAdminProductoById);
router.post('/upload', authMiddleware, upload.single('file'), productoController.uploadExcel);
router.post('/', authMiddleware, uploadImages, productoController.createProducto);
router.put('/:id', authMiddleware, uploadImages, productoController.updateProducto);
router.patch('/:id/toggle', authMiddleware, productoController.toggleActive);
router.delete('/:id', authMiddleware, productoController.deleteProducto);

module.exports = router;
