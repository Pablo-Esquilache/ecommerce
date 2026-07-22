const express = require('express');
const router = express.Router();
const db = require('../config/database');
const authMiddleware = require('../middlewares/authMiddleware');

// GET /api/categorias - Obtener todas las categorías
router.get('/', async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo categorias:", error);
        res.status(500).json({ error: 'Error al obtener categorias' });
    }
});

// POST /api/categorias - Crear una nueva categoría
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
        }
        
        // Convert to lowercase to maintain consistency, or just trim
        const nombreLimpio = nombre.trim();
        
        const { rows } = await db.query(
            'INSERT INTO categorias (nombre) VALUES ($1) RETURNING *',
            [nombreLimpio]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creando categoria:", error);
        if (error.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'La categoría ya existe' });
        }
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
});

// DELETE /api/categorias/:nombre - Eliminar categoría por nombre
router.delete('/:nombre', authMiddleware, async (req, res) => {
    try {
        const { nombre } = req.params;
        const result = await db.query('DELETE FROM categorias WHERE nombre = $1 RETURNING *', [nombre]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        
        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        console.error("Error eliminando categoria:", error);
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
});

module.exports = router;
