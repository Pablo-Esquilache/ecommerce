const db = require('../config/database');

let tableChecked = false;

async function ensureTable() {
  if (tableChecked) return;
  const ddl = `
    CREATE TABLE IF NOT EXISTS articulos_blog (
      id SERIAL PRIMARY KEY,
      titulo VARCHAR(255) NOT NULL,
      subtitulo TEXT,
      contenido TEXT NOT NULL,
      imagen_portada TEXT,
      activo BOOLEAN DEFAULT true,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(ddl);
    tableChecked = true;
  } catch (err) {
    console.error('Error asegurando tabla articulos_blog:', err);
  }
}

const ArticuloBlog = {
  getAll: async (all = false) => {
    await ensureTable();
    let query = 'SELECT * FROM articulos_blog WHERE activo = true ORDER BY creado_en DESC';
    if (all) {
      query = 'SELECT * FROM articulos_blog ORDER BY creado_en DESC';
    }
    const { rows } = await db.query(query);
    return rows;
  },

  getById: async (id, all = false) => {
    await ensureTable();
    let query = 'SELECT * FROM articulos_blog WHERE id = $1 AND activo = true';
    if (all) {
      query = 'SELECT * FROM articulos_blog WHERE id = $1';
    }
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  create: async (data) => {
    await ensureTable();
    const { titulo, subtitulo, contenido, imagen_portada } = data;
    const query = `
      INSERT INTO articulos_blog (titulo, subtitulo, contenido, imagen_portada, activo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING *
    `;
    const values = [titulo, subtitulo || '', contenido, imagen_portada || null];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  update: async (id, data) => {
    await ensureTable();
    const { titulo, subtitulo, contenido, imagen_portada } = data;
    let query = `
      UPDATE articulos_blog 
      SET titulo = $1, subtitulo = $2, contenido = $3, actualizado_en = CURRENT_TIMESTAMP
    `;
    const values = [titulo, subtitulo || '', contenido];

    if (imagen_portada) {
      query += `, imagen_portada = $4 WHERE id = $5 RETURNING *`;
      values.push(imagen_portada, id);
    } else {
      query += ` WHERE id = $4 RETURNING *`;
      values.push(id);
    }

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  toggleActive: async (id) => {
    await ensureTable();
    const query = 'UPDATE articulos_blog SET activo = NOT activo, actualizado_en = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  delete: async (id) => {
    await ensureTable();
    const query = 'DELETE FROM articulos_blog WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
};

module.exports = ArticuloBlog;
