const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
// Servicios que implementaremos luego:
// const mailer = require('../services/mailer');
const mercadopagoService = require('../services/mercadopago');

const pedidoController = {
  createCheckout: async (req, res) => {
    try {
      let { cliente, carrito, metodo_envio, metodo_pago } = req.body;

      // 1. Gestionar cliente (ver si existe su email, si no crearlo)
      let clienteRecord = await Cliente.getByEmail(cliente.email);
      if (!clienteRecord) {
        clienteRecord = await Cliente.create(cliente);
      } else {
        clienteRecord = await Cliente.update(clienteRecord.id, cliente);
      }

      // 2. Calcular totales (Aplicando Reglas de Configuración)
      const db = require('../config/database');
      let conf = {};
      try {
          const { rows } = await db.query('SELECT * FROM configuracion WHERE id = 1');
          conf = rows[0] || {};
      } catch(e) { console.error('Error leyendo config en checkout: ', e); }

      let subtotal = 0;
      const detalles = [];
      const carritoValidado = [];

      for (let item of carrito) {
        // [NUEVO] Leer precio oficial de la base de datos y tipo de producto
        // [NUEVO] Leer precio oficial de la base de datos y tipo de producto
        const resultDb = await db.query('SELECT precio, precio_usd, nombre, tipo_producto FROM productos WHERE id = $1', [item.id]);
        if (resultDb.rows.length === 0) continue; // Ignorar productos que ya no existen
        
        let isUSD = metodo_pago === 'transferencia_usd';
        let precioReal = isUSD && Number(resultDb.rows[0].precio_usd) > 0 ? Number(resultDb.rows[0].precio_usd) : Number(resultDb.rows[0].precio);
        if (conf.descuento_activo) {
            precioReal = precioReal * (1 - (Number(conf.descuento_porcentaje) || 0) / 100);
        }
        
        // Auto-actualizamos los datos del ítem del carrito (silenciosamente)
        item.precio = precioReal;
        item.nombre = resultDb.rows[0].nombre;
        item.tipo_producto = resultDb.rows[0].tipo_producto;
        
        const itemSubtotal = precioReal * item.cantidad;
        subtotal += itemSubtotal;
        detalles.push({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: precioReal,
          tipo_producto: resultDb.rows[0].tipo_producto
        });
        
        carritoValidado.push(item);
      }
      
      // Aseguramos que MP solo reciba los ítems válidos
      carrito = carritoValidado;


      // Costo de envio
      let costo_envio = 0; // Se asume 0 por ahora a falta de API externa
      const isUSD = metodo_pago === 'transferencia_usd';
      if (conf.envio_gratis_activo && subtotal >= conf.envio_gratis_limite && !isUSD) {
          costo_envio = 0; // Confirmamos que es cero
      }
      
      let total = subtotal + costo_envio;

      const pedidoData = {
        cliente_id: clienteRecord.id,
        subtotal,
        costo_envio,
        total,
        metodo_pago
      };

      // 3. Crear el pedido localmente en la DB
      const nuevoPedido = await Pedido.createOrder(pedidoData, detalles);

      const emailService = require('../services/emailService');
      const emailPromises = [
          emailService.notificarAdminNuevoPedido(nuevoPedido)
      ];
      if (clienteRecord.email) {
          emailPromises.push(emailService.enviarCorreoNuevoPedidoCliente(clienteRecord.email, nuevoPedido));
      }

      // [NUEVO] Check for low stock alerts (<= 3) únicamente para productos físicos
      for (let det of detalles) {
          if (det.tipo_producto === 'digital') continue;
          try {
              const { rows } = await db.query('SELECT stock, nombre FROM productos WHERE id = $1', [det.producto_id]);
              if (rows.length > 0 && rows[0].stock <= 3) {
                  emailPromises.push(emailService.enviarAlertaStock(det.producto_id, rows[0].nombre, rows[0].stock));
              }
          } catch(e) { console.error('Error enviando alerta stock', e); }
      }
      
      // Proteger el tiempo de ejecución en Serverless (Netlify Lambda timeout): damos máximo 4500ms para emails
      await Promise.race([
          Promise.allSettled(emailPromises),
          new Promise(resolve => setTimeout(() => {
              console.warn('⚠️ [Email] El envío de correos excedió 4500ms, continuando para evitar timeout.');
              resolve();
          }, 4500))
      ]);

      // 4. Integraciones (MercadoPago si aplica, y enviar Email)
      let preferenciaMpId = null;
      let initPoint = null;

      if (metodo_pago === 'mercadopago') {
        const prefMp = await mercadopagoService.crearPreferencia(nuevoPedido, carrito, clienteRecord);
        preferenciaMpId = prefMp.id;
        // Using real init_point to show exact transaction value
        initPoint = prefMp.init_point; 
        
        // Normalmente guardaremos la ref aca, pero por ahora no hay campo en DB
        // await Pedido.updateMercadopagoRef(nuevoPedido.id, preferenciaMpId);
      } else {
        // Enviar mail inmediatamente si es transferencia
        // await mailer.enviarConfirmacionTransferencia(nuevoPedido, clienteRecord, detalles);
      }

      res.status(201).json({
        success: true,
        pedido: nuevoPedido,
        mpUrl: initPoint 
      });

    } catch (error) {
      console.error("Error en checkout:", error);
      res.status(500).json({ error: 'Error al procesar el pedido' });
    }
  },

  getAllPedidos: async (req, res) => {
    try {
      const pedidos = await Pedido.getAll();
      res.json(pedidos);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener pedidos' });
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
