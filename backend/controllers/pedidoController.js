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
        // [NUEVO] Leer precio oficial de la base de datos
        const resultDb = await db.query('SELECT precio, nombre FROM productos WHERE id = $1', [item.id]);
        if (resultDb.rows.length === 0) continue; // Ignorar productos que ya no existen
        
        let precioReal = Number(resultDb.rows[0].precio);
        if (conf.descuento_activo) {
            precioReal = precioReal * (1 - (Number(conf.descuento_porcentaje) || 0) / 100);
        }
        
        // Auto-actualizamos los datos del ítem del carrito (silenciosamente)
        item.precio = precioReal;
        item.nombre = resultDb.rows[0].nombre;
        
        const itemSubtotal = precioReal * item.cantidad;
        subtotal += itemSubtotal;
        detalles.push({
          producto_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: precioReal
        });
        
        carritoValidado.push(item);
      }
      
      // Aseguramos que MP solo reciba los ítems válidos
      carrito = carritoValidado;


      // Costo de envio
      let costo_envio = 0; // Se asume 0 por ahora a falta de API externa
      if (conf.envio_gratis_activo && subtotal >= conf.envio_gratis_limite) {
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
      emailService.notificarAdminNuevoPedido(nuevoPedido).catch(e => console.error('Error notif admin nuevo pedido', e));
      if (clienteRecord.email) {
          emailService.enviarCorreoNuevoPedidoCliente(clienteRecord.email, nuevoPedido).catch(e => console.error('Error notif cliente nuevo pedido', e));
      }

      // [NUEVO] Check for low stock alerts (<= 3)
      for (let det of detalles) {
          try {
              const { rows } = await db.query('SELECT stock, nombre FROM productos WHERE id = $1', [det.producto_id]);
              if (rows.length > 0 && rows[0].stock <= 3) {
                  emailService.enviarAlertaStock(det.producto_id, rows[0].nombre, rows[0].stock).catch(e => console.error(e));
              }
          } catch(e) { console.error('Error enviando alerta stock', e); }
      }

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
          // 1. Siempre notificar al ADMIN de cualquier cambio de estado
          emailService.notificarAdminCambioEstado(pedidoDetails, estado).catch(e => console.error(e));

          // 2. Notificar al CLIENTE si corresponde
          if (pedidoDetails.email) {
              if (estado === 'enviado') {
                  emailService.enviarCorreoEnvio(pedidoDetails.email, pedidoDetails).catch(e => console.error(e));
              } else if (estado === 'pagado') {
                  emailService.enviarCorreoPago(pedidoDetails.email, pedidoDetails).catch(e => console.error(e));
              } else if (estado === 'preparando_envio') {
                  emailService.enviarCorreoPreparandoEnvio(pedidoDetails.email, pedidoDetails).catch(e => console.error(e));
              } else if (estado === 'cancelado') {
                  emailService.enviarCorreoCancelado(pedidoDetails.email, pedidoDetails).catch(e => console.error(e));
              } else if (estado === 'entregado') {
                  emailService.enviarCorreoEntregado(pedidoDetails.email, pedidoDetails).catch(e => console.error(e));
              }
          }
      }

      res.json(pedidoActualizado);
    } catch (error) {
      res.status(500).json({ error: 'Error al actualizar pedido' });
    }
  }
};

module.exports = pedidoController;
