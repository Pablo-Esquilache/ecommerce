const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productoController = require('../controllers/productoController');
const authMiddleware = require('../middlewares/authMiddleware');

// Configurar multer para subida de imágenes en memoria (Serverless)
const storage = multer.memoryStorage();

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedDigitalMimes = [
  ...allowedImageMimes,
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'application/octet-stream'
];

const upload = multer({
  storage: storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB máximo
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'archivo_digital') {
      if (allowedDigitalMimes.includes(file.mimetype)) {
        return cb(null, true);
      }
      return cb(new Error('Formato de archivo digital no permitido (se permite PDF, ZIP o imagen).'));
    }
    if (allowedImageMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Formato de imagen no permitido (se permite JPG, PNG, WEBP o GIF).'));
  }
});

const uploadImages = upload.fields([
  { name: 'imagen_1', maxCount: 1 },
  { name: 'imagen_2', maxCount: 1 },
  { name: 'imagen_3', maxCount: 1 },
  { name: 'archivo_digital', maxCount: 1 }
]);

const uploadExcel = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB máximo
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const excelMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    if (['.xlsx', '.xls', '.csv'].includes(ext) || excelMimes.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV.'));
  }
});

// Rutas Públicas (Cualquiera puede ver productos)
router.get('/', productoController.getAllProductos);
router.get('/:id', productoController.getProductoById);

// Rutas Privadas (Admin)
router.get('/admin/all', authMiddleware, productoController.getAdminProductos);
router.get('/admin/:id', authMiddleware, productoController.getAdminProductoById);
router.post('/upload', authMiddleware, uploadExcel.single('file'), productoController.uploadExcel);
router.post('/', authMiddleware, uploadImages, productoController.createProducto);
router.put('/:id', authMiddleware, uploadImages, productoController.updateProducto);
router.patch('/:id/toggle', authMiddleware, productoController.toggleActive);
router.delete('/:id', authMiddleware, productoController.deleteProducto);

module.exports = router;
