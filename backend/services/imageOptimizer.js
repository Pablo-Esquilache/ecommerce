const sharp = require('sharp');

/**
 * Servicio centralizado de optimización y compresión de imágenes
 * Convierte automáticamente a WebP, redimensiona y reduce el peso hasta en un 95%.
 */
const imageOptimizer = {
  /**
   * Optimiza un archivo de imagen en memoria (Multer buffer).
   * @param {Object} file - Archivo de Multer ({ buffer, mimetype, originalname })
   * @param {Object} options - { maxWidth: 1200, quality: 82 }
   * @returns {Promise<{ buffer: Buffer, mimetype: string, extension: string, optimized: boolean }>}
   */
  optimize: async (file, options = {}) => {
    if (!file || !file.buffer) return null;

    const originalExt = (file.originalname || '').split('.').pop().toLowerCase().replace(/[^a-zA-Z0-9]/g, '');
    const isImage = (file.mimetype || '').startsWith('image/');
    const isGif = file.mimetype === 'image/gif';
    const isSvg = file.mimetype === 'image/svg+xml';

    // Si es un archivo digital no imagen (PDF, ZIP), o GIF/SVG, mantener sin alterar
    if (!isImage || isGif || isSvg) {
      return {
        buffer: file.buffer,
        mimetype: file.mimetype || 'application/octet-stream',
        extension: originalExt || 'bin',
        optimized: false
      };
    }

    const maxWidth = options.maxWidth || 1200;
    const quality = options.quality || 82;

    try {
      const optimizedBuffer = await sharp(file.buffer)
        .rotate() // Respeta orientación original de fotos de celulares (EXIF)
        .resize({
          width: maxWidth,
          withoutEnlargement: true // Nunca agrandar imágenes pequeñas
        })
        .webp({
          quality: quality,
          effort: 4
        })
        .toBuffer();

      const origSizeKb = (file.buffer.length / 1024).toFixed(1);
      const optSizeKb = (optimizedBuffer.length / 1024).toFixed(1);
      const reduction = Math.round((1 - (optimizedBuffer.length / file.buffer.length)) * 100);

      console.log(`🖼️ [ImageOptimizer] Optimizado exitoso: ${file.originalname || 'imagen'} (${origSizeKb} KB -> ${optSizeKb} KB, -${reduction}%)`);

      return {
        buffer: optimizedBuffer,
        mimetype: 'image/webp',
        extension: 'webp',
        optimized: true,
        originalSize: file.buffer.length,
        optimizedSize: optimizedBuffer.length
      };
    } catch (error) {
      console.warn('⚠️ [ImageOptimizer] No se pudo optimizar con sharp, manteniendo original:', error.message);
      return {
        buffer: file.buffer,
        mimetype: file.mimetype,
        extension: originalExt || 'jpg',
        optimized: false
      };
    }
  }
};

module.exports = imageOptimizer;
