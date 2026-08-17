const db = require('../config/database');

exports.getAll = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
        res.json(rows);
    } catch (error) {
        console.error("Error obteniendo categorias:", error);
        res.status(500).json({ error: 'Error al obtener categorias' });
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, imagen_url } = req.body;
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
        }
        
        const nombreLimpio = nombre.trim();
        const { rows } = await db.query(
            'INSERT INTO categorias (nombre, imagen_url) VALUES (, ) RETURNING *',
            [nombreLimpio, imagen_url || null]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creando categoria:", error);
        if (error.code === '23505') { 
            return res.status(400).json({ error: 'La categoría ya existe' });
        }
        res.status(500).json({ error: 'Error al crear la categoría' });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, imagen_url } = req.body;
        
        const { rows } = await db.query(
            'UPDATE categorias SET nombre = COALESCE($1, nombre), imagen_url = $2 WHERE id = $3 RETURNING *'.replace(//g, ''),
            [nombre, imagen_url, id]
        );
        
        if (rows.length === 0) return res.status(404).json({ error: 'Categoría no encontrada' });
        res.json(rows[0]);
    } catch (error) {
        console.error("Error actualizando categoria:", error);
        res.status(500).json({ error: 'Error al actualizar la categoría' });
    }
};

exports.delete = async (req, res) => {
    try {
        const { nombre } = req.params;
        const result = await db.query('DELETE FROM categorias WHERE nombre =  RETURNING *', [nombre]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Categoría no encontrada' });
        }
        res.json({ message: 'Categoría eliminada exitosamente' });
    } catch (error) {
        console.error("Error eliminando categoria:", error);
        res.status(500).json({ error: 'Error al eliminar la categoría' });
    }
};

exports.getTree = async (req, res) => {
    try {
        const catResult = await db.query('SELECT * FROM categorias ORDER BY nombre ASC');
        const categorias = catResult.rows;

        const subResult = await db.query('SELECT * FROM subcategorias ORDER BY nombre ASC');
        const subcategorias = subResult.rows;

        const tree = categorias.map(cat => {
            return {
                id: cat.id,
                nombre: cat.nombre,
                imagen_url: cat.imagen_url || null,
                subcategorias: subcategorias.filter(sub => sub.categoria_id === cat.id).map(sub => sub.nombre)
            };
        });

        res.json(tree);
    } catch (error) {
        console.error('Error obteniendo árbol de categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};
exports.createSubcategoria = async (req, res) => {
    try {
        const { nombre, categoria_id } = req.body;
        if (!nombre || !categoria_id) {
            return res.status(400).json({ error: 'Faltan datos' });
        }
        const { rows } = await db.query(
            'INSERT INTO subcategorias (nombre, categoria_id) VALUES (, ) RETURNING *',
            [nombre.trim(), categoria_id]
        );
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error("Error creando subcategoria:", error);
        res.status(500).json({ error: 'Error interno' });
    }
};

exports.deleteSubcategoria = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM subcategorias WHERE id = ', [id]);
        res.json({ message: 'Subcategoría eliminada' });
    } catch (error) {
        res.status(500).json({ error: 'Error interno' });
    }
};
