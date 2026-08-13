require('dotenv').config({ path: './backend/.env' });
const db = require('../backend/config/database');

async function seed() {
    try {
        await db.query('TRUNCATE TABLE detalles_pedido, pedidos, productos RESTART IDENTITY CASCADE');
        const queries = [
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Auriculares Inalámbricos Noise Cancelling Pro', 'Auriculares over-ear con cancelación de ruido activa, sonido de alta fidelidad y batería de 30 horas. Ideal para gamers y audiófilos.', 150000, 15, '/img/producto_1.webp', 'fisico', null)`,
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Teclado Mecánico RGB Switch Red', 'Teclado mecánico TKL con switches lineales rojos, iluminación RGB personalizable por tecla y cable reforzado.', 95000, 20, '/img/producto_2.webp', 'fisico', null)`,
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Mouse Inalámbrico Gamer Ultraligero', 'Mouse ergonómico inalámbrico de 55g, sensor óptico de 26K DPI e iluminación sutil. Precisión extrema.', 72000, 30, '/img/producto_3.webp', 'fisico', null)`,
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Smartphone Pixel Midnight Black', 'Smartphone premium con sistema de triple cámara de 50MP, pantalla OLED 120Hz y procesador de última generación.', 1200000, 5, '/img/producto_6.webp', 'fisico', null)`,
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Licencia Antivirus Sentinel CyberSec (1 Año)', 'Protección digital completa contra malware, ransomware y phishing para 1 dispositivo durante 12 meses.', 25000, 999, '/img/producto_4.webp', 'digital', 'clave_activacion.pdf')`,
            `INSERT INTO productos (nombre, descripcion, precio, stock, imagen_1, tipo_producto, archivo_digital) VALUES ('Gift Card Tech Universe $100', 'Tarjeta de regalo digital válida por $100 en nuestra tienda. El regalo perfecto para entusiastas de la tecnología.', 100000, 999, '/img/producto_5.webp', 'digital', 'giftcard.pdf')`
        ];
        for(let q of queries) await db.query(q);
        console.log('Tech products seeded successfully!');
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
seed();
