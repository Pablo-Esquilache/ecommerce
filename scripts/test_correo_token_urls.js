require('dotenv').config({ path: './backend/.env' });

async function runAuth() {
  const USER = 'PEsquilacheAPI';
  const PASS = 'Alfombra10+)';
  const credentials = Buffer.from(`${USER}:${PASS}`).toString('base64');
  
  const urls = [
    'https://api.correoargentino.com.ar/token',
    'https://api.correoargentino.com.ar/oauth/token',
    'https://api.correoargentino.com.ar/micorreo/v1/token',
    'https://api.correoargentino.com.ar/micorreo/v1/auth',
    'https://api.correoargentino.com.ar/micorreo/v1/oauth/token'
  ];

  for (let url of urls) {
    console.log(`\nTesting ${url}...`);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`
        }
      });
      console.log("Status:", response.status, response.statusText);
      const text = await response.text();
      console.log("Body:", text.substring(0, 200));
    } catch(e) {
      console.error("Error:", e.message);
    }
  }
}

runAuth();
