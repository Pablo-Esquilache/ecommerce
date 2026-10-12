const ArticuloBlog = require('../models/ArticuloBlog');
const supabase = require('../config/supabase');

async function uploadToSupabase(file, bucket = 'productos') {
  if (!file) return null;
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = (file.originalname || '').split('.').pop().replace(/[^a-zA-Z0-9]/g, '');
  const filename = `blog-${uniqueSuffix}.${ext || 'jpg'}`;

  const { data, error } = await supabase
    .storage
    .from(bucket)
    .upload(filename, file.buffer, {
      contentType: file.mimetype
    });

  if (error) {
    console.error('Error uploading blog image to Supabase:', error);
    throw new Error(`Error subiendo imagen al bucket "${bucket}": ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
  return publicUrlData.publicUrl;
}

const blogController = {
  getAll: async (req, res) => {
    try {
      const all = req.query.all === 'true';
      const articulos = await ArticuloBlog.getAll(all);
      res.json(articulos);
    } catch (error) {
      console.error('Error al obtener articulos del blog:', error);
      res.status(500).json({ error: 'Error al obtener publicaciones: ' + error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const { id } = req.params;
      const articulo = await ArticuloBlog.getById(id);
      if (!articulo) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }
      res.json(articulo);
    } catch (error) {
      console.error('Error al obtener articulo:', error);
      res.status(500).json({ error: 'Error al obtener el artículo: ' + error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { titulo, subtitulo, contenido, imagen_portada_url } = req.body;
      if (!titulo || !contenido) {
        return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
      }

      let imagen_portada = imagen_portada_url || null;
      if (req.file) {
        imagen_portada = await uploadToSupabase(req.file);
      } else if (req.files && req.files['imagen_portada']) {
        imagen_portada = await uploadToSupabase(req.files['imagen_portada'][0]);
      }

      const nuevoArticulo = await ArticuloBlog.create({
        titulo: titulo.trim(),
        subtitulo: (subtitulo || '').trim(),
        contenido: contenido.trim(),
        imagen_portada
      });

      res.status(201).json(nuevoArticulo);
    } catch (error) {
      console.error('Error al crear articulo:', error);
      res.status(500).json({ error: 'Error al crear la publicación: ' + error.message });
    }
  },

  update: async (req, res) => {
    try {
      const { id } = req.params;
      const { titulo, subtitulo, contenido, imagen_portada_url } = req.body;

      if (!titulo || !contenido) {
        return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
      }

      let imagen_portada = imagen_portada_url || null;
      if (req.file) {
        imagen_portada = await uploadToSupabase(req.file);
      } else if (req.files && req.files['imagen_portada']) {
        imagen_portada = await uploadToSupabase(req.files['imagen_portada'][0]);
      }

      const articuloActualizado = await ArticuloBlog.update(id, {
        titulo: titulo.trim(),
        subtitulo: (subtitulo || '').trim(),
        contenido: contenido.trim(),
        imagen_portada
      });

      if (!articuloActualizado) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      res.json(articuloActualizado);
    } catch (error) {
      console.error('Error al actualizar articulo:', error);
      res.status(500).json({ error: 'Error al actualizar la publicación: ' + error.message });
    }
  },

  toggleActive: async (req, res) => {
    try {
      const { id } = req.params;
      const articulo = await ArticuloBlog.toggleActive(id);
      if (!articulo) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }
      res.json(articulo);
    } catch (error) {
      console.error('Error al cambiar estado de articulo:', error);
      res.status(500).json({ error: 'Error al cambiar estado: ' + error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const { id } = req.params;
      const articulo = await ArticuloBlog.delete(id);
      if (!articulo) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }
      res.json({ success: true, message: 'Publicación eliminada exitosamente' });
    } catch (error) {
      console.error('Error al eliminar articulo:', error);
      res.status(500).json({ error: 'Error al eliminar publicación: ' + error.message });
    }
  }
};

module.exports = blogController;
