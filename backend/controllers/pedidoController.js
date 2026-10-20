const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');
// Servicios que implementaremos luego:
// const mailer = require('../services/mailer');
const mercadopagoService = require('../services/mercadopago');

const pedidoController = {
  createCheckout: async (req, res) => {
    try {
      let { cliente, carrito, metodo_envio, metodo_pago } = req.body;

      // 1. Validaciones básicas de entrada y lista blanca de métodos de pago
      if (!cliente || typeof cliente !== 'object' || !cliente.email || !cliente.nombre) {
        return res.status(400).json({ error: 'Nombre y correo electrónico del cliente son obligatorios.' });
      }

      if (!Array.isArray(carrito) || carrito.length === 0) {
        return res.status(400).json({ error: 'El carrito está vacío o el formato es inválido.' });
      }

      const METODOS_PAGO_VALIDOS = ['mercadopago', 'transferencia', 'transferencia_usd'];
      if (!metodo_pago || !METODOS_PAGO_VALIDOS.includes(metodo_pago)) {
        return res.status(400).json({ error: 'Método de pago no válido.' });
      }

      // 2. Validar productos, cantidades y calcular subtotales con datos fidedignos de la DB
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

        // Decisión estricta de modalidad desde la base de datos (evita manipulación fraudulenta de stock y envío)
        let modalidadItem = 'presencial';
        let esOnline = false;

        if (prodDb.tipo_producto === 'digital') {
          modalidadItem = 'online';
          esOnline = true;
        } else if (prodDb.tipo_producto === 'taller') {
          // Sólo los talleres admiten elección entre 'online' y 'presencial'
          const rawMod = (item.modalidad || '').toString().toLowerCase().trim();
          modalidadItem = (rawMod === 'online') ? 'online' : 'presencial';
          esOnline = (modalidadItem === 'online');
        } else {
          // Obras físicas (iconografías), viajes/retiros, etc.: SIEMPRE presencial/físico
          modalidadItem = 'presencial';
          esOnline = false;
        }

        // Control de stock / cupo (aplica a obras físicas, talleres presenciales y viajes)
        if (!esOnline) {
          if (prodDb.stock < cant) {
            return res.status(409).json({ 
              error: `Stock insuficiente para "${prodDb.nombre}". Disponible: ${prodDb.stock}, solicitado: ${cant}.` 
            });
          }
        }

        // Determinar si contiene obras físicas tangibles (iconografías) que requieran encomienda postal
        const esObraFisica = (!prodDb.tipo_producto || prodDb.tipo_producto === 'fisico');
        if (esObraFisica) {
          hayFisico = true;
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

      // 3. Validar costo de envío (imposibilitar evasiones y respetar configuración del admin)
      let costo_envio = 0;
      let metodoEnvioFinal = metodo_envio || 'Digital';

      if (hayFisico) {
        // Para obras físicas es obligatorio contar con dirección y código postal válidos
        const cpCliente = (cliente.codigo_postal || '').toString().trim();
        const dirCliente = (cliente.direccion || '').toString().trim();
        if (!cpCliente || cpCliente === 'N/A' || !dirCliente || dirCliente === 'N/A') {
          return res.status(400).json({ error: 'La dirección y el código postal son obligatorios para el envío de obras físicas.' });
        }

        const envioGratisAplica = Boolean(conf.envio_gratis_activo && subtotal >= Number(conf.envio_gratis_limite) && !isUSD);
        if (envioGratisAplica) {
          costo_envio = 0;
          metodoEnvioFinal = 'Envío Gratis';
        } else if (conf.correo_activo && conf.correo_cp) {
          // El admin tiene Correo Argentino activo: intentamos cotizar en servidor
          let cotizacionExitosa = false;
          try {
            const correoArgentinoService = require('../services/correoArgentino');
            let pesoTotalGramos = 0;
            for (let it of detalles) {
              if (!it.tipo_producto || it.tipo_producto === 'fisico') {
                const prodDbRow = await db.query('SELECT peso FROM productos WHERE id = $1', [it.producto_id]);
                const peso = parseFloat(prodDbRow.rows[0]?.peso) || 1000;
                pesoTotalGramos += peso * it.cantidad;
              }
            }
            const cotizacion = await correoArgentinoService.cotizarEnvio(conf.correo_cp, cpCliente, pesoTotalGramos);
            if (cotizacion && cotizacion.opciones && cotizacion.opciones.length > 0) {
              const tarifasValidas = cotizacion.opciones.map(o => Number(o.costo !== undefined ? o.costo : o.valor)).filter(v => !isNaN(v) && v > 0);
              if (tarifasValidas.length > 0) {
                const clienteEnvioMonto = Number(req.body.costo_envio) || 0;
                const coincide = tarifasValidas.some(t => Math.abs(t - clienteEnvioMonto) < 1.0);
                costo_envio = coincide ? clienteEnvioMonto : Math.min(...tarifasValidas);
                cotizacionExitosa = true;
                metodoEnvioFinal = req.body.metodo_envio || 'Correo Argentino';
              }
            }
          } catch (errEnvio) {
            console.warn('⚠️ No se pudo cotizar con Correo Argentino en checkout:', errEnvio.message);
          }

          // Si Correo Argentino falló al cotizar o no devolvió opciones:
          // Pasa a contingencia "A convenir con el vendedor" (costo $0 en checkout, flete se arregla por fuera)
          if (!cotizacionExitosa) {
            costo_envio = 0;
            metodoEnvioFinal = 'A convenir con el vendedor';
          }
        } else {
          // El admin tiene Correo Argentino desactivado: Envío por fuera / a convenir
          costo_envio = 0;
          metodoEnvioFinal = 'A convenir con el vendedor';
        }
      } else {
        // No hay obras físicas (talleres presenciales/online, viajes o cursos digitales)
        costo_envio = 0;
        metodoEnvioFinal = req.body.metodo_envio || (detalles.some(d => d.tipo_producto === 'viaje') ? 'Reserva de Viaje' : 'Inscripción Digital / Acceso');
      }

      // 4. Gestionar cliente (SOLO se persiste una vez validado íntegramente el carrito y stock)
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

      const total = subtotal + costo_envio;

      const pedidoData = {
        cliente_id: clienteRecord.id,
        subtotal,
        costo_envio,
        total,
        metodo_pago,
        metodo_envio: metodoEnvioFinal,
        direccion_envio: cliente.direccion,
        ciudad_envio: cliente.ciudad,
        provincia_envio: cliente.provincia,
        cp_envio: cliente.codigo_postal,
        nombre_receptor: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
        telefono_receptor: cliente.telefono || null
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
      let timerId;
      await Promise.race([
        Promise.allSettled(emailPromises),
        new Promise(resolve => {
          timerId = setTimeout(() => {
            console.warn('⚠️ [Email] El envío de correos excedió 4500ms, continuando para responder al cliente.');
            resolve();
          }, 4500);
        })
      ]);
      if (timerId) clearTimeout(timerId);

      res.status(201).json({
        success: true,
        pedido: nuevoPedido,
        mpUrl: initPoint 
      });

    } catch (error) {
      console.error("Error en checkout:", error);
      if (process.env.SENTRY_DSN) {
        try {
          const Sentry = require('@sentry/node');
          Sentry.captureException(error);
        } catch (_) {}
      }
      if (error.isStockError || (error.message && error.message.toLowerCase().includes('stock insuficiente'))) {
        return res.status(409).json({ error: error.message });
      }
      res.status(500).json({ error: 'Ocurrió un error al procesar tu pedido. Por favor, intenta nuevamente en unos minutos.' });
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
          let timerIdStatus;
          await Promise.race([
              Promise.allSettled(emailPromises),
              new Promise(resolve => {
                  timerIdStatus = setTimeout(() => {
                      console.warn('⚠️ [Email] El envío de correos en cambio de estado excedió 4500ms, continuando para evitar timeout.');
                      resolve();
                  }, 4500);
              })
          ]);
          if (timerIdStatus) clearTimeout(timerIdStatus);
      }

      res.json(pedidoActualizado);
    } catch (error) {
      console.error("Error al actualizar pedido:", error);
      if (process.env.SENTRY_DSN) {
        try {
          const Sentry = require('@sentry/node');
          Sentry.captureException(error);
        } catch (_) {}
      }
      if (error.isStockError) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Error al actualizar pedido: ' + (error.message || '') });
    }
  }
};

module.exports = pedidoController;
