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

function extractAndValidateYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/|live\/))([A-Za-z0-9_-]{11})/);
  if (match && /^[A-Za-z0-9_-]{11}$/.test(match[1])) {
    return match[1];
  }
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

const blogController = {
  // Ruta pública: NUNCA lee req.query.all, siempre devuelve sólo artículos con activo = true
  getPublicAll: async (req, res) => {
    try {
      const articulos = await ArticuloBlog.getAll(false);
      res.json(articulos);
    } catch (error) {
      console.error('Error al obtener articulos del blog:', error);
      res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
  },

  // Ruta administrativa: protegida con JWT, devuelve todos los artículos (publicados y ocultos)
  getAdminAll: async (req, res) => {
    try {
      const articulos = await ArticuloBlog.getAll(true);
      res.json(articulos);
    } catch (error) {
      console.error('Error al obtener articulos para admin:', error);
      res.status(500).json({ error: 'Error al obtener publicaciones' });
    }
  },

  // Ruta pública: SOLO devuelve el artículo si activo = true
  getPublicById: async (req, res) => {
    try {
      const { id } = req.params;
      const articulo = await ArticuloBlog.getById(id, false);
      if (!articulo) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }
      res.json(articulo);
    } catch (error) {
      console.error('Error al obtener articulo:', error);
      res.status(500).json({ error: 'Error al obtener el artículo' });
    }
  },

  // Ruta administrativa: permite al admin ver cualquier artículo por id para editarlo
  getAdminById: async (req, res) => {
    try {
      const { id } = req.params;
      const articulo = await ArticuloBlog.getById(id, true);
      if (!articulo) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }
      res.json(articulo);
    } catch (error) {
      console.error('Error al obtener articulo admin:', error);
      res.status(500).json({ error: 'Error al obtener el artículo' });
    }
  },

  // Compatibilidad con invocaciones directas
  getAll: async (req, res) => {
    if (req.user) return blogController.getAdminAll(req, res);
    return blogController.getPublicAll(req, res);
  },

  getById: async (req, res) => {
    if (req.user) return blogController.getAdminById(req, res);
    return blogController.getPublicById(req, res);
  },

  create: async (req, res) => {
    try {
      const { titulo, subtitulo, contenido, imagen_portada_url, youtube_url } = req.body;
      if (!titulo || !contenido) {
        return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
      }

      let imagen_portada = imagen_portada_url || null;
      if (req.file) {
        imagen_portada = await uploadToSupabase(req.file);
      } else if (req.files && req.files['imagen_portada']) {
        imagen_portada = await uploadToSupabase(req.files['imagen_portada'][0]);
      }

      let validatedYoutubeUrl = null;
      if (youtube_url && typeof youtube_url === 'string' && youtube_url.trim()) {
        const ytId = extractAndValidateYouTubeId(youtube_url);
        if (!ytId) {
          return res.status(400).json({ error: 'El enlace de YouTube no es válido. Debe contener un ID de 11 caracteres válido (ej: https://www.youtube.com/watch?v=... o https://youtu.be/...)' });
        }
        validatedYoutubeUrl = `https://www.youtube.com/watch?v=${ytId}`;
      }

      const nuevoArticulo = await ArticuloBlog.create({
        titulo: titulo.trim(),
        subtitulo: (subtitulo || '').trim(),
        contenido: contenido.trim(),
        imagen_portada,
        youtube_url: validatedYoutubeUrl
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
      const { titulo, subtitulo, contenido, imagen_portada_url, youtube_url } = req.body;

      if (!titulo || !contenido) {
        return res.status(400).json({ error: 'El título y el contenido son obligatorios' });
      }

      let imagen_portada = imagen_portada_url || null;
      if (req.file) {
        imagen_portada = await uploadToSupabase(req.file);
      } else if (req.files && req.files['imagen_portada']) {
        imagen_portada = await uploadToSupabase(req.files['imagen_portada'][0]);
      }

      const updateData = {
        titulo: titulo.trim(),
        subtitulo: (subtitulo || '').trim(),
        contenido: contenido.trim(),
        imagen_portada
      };

      if (youtube_url !== undefined) {
        if (youtube_url && typeof youtube_url === 'string' && youtube_url.trim()) {
          const ytId = extractAndValidateYouTubeId(youtube_url);
          if (!ytId) {
            return res.status(400).json({ error: 'El enlace de YouTube no es válido. Debe contener un ID de 11 caracteres válido.' });
          }
          updateData.youtube_url = `https://www.youtube.com/watch?v=${ytId}`;
        } else {
          updateData.youtube_url = null;
        }
      }

      const articuloActualizado = await ArticuloBlog.update(id, updateData);

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
