require('dotenv').config();
process.env.CORREO_ARG_USER = 'PEsquilacheAPI';
process.env.CORREO_ARG_PASS = 'Alfombra10+)';
process.env.CORREO_ARG_CUSTOMER_ID = '0001215367';

const correoArgentino = require('./backend/services/correoArgentino');

async function runTest() {
    console.log("Iniciando prueba de Correo Argentino...");
    try {
        const token = await correoArgentino.getToken();
        console.log("Token obtenido exitosamente:", token ? "SÍ" : "NO");
        
        console.log("Probando cotización a Tejedor (CP 6455) desde CABA (1000) con 1kg (1000g) a Sucursal (S)...");
        const resultado = await correoArgentino.cotizarEnvio('6455', 1);
        console.log("Respuesta de Cotización:");
        console.log(JSON.stringify(resultado, null, 2));
    } catch (e) {
        console.error("Prueba falló:", e.message);
    }
}

runTest();
