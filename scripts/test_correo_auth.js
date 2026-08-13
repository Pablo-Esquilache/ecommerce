require('dotenv').config({ path: './backend/.env' });

async function runAuth() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  
  const credentials = Buffer.from(`${USER}:${PASS}`).toString('base64');
  console.log("Credentials (base64):", credentials);
  console.log("Authorization header: Basic " + credentials);

  try {
    const response = await fetch('https://api.correoargentino.com.ar/micorreo/v1/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log("Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}

runAuth();
