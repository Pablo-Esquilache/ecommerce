const db = require('../config/database');

let checkedOtpColumn = false;
async function ensureOtpColumn() {
    if (checkedOtpColumn) return;
    try {
        await db.query(`ALTER TABLE administradores ADD COLUMN IF NOT EXISTS otp_code VARCHAR(10);`);
        await db.query(`ALTER TABLE administradores ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);`);
        await db.query(`ALTER TABLE administradores ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP;`);
        checkedOtpColumn = true;
    } catch (e) {
        console.warn('No se pudo verificar la columna otp_code:', e.message);
    }
}

const Admin = {
  getByEmail: async (email) => {
    await ensureOtpColumn();
    const query = 'SELECT * FROM administradores WHERE email = $1';
    const { rows } = await db.query(query, [email]);
    return rows[0];
  },
  
  getById: async (id) => {
    await ensureOtpColumn();
    const query = 'SELECT * FROM administradores WHERE id = $1';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  setResetToken: async (id, token, expires) => {
    await ensureOtpColumn();
    const query = 'UPDATE administradores SET reset_token = $1, reset_token_expires = $2 WHERE id = $3';
    await db.query(query, [token, expires, id]);
  },

  getByResetToken: async (token) => {
    await ensureOtpColumn();
    const query = 'SELECT * FROM administradores WHERE reset_token = $1';
    const { rows } = await db.query(query, [token]);
    return rows[0];
  },

  updatePassword: async (id, hashedPassword) => {
    await ensureOtpColumn();
    const query = 'UPDATE administradores SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2';
    await db.query(query, [hashedPassword, id]);
  },
  
  setOtp: async (id, otp) => {
    await ensureOtpColumn();
    const query = 'UPDATE administradores SET otp_code = $1 WHERE id = $2';
    await db.query(query, [otp, id]);
  },
  
  clearOtp: async (id) => {
    await ensureOtpColumn();
    const query = 'UPDATE administradores SET otp_code = NULL WHERE id = $1';
    await db.query(query, [id]);
  },
  
  getDashboardStats: async () => {
    const stats = {};
    const ventasQ = "SELECT SUM(total) as total_ingresos, COUNT(*) as cantidad_pedidos FROM pedidos WHERE estado NOT IN ('pendiente', 'cancelado')";
    const { rows: ventas } = await db.query(ventasQ);
    stats.ventas = ventas[0];
    const bajoStockQ = "SELECT id, nombre, stock FROM productos WHERE stock <= 3 ORDER BY stock ASC LIMIT 10";
    const { rows: bajoStock } = await db.query(bajoStockQ);
    stats.bajoStock = bajoStock;
    const recientesQ = "SELECT id, total, estado, metodo_pago, creado_en FROM pedidos WHERE DATE(creado_en AT TIME ZONE 'UTC' AT TIME ZONE 'America/Argentina/Buenos_Aires') = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Argentina/Buenos_Aires')::date ORDER BY id DESC";
    const { rows: recientes } = await db.query(recientesQ);
    stats.pedidosRecientes = recientes;
    return stats;
  },

  // [NUEVO] Gestión de Múltiples Administradores
  getAll: async () => {
    const query = 'SELECT id, email, nombre, creado_en FROM administradores ORDER BY id ASC';
    const { rows } = await db.query(query);
    return rows;
  },
  
  create: async (email, hashedPassword, nombre) => {
    const query = 'INSERT INTO administradores (email, password, nombre) VALUES ($1, $2, $3) RETURNING id, email, nombre, creado_en';
    const { rows } = await db.query(query, [email, hashedPassword, nombre]);
    return rows[0];
  },
  
  delete: async (id) => {
    const query = 'DELETE FROM administradores WHERE id = $1 RETURNING id';
    const { rows } = await db.query(query, [id]);
    return rows[0];
  }
};

module.exports = Admin;
