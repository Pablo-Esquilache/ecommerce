const fetch = require('node-fetch') || globalThis.fetch;
const USER = 'PEsquilacheAPI';
const PASS = 'Alfombra10+';
const CUSTOMER_ID = '0001215367';
const API_BASE_URL = 'https://api.correoargentino.com.ar/micorreo/v1';

async function run() {
  try {
    const creds = Buffer.from(USER + ':' + PASS).toString('base64');
    console.log('Fetching token...');
    const tokenRes = await fetch(API_BASE_URL + '/token', {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + creds }
    });
    
    if (!tokenRes.ok) {
      console.log('Token error:', tokenRes.status, await tokenRes.text());
      return;
    }
    const tokenData = await tokenRes.json();
    console.log('Token success!');
    
    console.log('Fetching rates...');
    const body = {
      customerId: CUSTOMER_ID,
      postalCodeOrigin: '1000',
      postalCodeDestination: '1704',
      deliveredType: 'D',
      dimensions: { weight: 1500, height: 10, width: 20, length: 30 }
    };
    
    const ratesRes = await fetch(API_BASE_URL + '/rates', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + tokenData.token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    
    if (!ratesRes.ok) {
      console.log('Rates error:', ratesRes.status, await ratesRes.text());
      return;
    }
    console.log('Rates success:', JSON.stringify(await ratesRes.json(), null, 2));
    
  } catch (e) {
    console.error('Fatal error:', e);
  }
}
run();
