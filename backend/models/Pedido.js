const db = require('../config/database');

let columnsChecked = false;
async function ensurePedidoColumns(clientOrDb) {
  if (columnsChecked) return;
  try {
    await clientOrDb.query(`
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_envio VARCHAR(100);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
      ALTER TABLE detalles_pedido ADD COLUMN IF NOT EXISTS modalidad VARCHAR(50);
    `);
    columnsChecked = true;
  } catch (err) {
    console.error('Error asegurando columnas de pedidos:', err);
  }
}

const Pedido = {
  createOrder: async (pedidoData, detallesData) => {
    const client = await db.connect();
    try {
      await ensurePedidoColumns(client);
      await client.query('BEGIN');
      
      const { cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio } = pedidoData;
      
      const insertPedidoQuery = `
        INSERT INTO pedidos (cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio, estado)
        VALUES ($1, $2, $3, $4, $5, $6, 'pendiente')
        RETURNING *
      `;
      const { rows: pedRows } = await client.query(insertPedidoQuery, [cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio]);
      const pedido = pedRows[0];

      const insertDetalleQuery = `
        INSERT INTO detalles_pedido (pedido_id, producto_id, cantidad, precio_unitario, subtotal, modalidad)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (let det of detallesData) {
        const { producto_id, cantidad, precio_unitario, modalidad } = det;
        let { tipo_producto } = det;
        if (!tipo_producto) {
            const { rows: prodRows } = await client.query('SELECT tipo_producto FROM productos WHERE id = $1', [producto_id]);
            if (prodRows[0]) tipo_producto = prodRows[0].tipo_producto;
        }
        const detSubtotal = cantidad * precio_unitario;
        await client.query(insertDetalleQuery, [pedido.id, producto_id, cantidad, precio_unitario, detSubtotal, modalidad || null]);
        
        // Descontar el stock de forma atómica en la misma transacción SÓLO si NO es producto digital NI modalidad online
        const esOnline = det.modalidad === 'online' || tipo_producto === 'digital';
        if (!esOnline) {
            const stockRes = await client.query(
                'UPDATE productos SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock', 
                [cantidad, producto_id]
            );
            if (stockRes.rowCount === 0) {
                throw new Error(`Stock insuficiente o producto agotado: "${det.producto_nombre || 'ID ' + producto_id}".`);
            }
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
      SELECT p.*, 
             c.nombre || ' ' || c.apellido as cliente_nombre, 
             c.email as cliente_email,
             c.telefono as cliente_telefono,
             c.direccion as cliente_direccion,
             c.ciudad as cliente_ciudad,
             c.provincia as cliente_provincia,
             c.codigo_postal as cliente_cp,
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', d.id,
                     'producto_id', d.producto_id,
                     'producto_nombre', pr.nombre,
                     'tipo_producto', pr.tipo_producto,
                     'modalidad', d.modalidad,
                     'cantidad', d.cantidad,
                     'precio_unitario', d.precio_unitario,
                     'subtotal', d.subtotal
                   )
                 )
                 FROM detalles_pedido d
                 LEFT JOIN productos pr ON d.producto_id = pr.id
                 WHERE d.pedido_id = p.id
               ),
               '[]'::json
             ) as items
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
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const { rows: currRows } = await client.query('SELECT estado FROM pedidos WHERE id = $1 FOR UPDATE', [id]);
        if (!currRows[0]) throw new Error('Pedido no encontrado');
        const estadoAnterior = currRows[0].estado;

        const query = 'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *';
        const { rows } = await client.query(query, [status, id]);
        
        if (status === 'cancelado' && estadoAnterior !== 'cancelado') {
            const { rows: detalles } = await client.query(
                'SELECT d.producto_id, d.cantidad, d.modalidad, p.tipo_producto FROM detalles_pedido d JOIN productos p ON d.producto_id = p.id WHERE d.pedido_id = $1', 
                [id]
            );
            for (let det of detalles) {
                const esOnline = det.modalidad === 'online' || det.tipo_producto === 'digital';
                if (!esOnline) {
                    await client.query('UPDATE productos SET stock = stock + $1 WHERE id = $2', [det.cantidad, det.producto_id]);
                }
            }
            console.log(`✅ [Stock] Stock restaurado (+unidades) para productos físicos/presenciales por cancelación del pedido #${id}`);
        }

        await client.query('COMMIT');
        return rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Error en updateStatus SQL:", e);
        throw e;
    } finally {
        client.release();
    }
  },
  
  updateMercadopagoRef: async (id, ref) => {
    const query = 'UPDATE pedidos SET preferencia_mp_id = $1 WHERE id = $2 RETURNING *';
    const { rows } = await db.query(query, [ref, id]);
    return rows[0];
  },

  marcarComoPagado: async (id) => {
    const query = "UPDATE pedidos SET estado = 'pagado' WHERE id = $1 AND estado <> 'pagado' RETURNING *";
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }
};

module.exports = Pedido;
