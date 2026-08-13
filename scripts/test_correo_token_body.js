require('dotenv').config({ path: './backend/.env' });

async function runAuth() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', USER);
    params.append('client_secret', PASS);

    const response = await fetch('https://api.correoargentino.com.ar/micorreo/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });
    
    console.log("Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}

runAuth();
