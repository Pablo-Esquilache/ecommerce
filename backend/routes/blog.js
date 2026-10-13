const express = require('express');
const router = express.Router();
const multer = require('multer');
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middlewares/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (JPG, PNG, WEBP, GIF).'));
  }
});

// Rutas Administrativas (protegidas con JWT, declaradas antes de las paramétricas públicas)
router.get('/admin/all', authMiddleware, blogController.getAdminAll);
router.get('/admin/:id', authMiddleware, blogController.getAdminById);
router.post('/', authMiddleware, upload.single('imagen_portada'), blogController.create);
router.put('/:id', authMiddleware, upload.single('imagen_portada'), blogController.update);
router.patch('/:id/toggle', authMiddleware, blogController.toggleActive);
router.delete('/:id', authMiddleware, blogController.delete);

// Rutas Públicas (estrictamente filtradas por activo = true, ignoran req.query.all)
router.get('/', blogController.getPublicAll);
router.get('/:id', blogController.getPublicById);

module.exports = router;
