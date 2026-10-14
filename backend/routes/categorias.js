const express = require('express');
const router = express.Router();
const multer = require('multer');
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middlewares/authMiddleware');

const storage = multer.memoryStorage();
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.includes(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen válidos (JPG, PNG, WEBP, GIF).'));
  }
});
const uploadCatImages = upload.fields([{ name: 'imagen', maxCount: 1 }]);

router.get('/', categoriaController.getAll);
router.post('/', authMiddleware, uploadCatImages, categoriaController.create);
router.put('/:id', authMiddleware, uploadCatImages, categoriaController.update);
router.delete('/:nombre', authMiddleware, categoriaController.delete);

// Nuevo endpoint para el menú de árbol
router.get('/tree', categoriaController.getTree);

// Endpoints para subcategorías
router.post('/sub', authMiddleware, categoriaController.createSubcategoria);
router.delete('/sub/:id', authMiddleware, categoriaController.deleteSubcategoria);
router.delete('/sub/name/:nombre', authMiddleware, categoriaController.deleteSubcategoriaByName);

module.exports = router;
