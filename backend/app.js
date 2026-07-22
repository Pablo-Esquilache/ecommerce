const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

// Inicializar Express
const app = express();
app.set('trust proxy', 1); // Configuración vital para rate-limit en Render
const PORT = process.env.PORT || 3000;

// Importar rutas
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const adminRoutes = require('./routes/admin');
const enviosRoutes = require('./routes/envios');
const webhooksRoutes = require('./routes/webhooks');
const contactoRoutes = require('./routes/contacto');
const configuracionRoutes = require('./routes/configuracion');
const categoriasRoutes = require('./routes/categorias');
const syncRoutes = require('./routes/sync');

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nota: En Netlify, los estáticos se sirven de forma nativa desde el directorio "public".
// Ya no necesitamos app.use(express.static) ni la carpeta /uploads local.

// ----------------------
// Montar Rutas API REST
// ----------------------
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/envios', enviosRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/contacto', contactoRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/sync', syncRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Migraciones automáticas movidas a scripts manuales para no saturar las funciones Serverless.
// --- DIAGNÓSTICO EMAIL (RENDER BUG ESCÁNER) ---
app.get('/api/diagnostico-email', async (req, res) => {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: process.env.EMAIL_USER || '', pass: process.env.EMAIL_PASS || '' }
    });
    try {
        await transporter.verify();
        res.json({ success: true, mensaje: "✅ Conexión exitosa a Gmail.", usuario: process.env.EMAIL_USER });
    } catch (error) {
        res.json({ success: false, error_mensaje: error.message, error_completo: error, usuario_intentado: process.env.EMAIL_USER });
    }
});

// Exportar la app envuelta para Netlify Functions
const serverless = require('serverless-http');
module.exports.handler = serverless(app);

// Mantener capacidad de correr localmente (ej: npm start)
if (require.main === module) {
  app.listen(PORT, () => {
      console.log(`Servidor iniciado en http://localhost:${PORT}`);
  });
}
