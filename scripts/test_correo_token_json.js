require('dotenv').config({ path: './backend/.env' });

async function runAuth() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  
  try {
    const response = await fetch('https://api.correoargentino.com.ar/micorreo/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: USER,
        password: PASS
      })
    });
    
    console.log("Status:", response.status, response.statusText);
    const text = await response.text();
    console.log("Body:", text);
  } catch(e) {
    console.error(e);
  }
}

runAuth();
