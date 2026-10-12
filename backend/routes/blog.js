const express = require('express');
const router = express.Router();
const multer = require('multer');
const blogController = require('../controllers/blogController');
const authMiddleware = require('../middlewares/authMiddleware');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Rutas Administrativas (declaradas antes de las rutas paramétricas para evitar conflictos)
router.get('/admin/all', authMiddleware, (req, res, next) => {
  req.query.all = 'true';
  next();
}, blogController.getAll);

// Rutas Públicas
router.get('/', blogController.getAll);
router.get('/:id', blogController.getById);

// Otras Rutas Administrativas
router.post('/', authMiddleware, upload.single('imagen_portada'), blogController.create);
router.put('/:id', authMiddleware, upload.single('imagen_portada'), blogController.update);
router.patch('/:id/toggle', authMiddleware, blogController.toggleActive);
router.delete('/:id', authMiddleware, blogController.delete);

module.exports = router;
