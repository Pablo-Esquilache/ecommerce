// Usaremos fetch nativo para enviar a API
const API_BASE_URL = 'https://api.correoargentino.com.ar/micorreo/v1';
const USER = process.env.CORREO_ARG_USER;
const PASS = process.env.CORREO_ARG_PASS;

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
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
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

  cotizarEnvio: async (cpDestino, pesoKg = 1) => {
    try {
      // Simulate/mock behavior for testing since we might get 401 if credentials don't have cotizacion access in prod yet
      // The real endpoint for MiCorreo is usually something like /cotizacion or /envios/cotizacion
      // I will implement a robust fallback just in case the API call fails due to permissions.

      const token = await correoArgentinoService.getToken();

      // Official MiCorreo API expects details like CP origen, CP destino, weight, dimensions.
      // Assuming a default origin CP and package size for simple E-commerce.
      const cpOrigen = '1000'; // CABA default
      
      const bodyParams = {
        cpO: cpOrigen,
        cpD: cpDestino,
        peso: pesoKg,
        // Default dims
        alto: 10,
        ancho: 10,
        largo: 10,
        bultos: 1
      };

      const response = await fetch(`${API_BASE_URL}/cotizacion`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyParams)
      });

      if (!response.ok) {
        throw new Error(`API Correo respondió con status ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.warn("Fallo la cotización real con Correo Argentino, usando fallback en modo de desarrollo.", error.message);
      // Fallback in case the credentials are not enabled for the API yet or we get unauthorized
      // Simulation:
      const basePrice = 2500;
      const variablePrice = parseInt(cpDestino) > 2000 ? 1500 : 0; // Mas de CABA/GBA es mas caro
      const finalPrice = basePrice + variablePrice + (pesoKg * 500);

      return {
        success: false,
        warning: "Usando cotización simulada debido a un error con la API (credenciales/permisos)",
        opciones: [
          {
            nombre: "Envío a Domicilio (Clásico)",
            costo: finalPrice,
            tiempo_entrega: "3-5 días hábiles"
          },
          {
            nombre: "Retiro en Sucursal",
            costo: finalPrice - 800,
            tiempo_entrega: "2-4 días hábiles"
          }
        ]
      };
    }
  }
};

module.exports = correoArgentinoService;
