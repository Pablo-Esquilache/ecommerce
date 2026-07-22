const db = require('../config/database');

const Pedido = {
  createOrder: async (pedidoData, detallesData) => {
    const client = await db.query('SELECT 1'); // Para forzar error si no hay pool, aunque mejor es transacciones raw
    // Nota: Como db.query envuelve una query base, podemos armar las queries separadas o con transacciones puras de pg.
    // Aquí implementamos una transacción manual para asegurar consistencia
    const connection = await require('../config/database').query('BEGIN'); // Start transact (fake, we need pure pg pool client for perfect transaction)
    // Para simplificar, usaremos las funciones estándar de nuestro db wrapper:
    try {
      await db.query('BEGIN');
      
      const { cliente_id, subtotal, costo_envio, total, metodo_pago } = pedidoData;
      
      const insertPedidoQuery = `
        INSERT INTO pedidos (cliente_id, subtotal, costo_envio, total, metodo_pago, estado)
        VALUES ($1, $2, $3, $4, $5, 'pendiente')
        RETURNING *
      `;
      const { rows: pedRows } = await db.query(insertPedidoQuery, [cliente_id, subtotal, costo_envio, total, metodo_pago]);
      const pedido = pedRows[0];

      const insertDetalleQuery = `
        INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (let det of detallesData) {
        // det = { producto_id, cantidad, precio_unitario }
        const { producto_id, cantidad, precio_unitario } = det;
        const detSubtotal = cantidad * precio_unitario;
        await db.query(insertDetalleQuery, [pedido.id, producto_id, cantidad, precio_unitario, detSubtotal]);
        
        // Descontar el stock (si controlamos stock local real)
        await db.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, producto_id]);
      }

      await db.query('COMMIT');
      return pedido;
    } catch (e) {
      await db.query('ROLLBACK');
      throw e;
    }
  },

  getAll: async () => {
    const query = `
      SELECT p.*, c.nombre || ' ' || c.apellido as cliente_nombre, c.email as cliente_email 
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      ORDER BY p.id DESC
    `;
    const { rows } = await db.query(query);
    return rows;
  },

  getById: async (id) => {
    // Info del pedido
    const { rows: pedidoRow } = await db.query(`
      SELECT p.*, c.nombre, c.apellido, c.email, c.direccion, c.ciudad, c.provincia, c.codigo_postal
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (!pedidoRow[0]) return null;

    // Info de los detalles
    const { rows: detalles } = await db.query(`
      SELECT d.*, pr.nombre as producto_nombre, pr.imagen_1, pr.tipo_producto, pr.archivo_digital, pr.video_url
      FROM detalles_pedido d
      JOIN productos pr ON d.producto_id = pr.id
      WHERE d.pedido_id = $1
    `, [id]);

    return { ...pedidoRow[0], detalles };
  },

  updateStatus: async (id, status) => {
    try {
        const query = 'UPDATE pedidos SET estado = $1, sincronizado_local = FALSE WHERE id = $2 RETURNING *';
        const { rows } = await db.query(query, [status, id]);
        return rows[0];
    } catch (e) {
        console.error("Error en updateStatus SQl:", e);
        throw e;
    }
  },
  
  updateMercadopagoRef: async (id, ref) => {
    const query = 'UPDATE pedidos SET preferencia_mp_id = $1 WHERE id = $2 RETURNING *';
    const { rows } = await db.query(query, [ref, id]);
    return rows[0];
  }
};

module.exports = Pedido;
