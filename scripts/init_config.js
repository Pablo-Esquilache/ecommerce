const db = require('./config/database');

const query = `
CREATE TABLE IF NOT EXISTS configuracion (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) DEFAULT '',
    telefono VARCHAR(255) DEFAULT '',
    direccion VARCHAR(255) DEFAULT '',
    admin_nombre VARCHAR(255) DEFAULT 'Admin',
    
    instagram_activo BOOLEAN DEFAULT false,
    instagram_url VARCHAR(255) DEFAULT '',
    facebook_activo BOOLEAN DEFAULT false,
    facebook_url VARCHAR(255) DEFAULT '',
    tiktok_activo BOOLEAN DEFAULT false,
    tiktok_url VARCHAR(255) DEFAULT '',
    twitter_activo BOOLEAN DEFAULT false,
    twitter_url VARCHAR(255) DEFAULT '',
    
    banner_activo BOOLEAN DEFAULT false,
    banner_texto VARCHAR(255) DEFAULT '¡Aprovecha nuestras ofertas exclusivas!',
    
    descuento_activo BOOLEAN DEFAULT false,
    descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
    
    envio_gratis_activo BOOLEAN DEFAULT false,
    envio_gratis_limite NUMERIC(10,2) DEFAULT 0
);

INSERT INTO configuracion (id, email, telefono, direccion, admin_nombre)
VALUES (1, 'contacto@tienda.com', '+54 9 11 0000 0000', 'Dirección de Prueba 123', 'Administrador')
ON CONFLICT (id) DO NOTHING;
`;

db.query(query)
    .then(() => {
        console.log('Tabla configuracion creada e inicializada.');
        process.exit(0);
    })
    .catch(err => {
        console.error('Error inicializando configuracion:', err);
        process.exit(1);
    });
