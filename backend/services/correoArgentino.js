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

  cotizarEnvio: async (cpDestino, pesoKg = 1) => {
    try {
      const token = await correoArgentinoService.getToken();

      // Ajustamos el peso a gramos (1kg = 1000g)
      const pesoGramos = pesoKg * 1000;
      const cpOrigen = '1000'; // Default
      const customerId = process.env.CORREO_ARG_CUSTOMER_ID || '0001215367'; // Debe tener 10 dígitos (ceros a la izquierda)

      const bodyParams = {
        customerId: customerId,
        postalCodeOrigin: cpOrigen,
        postalCodeDestination: cpDestino,
        deliveredType: "S", // "S" = Sucursal (Cambiado para prueba según soporte)
        dimensions: {
          weight: pesoGramos,
          height: 10,
          width: 10,
          length: 10
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
        const errData = await response.text();
        throw new Error(`API Correo respondió con status ${response.status}: ${errData}`);
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
