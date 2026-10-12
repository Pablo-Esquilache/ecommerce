const { MercadoPagoConfig, Preference } = require('mercadopago');

const mercadopagoService = {
  crearPreferencia: async (pedido, carrito, cliente) => {
    try {
      const accessToken = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('MP_ACCESS_TOKEN no está configurado en las variables de entorno.');
      }
      const client = new MercadoPagoConfig({ accessToken, options: { timeout: 8000 } });

      // 1. Armar los items para MP
      const items = carrito.map(item => ({
        id: item.id.toString(),
        title: item.nombre,
        quantity: parseInt(item.cantidad),
        unit_price: Number(item.precio),
        currency_id: 'ARS',
      }));

      // Si hay costo de envío, lo agregamos como un ítem más
      if (pedido.costo_envio > 0) {
        items.push({
          id: 'ENVIO',
          title: 'Costo de Envío',
          quantity: 1,
          unit_price: Number(pedido.costo_envio),
          currency_id: 'ARS',
        });
      }

      // 2. Definir las URLs de retorno y webhooks
      const basePath = process.env.PUBLIC_URL || process.env.URL || 'http://localhost:3000';

      const body = {
        items,
        payer: {
          name: cliente.nombre,
          surname: cliente.apellido,
          email: cliente.email,
        },
        back_urls: {
          success: `${basePath}/api/webhooks/mercadopago/return?status=success`,
          failure: `${basePath}/api/webhooks/mercadopago/return?status=failure`,
          pending: `${basePath}/api/webhooks/mercadopago/return?status=pending`,
        },
        auto_return: 'approved',
        external_reference: pedido.id.toString(),
      };

      if (basePath.startsWith('https://')) {
        body.notification_url = `${basePath}/api/webhooks/mercadopago`;
      }

      // 3. Crear preferencia
      const preference = new Preference(client);
      const result = await preference.create({ body });

      return result;

    } catch (error) {
      console.error('Error creando preferencia MercadoPago:', error);
      throw error;
    }
  }
};

module.exports = mercadopagoService;
