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

    const { rows } = await db.query('SELECT COUNT(*) as count FROM articulos_blog');
    if (parseInt(rows[0]?.count || '0', 10) === 0) {
      const sampleQuery = `
        INSERT INTO articulos_blog (titulo, subtitulo, contenido, imagen_portada, activo)
        VALUES ($1, $2, $3, $4, true)
      `;
      await db.query(sampleQuery, [
        'El Arte Sagrado de la Iconografía Bizantina: Ventana a lo Invisible',
        'Una introducción a la contemplación, el simbolismo teológico y la técnica tradicional del temple al huevo sobre madera.',
        'La iconografía no es simplemente un estilo artístico ni una manifestación pictórica meramente decorativa; en la tradición cristiana oriental y bizantina, el icono es considerado una teología visual, una "ventana al Reino de los Cielos".\n\nCada elemento compositivo posee un sentido teológico y místico profundo:\n\n1. La Luz Increada y el Pan de Oro: A diferencia de la pintura occidental del Renacimiento que utiliza claroscuro y proyecta sombras terrenales, el icono bizantino no proyecta sombras. Todo está bañado e irradiado por la Luz divina increada (la luz del Tabor), representada por los fondos y nimbos en hoja de oro bruñida.\n\n2. La Perspectiva Inversa: En lugar de converger las líneas de fuga hacia un punto imaginario en el fondo del cuadro, las líneas convergen hacia el corazón del observador. El icono mira a quien reza ante él, invitándolo al recogimiento y a la comunión.\n\n3. La Alquimia Sagrada del Temple al Huevo: Pintar un icono es un camino de oración y paciencia. Se emplean pigmentos minerales puros (tierras naturales, lapislázuli, malaquita, cinabrio) emulsionados con yema de huevo y vino blanco, aplicados capa sobre capa sobre una tabla de madera curada preparada con gesso tradicional.\n\nTe invitamos a recorrer nuestro espacio, conocer nuestros talleres presenciales y online, y acompañarnos en este camino de arte y contemplación.',
        'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop'
      ]);
    }
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

  getById: async (id) => {
    await ensureTable();
    const query = 'SELECT * FROM articulos_blog WHERE id = $1';
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
