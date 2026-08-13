require('dotenv').config({ path: './backend/.env' });

async function runTest() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  const customerId = "0001215367";
  
  const credentials = Buffer.from(`${USER}:${PASS}`).toString('base64');
  
  console.log("=== PRUEBA DE API CORREO ARGENTINO (PARA SOPORTE) ===\n");
  
  // 1. OBTENER TOKEN
  console.log("--- PASO 1: SOLICITUD DE TOKEN ---");
  const tokenUrl = 'https://api.correoargentino.com.ar/micorreo/v1/token';
  console.log(`URL: POST ${tokenUrl}`);
  console.log(`Headers: { "Authorization": "Basic [BASE64_CREDENTIALS]" }`);
  
  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });
    
    console.log(`Respuesta Status: ${tokenRes.status} ${tokenRes.statusText}`);
    const tokenBody = await tokenRes.text();
    console.log(`Respuesta Body: ${tokenBody}\n`);
    
    // 2. COTIZACION DIRECTA (Por las dudas que no requiera token)
    console.log("--- PASO 2: COTIZACIÓN DIRECTA (/rates) CON BASIC AUTH ---");
    const ratesUrl = 'https://api.correoargentino.com.ar/micorreo/v1/rates';
    
    const bodyParams = {
      customerId: customerId,
      postalCodeOrigin: "6455",
      postalCodeDestination: "1000",
      deliveredType: "S",
      dimensions: {
        weight: 1000,
        height: 10,
        width: 10,
        length: 10
      }
    };
    
    console.log(`URL: POST ${ratesUrl}`);
    console.log(`Headers: { "Authorization": "Basic [BASE64_CREDENTIALS]", "Content-Type": "application/json" }`);
    console.log(`Body Params:`, JSON.stringify(bodyParams, null, 2));
    
    const ratesRes = await fetch(ratesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyParams)
    });
    
    console.log(`Respuesta Status: ${ratesRes.status} ${ratesRes.statusText}`);
    const ratesBody = await ratesRes.text();
    console.log(`Respuesta Body: ${ratesBody}\n`);
    
  } catch(e) {
    console.error("Error en la petición:", e.message);
  }
}

runTest();
