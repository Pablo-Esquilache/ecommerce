const db = require('../config/database');

let checkedColumns = false;
async function ensureDigitalColumns() {
    if (checkedColumns) return;
    try {
        await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS tipo_producto VARCHAR(50) DEFAULT 'fisico';`);
        await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS archivo_digital VARCHAR(255);`);
        await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS video_url VARCHAR(255);`);
        await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS precio_usd DECIMAL(10,2) DEFAULT 0;`);
        checkedColumns = true;
    } catch(err) {
        console.warn('No se pudo verificar columnas en productos:', err.message);
    }
}

const Producto = {
  getAll: async (all = false) => {
    await ensureDigitalColumns();
    let query = 'SELECT * FROM productos WHERE activo = true AND stock > 0 ORDER BY id DESC';
    if(all) {
        query = 'SELECT * FROM productos ORDER BY id DESC';
    }
    const { rows } = await db.query(query);
    return rows;
  },

  toggleActive: async (id) => {
    const query = 'UPDATE productos SET activo = NOT activo WHERE id = $1 RETURNING *';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  getById: async (id) => {
    await ensureDigitalColumns();
    const query = 'SELECT * FROM productos WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  create: async (data) => {
    await ensureDigitalColumns();
    const { nombre, descripcion, precio, precio_usd, stock, categoria, subcategoria, sku, peso, dimensiones, imagen_1, imagen_2, imagen_3, tipo_producto, archivo_digital, video_url } = data;
    const cleanSubcategoria = (subcategoria === '' || subcategoria === undefined || subcategoria === null) ? null : subcategoria;
    
    const cleanPeso = (peso === "" || peso === undefined || peso === null || isNaN(peso)) ? null : Number(peso);
    const cleanStock = (stock === "" || stock === undefined || stock === null || isNaN(stock)) ? 0 : Number(stock);
    const cleanPrecio = (precio === "" || precio === undefined || precio === null || isNaN(precio)) ? 0 : Number(precio);
    const cleanPrecioUsd = (precio_usd === "" || precio_usd === undefined || precio_usd === null || isNaN(precio_usd)) ? 0 : Number(precio_usd);
    const cleanSku = (sku === "" || sku === undefined || sku === null) ? null : sku;
    const cleanDimensiones = (dimensiones === "" || dimensiones === undefined || dimensiones === null) ? null : dimensiones;
    const cleanCategoria = (categoria === "" || categoria === undefined || categoria === null) ? null : categoria;
    const cleanTipo = tipo_producto || 'fisico';
    const cleanArchivo = archivo_digital || null;
    const cleanVideo = video_url || null;

    const query = `
      INSERT INTO productos (nombre, descripcion, precio, precio_usd, stock, categoria, subcategoria, sku, peso, dimensiones, imagen_1, imagen_2, imagen_3, tipo_producto, archivo_digital, video_url)
      VALUES ($1, $2, $3, $15, $4, $5, $16, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    const values = [nombre, descripcion, cleanPrecio, cleanStock, cleanCategoria, cleanSku, cleanPeso, cleanDimensiones, imagen_1 || null, imagen_2 || null, imagen_3 || null, cleanTipo, cleanArchivo, cleanVideo, cleanPrecioUsd, cleanSubcategoria];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  update: async (id, data) => {
    await ensureDigitalColumns();
    const { nombre, descripcion, precio, precio_usd, stock, categoria, subcategoria, sku, peso, dimensiones, imagen_1, imagen_2, imagen_3, tipo_producto, archivo_digital, video_url } = data;
    const cleanSubcategoria = (subcategoria === '' || subcategoria === undefined || subcategoria === null) ? null : subcategoria;
    
    const cleanPeso = (peso === "" || peso === undefined || peso === null || isNaN(peso)) ? null : Number(peso);
    const cleanStock = (stock === "" || stock === undefined || stock === null || isNaN(stock)) ? 0 : Number(stock);
    const cleanPrecio = (precio === "" || precio === undefined || precio === null || isNaN(precio)) ? 0 : Number(precio);
    const cleanPrecioUsd = (precio_usd === "" || precio_usd === undefined || precio_usd === null || isNaN(precio_usd)) ? 0 : Number(precio_usd);
    const cleanSku = (sku === "" || sku === undefined || sku === null) ? null : sku;
    const cleanDimensiones = (dimensiones === "" || dimensiones === undefined || dimensiones === null) ? null : dimensiones;
    const cleanCategoria = (categoria === "" || categoria === undefined || categoria === null) ? null : categoria;
    const cleanTipo = tipo_producto || 'fisico';
    const cleanArchivo = archivo_digital || null;
    const cleanVideo = video_url || null;

    const query = `
      UPDATE productos 
      SET nombre = $1, descripcion = $2, precio = $3, precio_usd = $16, stock = $4, categoria = $5, subcategoria = $17, 
          sku = $6, peso = $7, dimensiones = $8, imagen_1 = coalesce($9, imagen_1), 
          imagen_2 = coalesce($10, imagen_2), imagen_3 = coalesce($11, imagen_3),
          tipo_producto = coalesce($13, tipo_producto),
          archivo_digital = coalesce($14, archivo_digital),
          video_url = coalesce($15, video_url)
      WHERE id = $12
      RETURNING *
    `;
    const values = [nombre, descripcion, cleanPrecio, cleanStock, cleanCategoria, cleanSku, cleanPeso, cleanDimensiones, imagen_1 || null, imagen_2 || null, imagen_3 || null, id, cleanTipo, cleanArchivo, cleanVideo, cleanPrecioUsd, cleanSubcategoria];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  delete: async (id) => {
    const query = 'DELETE FROM productos WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  updateStock: async (id, quantityVariation) => {
    // Si la variación es negativa, descuenta stock. Si es positiva, aumenta.
    const query = `
      UPDATE productos 
      SET stock = stock + $1 
      WHERE id = $2 AND (stock + $1) >= 0
      RETURNING stock
    `;
    const { rows } = await db.query(query, [quantityVariation, id]);
    return rows[0];
  }
};

module.exports = Producto;
