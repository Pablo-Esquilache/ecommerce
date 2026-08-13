// Usaremos fetch nativo para enviar a API
const API_BASE_URL = 'https://api.correoargentino.com.ar/micorreo/v1';
const USER = process.env.CORREO_ARG_USER || 'PEsquilacheAPI';
const PASS = process.env.CORREO_ARG_PASS || 'Alfombra10+';

// Cache the token to avoid authenticating on every request
let cachedToken = null;
let tokenExpiriesAt = null;

const correoArgentinoService = {
  getToken: async () => {
    // If token is valid for at least 5 more minutes, use it
    if (cachedToken && tokenExpiriesAt && tokenExpiriesAt > Date.now() + 300000) {
      return cachedToken;
    }

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
      cachedToken = data.token;
      
      // Usually tokens expire. Assuming 1 hour if not specified.
      // If the API returns an expires_in, use it. Otherwise guess.
      const expiresIn = data.expires_in || 3600; 
      tokenExpiriesAt = Date.now() + (expiresIn * 1000);

      return cachedToken;
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
          weight: Math.max(1, pesoGramos), // Mínimo 1 gramo
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
  }
};

module.exports = correoArgentinoService;
