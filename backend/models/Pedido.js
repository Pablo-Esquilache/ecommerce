const db = require('../config/database');

let columnsChecked = false;
async function ensurePedidoColumns(clientOrDb) {
  if (columnsChecked) return;
  try {
    await clientOrDb.query(`
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS metodo_envio VARCHAR(100);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS direccion_envio VARCHAR(255);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS ciudad_envio VARCHAR(100);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS provincia_envio VARCHAR(100);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS cp_envio VARCHAR(20);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS nombre_receptor VARCHAR(200);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS telefono_receptor VARCHAR(50);
      ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS email_pago_enviado BOOLEAN DEFAULT FALSE;
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
      
      const { 
        cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio,
        direccion_envio, ciudad_envio, provincia_envio, cp_envio, nombre_receptor, telefono_receptor 
      } = pedidoData;
      
      const insertPedidoQuery = `
        INSERT INTO pedidos (
          cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio, estado,
          direccion_envio, ciudad_envio, provincia_envio, cp_envio, nombre_receptor, telefono_receptor
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, $8, $9, $10, $11, $12)
        RETURNING *
      `;
      const { rows: pedRows } = await client.query(insertPedidoQuery, [
        cliente_id, subtotal, costo_envio, total, metodo_pago, metodo_envio,
        direccion_envio || null, ciudad_envio || null, provincia_envio || null, cp_envio || null, nombre_receptor || null, telefono_receptor || null
      ]);
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
    await ensurePedidoColumns(db);
    const query = `
      SELECT p.*, 
             COALESCE(p.nombre_receptor, c.nombre || ' ' || c.apellido) as cliente_nombre, 
             c.email as cliente_email,
             COALESCE(p.telefono_receptor, c.telefono) as cliente_telefono,
             COALESCE(p.direccion_envio, c.direccion) as cliente_direccion,
             COALESCE(p.ciudad_envio, c.ciudad) as cliente_ciudad,
             COALESCE(p.provincia_envio, c.provincia) as cliente_provincia,
             COALESCE(p.cp_envio, c.codigo_postal) as cliente_cp,
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
    await ensurePedidoColumns(db);
    // Info del pedido con snapshot congelado de envío
    const { rows: pedidoRow } = await db.query(`
      SELECT p.*, 
             COALESCE(p.nombre_receptor, c.nombre || ' ' || c.apellido) as cliente_nombre,
             c.nombre, c.apellido, c.email,
             COALESCE(p.telefono_receptor, c.telefono) as telefono,
             COALESCE(p.direccion_envio, c.direccion) as direccion, 
             COALESCE(p.ciudad_envio, c.ciudad) as ciudad, 
             COALESCE(p.provincia_envio, c.provincia) as provincia, 
             COALESCE(p.cp_envio, c.codigo_postal) as codigo_postal
      FROM pedidos p
      JOIN clientes c ON p.cliente_id = c.id
      WHERE p.id = $1
    `, [id]);

    if (!pedidoRow[0]) return null;

    // Info de los detalles
    const { rows: detalles } = await db.query(`
      SELECT d.*, pr.nombre as producto_nombre, pr.descripcion as producto_descripcion, 
             pr.imagen_1, pr.tipo_producto, pr.archivo_digital, pr.video_url, 
             pr.fecha_inicio, pr.fecha_cierre_inscripcion, pr.lugar
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

        // Si se reabre un pedido cancelado, verificar y re-descontar stock atómicamente
        if (estadoAnterior === 'cancelado' && status !== 'cancelado') {
            const { rows: detalles } = await client.query(
                'SELECT d.producto_id, d.cantidad, d.modalidad, p.tipo_producto, p.nombre, p.stock FROM detalles_pedido d JOIN productos p ON d.producto_id = p.id WHERE d.pedido_id = $1 FOR UPDATE', 
                [id]
            );
            for (let det of detalles) {
                const esOnline = det.modalidad === 'online' || det.tipo_producto === 'digital';
                if (!esOnline) {
                    if (det.stock < det.cantidad) {
                        const err = new Error(`No se puede reabrir el pedido: Stock insuficiente para "${det.nombre}". Disponible: ${det.stock}, requerido: ${det.cantidad}.`);
                        err.isStockError = true;
                        throw err;
                    }
                    await client.query('UPDATE productos SET stock = stock - $1 WHERE id = $2', [det.cantidad, det.producto_id]);
                }
            }
            console.log(`✅ [Stock] Stock re-descontado (-unidades) por reapertura del pedido #${id}`);
        }

        const query = 'UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *';
        const { rows } = await client.query(query, [status, id]);

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
    const query = "UPDATE pedidos SET estado = 'pagado' WHERE id = $1 AND estado = 'pendiente' RETURNING *";
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },

  marcarEmailPagoEnviado: async (id) => {
    const query = "UPDATE pedidos SET email_pago_enviado = true WHERE id = $1 RETURNING *";
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  }
};

module.exports = Pedido;
