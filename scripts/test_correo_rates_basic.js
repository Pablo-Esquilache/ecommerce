require('dotenv').config({ path: './backend/.env' });

async function runAuth() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  
  const credentials = Buffer.from(`${USER}:${PASS}`).toString('base64');
  
  const bodyParams = {
    customerId: "0001215367",
    postalCodeOrigin: "6455",
    postalCodeDestination: "1000",
    deliveredType: "D",
    dimensions: {
      weight: 1000,
      height: 10,
      width: 10,
      length: 10
    }
  };

  try {
    const response = await fetch('https://api.correoargentino.com.ar/micorreo/v1/rates', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyParams)
    });
    
    console.log("Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}

runAuth();
