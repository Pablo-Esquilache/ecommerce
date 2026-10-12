const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
// Servicios que implementaremos luego:
// const mailer = require('../services/mailer');
const mercadopagoService = require('../services/mercadopago');

const pedidoController = {
  createCheckout: async (req, res) => {
    try {
      let { cliente, carrito, metodo_envio, metodo_pago } = req.body;

      // 1. Validaciones básicas de entrada
      if (!cliente || typeof cliente !== 'object' || !cliente.email || !cliente.nombre) {
        return res.status(400).json({ error: 'Nombre y correo electrónico del cliente son obligatorios.' });
      }

      if (!Array.isArray(carrito) || carrito.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío o el formato es inválido.' });
      }

      // 2. Gestionar cliente
      cliente.direccion = cliente.direccion || 'N/A';
      cliente.codigo_postal = cliente.codigo_postal || 'N/A';
      cliente.ciudad = cliente.ciudad || 'Digital';
      cliente.provincia = cliente.provincia || 'Digital';
      let clienteRecord = await Cliente.getByEmail(cliente.email);
      if (!clienteRecord) {
        clienteRecord = await Cliente.create(cliente);
      } else {
        clienteRecord = await Cliente.update(clienteRecord.id, cliente);
      }

      // 3. Validar productos, cantidades y calcular subtotales con datos fidedignos de la DB
      const db = require('../config/database');
      let conf = {};
      try {
        const { rows } = await db.query('SELECT * FROM configuracion WHERE id = 1');
        conf = rows[0] || {};
      } catch(e) { console.error('Error leyendo config en checkout: ', e); }

      let subtotal = 0;
      const detalles = [];
      const carritoValidado = [];
      let hayFisico = false;
      const isUSD = metodo_pago === 'transferencia_usd';

      for (let item of carrito) {
        const prodId = parseInt(item.id, 10);
        const cant = parseInt(item.cantidad, 10);

        // Exigir cantidad entera positiva mayor o igual a 1
        if (!prodId || isNaN(prodId) || !Number.isInteger(cant) || cant <= 0 || cant > 1000) {
          return res.status(400).json({ error: 'La cantidad o formato de los productos del carrito es inválida.' });
        }

        const resultDb = await db.query(
          'SELECT id, precio, precio_usd, nombre, tipo_producto, stock, activo FROM productos WHERE id = $1', 
          [prodId]
        );
        if (resultDb.rows.length === 0 || resultDb.rows[0].activo === false) {
          return res.status(400).json({ error: `El producto "${item.nombre || 'ID ' + prodId}" ya no se encuentra disponible.` });
        }

        const prodDb = resultDb.rows[0];
        const modalidadItem = item.modalidad || 'presencial';
        const esOnline = modalidadItem === 'online' || prodDb.tipo_producto === 'digital';

        if (!esOnline) {
          hayFisico = true;
          // Validación preventiva de stock en servidor
          if (prodDb.stock < cant) {
            return res.status(400).json({ 
              error: `Stock insuficiente para "${prodDb.nombre}". Disponible: ${prodDb.stock}, solicitado: ${cant}.` 
            });
          }
        }

        let precioReal = isUSD && Number(prodDb.precio_usd) > 0 ? Number(prodDb.precio_usd) : Number(prodDb.precio);
        if (conf.descuento_activo) {
          precioReal = precioReal * (1 - (Number(conf.descuento_porcentaje) || 0) / 100);
        }

        const itemSubtotal = precioReal * cant;
        subtotal += itemSubtotal;

        detalles.push({
          producto_id: prodDb.id,
          cantidad: cant,
          precio_unitario: precioReal,
          tipo_producto: prodDb.tipo_producto,
          modalidad: modalidadItem,
          producto_nombre: prodDb.nombre
        });

        carritoValidado.push({
          id: prodDb.id,
          nombre: prodDb.nombre,
          precio: precioReal,
          cantidad: cant,
          tipo_producto: prodDb.tipo_producto,
          modalidad: modalidadItem
        });
      }

      if (detalles.length === 0) {
        return res.status(400).json({ error: 'No hay productos válidos en el pedido.' });
      }

      carrito = carritoValidado;

      // 4. Validar costo de envío (imposibilitar negativos y omitir si es 100% digital/online)
      let costo_envio = Math.max(0, Number(req.body.costo_envio) || 0);
      if (!hayFisico) {
        costo_envio = 0;
      } else if (conf.envio_gratis_activo && subtotal >= Number(conf.envio_gratis_limite) && !isUSD) {
        costo_envio = 0;
      }

      const total = subtotal + costo_envio;

      const pedidoData = {
        cliente_id: clienteRecord.id,
        subtotal,
        costo_envio,
        total,
        metodo_pago,
        metodo_envio
      };

      // 5. Crear el pedido localmente en DB y descontar stock atómicamente
      const nuevoPedido = await Pedido.createOrder(pedidoData, detalles);

      // 6. Integración Mercado Pago (si aplica, crear preferencia antes de esperar emails)
      let preferenciaMpId = null;
      let initPoint = null;

      if (metodo_pago === 'mercadopago') {
        try {
          const prefMp = await mercadopagoService.crearPreferencia(nuevoPedido, carrito, clienteRecord);
          preferenciaMpId = prefMp.id;

          const isSandbox = process.env.MP_SANDBOX === 'true' || String(process.env.MP_ACCESS_TOKEN || '').startsWith('TEST-');
          initPoint = (isSandbox && prefMp.sandbox_init_point) 
            ? prefMp.sandbox_init_point 
            : (prefMp.init_point || prefMp.sandbox_init_point);

          console.log(`[MercadoPago] Preferencia creada: ${preferenciaMpId} (Modo ${isSandbox ? 'Sandbox' : 'Producción'}): ${initPoint}`);
        } catch (mpError) {
          console.error('🚨 [MercadoPago] Error creando preferencia:', mpError.message);
          // Compensación inmediata: cancelar el pedido creado para restaurar el stock reservado
          try {
            await Pedido.updateStatus(nuevoPedido.id, 'cancelado');
          } catch(cancelErr) {
            console.error('Error compensando pedido fallido en MP:', cancelErr);
          }
          return res.status(502).json({ 
            error: 'No se pudo conectar con Mercado Pago para generar la orden de cobro. Por favor reintenta en unos instantes.' 
          });
        }
      }

      // 7. Notificaciones por email (solo tras confirmar preferencia o pedido por transferencia)
      const emailService = require('../services/emailService');
      const emailPromises = [
        emailService.notificarAdminNuevoPedido(nuevoPedido)
      ];
      if (clienteRecord.email) {
        emailPromises.push(emailService.enviarCorreoNuevoPedidoCliente(clienteRecord.email, nuevoPedido, detalles));
      }

      // Alerta de stock bajo únicamente para productos físicos
      for (let det of detalles) {
        if (det.tipo_producto === 'digital' || det.modalidad === 'online') continue;
        try {
          const { rows } = await db.query('SELECT stock, nombre FROM productos WHERE id = $1', [det.producto_id]);
          if (rows.length > 0 && rows[0].stock <= 3) {
            emailPromises.push(emailService.enviarAlertaStock(det.producto_id, rows[0].nombre, rows[0].stock));
          }
        } catch(e) { console.error('Error enviando alerta stock', e); }
      }

      // Proteger tiempo de ejecución en serverless (Netlify 10s timeout)
      await Promise.race([
        Promise.allSettled(emailPromises),
        new Promise(resolve => setTimeout(() => {
          console.warn('⚠️ [Email] El envío de correos excedió 4500ms, continuando para responder al cliente.');
          resolve();
        }, 4500))
      ]);

      res.status(201).json({
        success: true,
        pedido: nuevoPedido,
        mpUrl: initPoint 
      });

    } catch (error) {
      console.error("Error en checkout:", error);
      res.status(400).json({ error: error.message || 'Error al procesar el pedido' });
    }
  },

  getAllPedidos: async (req, res) => {
    try {
      const pedidos = await Pedido.getAll();
      res.json(pedidos);
    } catch (error) {
      console.error('Error al obtener pedidos:', error);
      res.status(500).json({ error: 'Error al obtener pedidos: ' + error.message });
    }
  },

  getPedidoById: async (req, res) => {
    try {
      const pedido = await Pedido.getById(req.params.id);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
      res.json(pedido);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener pedido' });
    }
  },

  updatePedidoStatus: async (req, res) => {
    try {
      const { estado } = req.body;
      const pedidoActualizado = await Pedido.updateStatus(req.params.id, estado);
      
      const emailService = require('../services/emailService');
      const pedidoDetails = await Pedido.getById(req.params.id);

      if (pedidoDetails) {
          const emailPromises = [
              emailService.notificarAdminCambioEstado(pedidoDetails, estado)
          ];

          // 2. Notificar al CLIENTE si corresponde
          if (pedidoDetails.email) {
              if (estado === 'enviado') {
                  emailPromises.push(emailService.enviarCorreoEnvio(pedidoDetails.email, pedidoDetails));
              } else if (estado === 'pagado') {
                  emailPromises.push(emailService.enviarCorreoPago(pedidoDetails.email, pedidoDetails));
              } else if (estado === 'preparando_envio') {
                  emailPromises.push(emailService.enviarCorreoPreparandoEnvio(pedidoDetails.email, pedidoDetails));
              } else if (estado === 'cancelado') {
                  emailPromises.push(emailService.enviarCorreoCancelado(pedidoDetails.email, pedidoDetails));
              } else if (estado === 'entregado') {
                  emailPromises.push(emailService.enviarCorreoEntregado(pedidoDetails.email, pedidoDetails));
              }
          }
          await Promise.race([
              Promise.allSettled(emailPromises),
              new Promise(resolve => setTimeout(() => {
                  console.warn('⚠️ [Email] El envío de correos en cambio de estado excedió 4500ms, continuando para evitar timeout.');
                  resolve();
              }, 4500))
          ]);
      }

      res.json(pedidoActualizado);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar pedido' });
    }
  }
};

module.exports = pedidoController;
