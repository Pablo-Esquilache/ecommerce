const express = require('express');
const router = express.Router();
const categoriaController = require('../controllers/categoriaController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/', categoriaController.getAll);
router.post('/', authMiddleware, categoriaController.create);
router.put('/:id', authMiddleware, categoriaController.update);
router.delete('/:nombre', authMiddleware, categoriaController.delete);

// Nuevo endpoint para el menú de árbol
router.get('/tree', categoriaController.getTree);

module.exports = router;

// Endpoints para subcategorías
router.post('/sub', authMiddleware, categoriaController.createSubcategoria);
router.delete('/sub/:id', authMiddleware, categoriaController.deleteSubcategoria);
