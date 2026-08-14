// Usaremos fetch nativo para enviar a API
const API_BASE_URL = 'https://api.correoargentino.com.ar/micorreo/v1';
const USER = process.env.CORREO_ARG_USER || 'PEsquilacheAPI';
const PASS = process.env.CORREO_ARG_PASS || 'Alfombra10+';

const correoArgentinoService = {
  getToken: async () => {
    try {
      const credentials = Buffer.from(`${USER}:${PASS}`).toString('base64');
      
      const response = await fetch(`${API_BASE_URL}/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error autenticando con Correo Argentino: ${response.statusText}`);
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Error in Correo Argentino getToken:', error.message);
      throw error;
    }
  },

  cotizarEnvio: async (cpOrigen, cpDestino, pesoGramos) => {
    try {
      const token = await correoArgentinoService.getToken();
      
      const CUSTOMER_ID = '0001215367'; // En duro porque la cuenta es de producción
      
      const bodyParams = {
        customerId: CUSTOMER_ID,
        postalCodeOrigin: cpOrigen.toString(),
        postalCodeDestination: cpDestino.toString(),
        deliveredType: "D", // "D" para domicilio. En un futuro podríamos agregar sucursal
        dimensions: {
          weight: Math.max(1, Math.round(pesoGramos)), // Mínimo 1 gramo y debe ser Entero
          height: 10,
          width: 20,
          length: 30
        }
      };

      const response = await fetch(`${API_BASE_URL}/rates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyParams)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Correo respondió con status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      
      // Mapear opciones para el frontend
      if (data && data.rates && data.rates.length > 0) {
        return {
          success: true,
          opciones: data.rates.map(rate => ({
            id: rate.productType, // "CP" o "EP"
            nombre: rate.productName,
            costo: parseFloat(rate.price),
            tiempo_entrega: `${rate.deliveryTimeMin}-${rate.deliveryTimeMax} días hábiles`
          }))
        };
      } else {
        throw new Error('No se devolvieron tarifas para este CP.');
      }

    } catch (error) {
      console.error("Fallo la cotización real con Correo Argentino:", error.message);
      return {
        success: false,
        warning: "Error al cotizar con Correo Argentino.",
        error: error.message
      };
    }
  },

  generarEnvio: async (pedido) => {
    try {
      const token = await correoArgentinoService.getToken();
      const CUSTOMER_ID = '0001215367'; // En duro porque la cuenta es de producción
      
      const isSucursal = pedido.metodo_envio && pedido.metodo_envio.toLowerCase().includes('sucursal');
      const isExpreso = pedido.metodo_envio && pedido.metodo_envio.toLowerCase().includes('expreso');
      const deliveryType = isSucursal ? "S" : "D";
      const productType = isExpreso ? "EP" : "CP";

      // Infer province code (super basic mapping, defaults to B)
      const prov = (pedido.cliente_provincia || '').toLowerCase();
      let provinceCode = "B"; // Default Buenos Aires
      if (prov.includes('caba') || prov.includes('capital')) provinceCode = "C";
      else if (prov.includes('cordoba') || prov.includes('córdoba')) provinceCode = "X";
      else if (prov.includes('santa fe')) provinceCode = "S";
      else if (prov.includes('mendoza')) provinceCode = "M";

      const payload = {
        customerId: CUSTOMER_ID,
        extOrderId: pedido.id.toString(),
        orderNumber: pedido.id.toString(),
        recipient: {
          name: `${pedido.cliente_nombre} ${pedido.cliente_apellido}`.trim(),
          email: pedido.cliente_email,
          phone: pedido.cliente_telefono || "00000000"
        },
        shipping: {
          deliveryType: deliveryType,
          productType: productType,
          weight: 1000, // Hardcoded fallback if not set. Idealmente sumar weights
          declaredValue: parseFloat(pedido.total) || 1000,
          height: 10,
          length: 20,
          width: 30,
        }
      };

      if (deliveryType === "D") {
        payload.shipping.address = {
          streetName: pedido.cliente_direccion || "Sin calle",
          streetNumber: "S/N", // This could be parsed from direccion
          city: pedido.cliente_ciudad || "Sin ciudad",
          provinceCode: provinceCode,
          postalCode: pedido.cliente_cp || "1000"
        };
      }

      const response = await fetch(`${API_BASE_URL}/shipping/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Correo respondió con status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        tracking_number: pedido.id.toString(),
        message: "Envío importado exitosamente a MiCorreo"
      };

    } catch (error) {
      console.error("Fallo la generación del envío en Correo Argentino:", error.message);
      return {
        success: false,
        error: error.message
      };
    }
  },

  obtenerEtiqueta: async (tracking_number) => {
    // TODO: Reemplazar con endpoint oficial de MiCorreo cuando Leandro (Soporte) pase la doc.
    console.warn("obtenerEtiqueta: endpoint oficial no provisto. Se retorna PDF mock.");
    // Simulate returning a PDF buffer or URL
    return {
      success: true,
      pdf_url: `https://www.correoargentino.com.ar/etiqueta/${tracking_number}`,
      message: "Etiqueta descargada (Mock)"
    };
  },

  consultarTracking: async (tracking_number) => {
    // TODO: Reemplazar con endpoint oficial de MiCorreo cuando Leandro (Soporte) pase la doc.
    console.warn("consultarTracking: endpoint oficial no provisto. Se retorna mock.");
    // Mock the state change. Randomly return 'enviado' or 'entregado' for testing.
    return {
      success: true,
      estado: "enviado", // 'enviado' o 'entregado'
      detalles: "El paquete fue ingresado en la sucursal origen."
    };
  }
};

module.exports = correoArgentinoService;
