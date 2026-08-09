const db = require('../config/database');

const Pedido = {
  createOrder: async (pedidoData, detallesData) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      
      const { cliente_id, subtotal, costo_envio, total, metodo_pago } = pedidoData;
      
      const insertPedidoQuery = `
        INSERT INTO pedidos (cliente_id, subtotal, costo_envio, total, metodo_pago, estado)
        VALUES ($1, $2, $3, $4, $5, 'pendiente')
        RETURNING *
      `;
      const { rows: pedRows } = await client.query(insertPedidoQuery, [cliente_id, subtotal, costo_envio, total, metodo_pago]);
      const pedido = pedRows[0];

      const insertDetalleQuery = `
        INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES ($1, $2, $3, $4, $5)
      `;

      for (let det of detallesData) {
        const { producto_id, cantidad, precio_unitario } = det;
        let { tipo_producto } = det;
        if (!tipo_producto) {
            const { rows: prodRows } = await client.query('SELECT tipo_producto FROM productos WHERE id = $1', [producto_id]);
            if (prodRows[0]) tipo_producto = prodRows[0].tipo_producto;
        }
        const detSubtotal = cantidad * precio_unitario;
        await client.query(insertDetalleQuery, [pedido.id, producto_id, cantidad, precio_unitario, detSubtotal]);
        
        // Descontar el stock de forma atómica en la misma transacción SÓLO si NO es producto digital
        if (tipo_producto !== 'digital') {
            await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [cantidad, producto_id]);
        }
      }

      await client.query('COMMIT');
      return pedido;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
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
        const { rows: currRows } = await db.query('SELECT estado FROM pedidos WHERE id = $1', [id]);
        if (!currRows[0]) throw new Error('Pedido no encontrado');
        const estadoAnterior = currRows[0].estado;

        const query = 'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *';
        const { rows } = await db.query(query, [status, id]);
        
        if (status === 'cancelado' && estadoAnterior !== 'cancelado') {
            const { rows: detalles } = await db.query('SELECT d.producto_id, d.cantidad, p.tipo_producto FROM detalles_pedido d JOIN productos p ON d.producto_id = p.id WHERE d.pedido_id = $1', [id]);
            for (let det of detalles) {
                if (det.tipo_producto !== 'digital') {
                    await db.query('UPDATE productos SET stock = stock + $1 WHERE id = $2', [det.cantidad, det.producto_id]);
                }
            }
            console.log(`✅ [Stock] Stock restaurado (+unidades) para productos físicos por cancelación del pedido #${id}`);
        }

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
