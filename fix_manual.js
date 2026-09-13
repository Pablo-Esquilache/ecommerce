const fs = require('fs');
const path = 'C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/manual_despliegue_clientes.md';
let str = fs.readFileSync(path, 'utf8');

const repFrom = '### Código SQL para crear las tablas (Copia y pega esto):\\r\\n\\r\\n  \"imagen_url\" VARCHAR(255)\\r\\n);';
const repFrom2 = '### Código SQL para crear las tablas (Copia y pega esto):\\n\\n  \"imagen_url\" VARCHAR(255)\\n);';

const fixedText = '### Código SQL para crear las tablas (Copia y pega esto):\\n\\n`sql\\n-- Base de datos ecommerce (Correr este script en pgAdmin o psql)\\n\\n-- 🚨 ¡ATENCIÓN! ESTE BLOQUE BORRA TODAS LAS TABLAS Y SUS DATOS.\\n-- SOLO EJECUTAR EN BASES DE DATOS NUEVAS/VACÍAS.\\n-- Eliminamos tablas si existen para poder recrearlas\\nDROP TABLE IF EXISTS "detalles_pedido";\\nDROP TABLE IF EXISTS "pedidos";\\nDROP TABLE IF EXISTS "productos";\\nDROP TABLE IF EXISTS "clientes";\\nDROP TABLE IF EXISTS "administradores";\\nDROP TABLE IF EXISTS "configuracion";\\nDROP TABLE IF EXISTS "subcategorias";\\nDROP TABLE IF EXISTS "categorias";\\n\\n-- Tabla de Categorias\\nCREATE TABLE "categorias" (\\n  "id" SERIAL PRIMARY KEY,\\n  "nombre" VARCHAR(100) UNIQUE NOT NULL,\\n  "imagen_url" VARCHAR(255)\\n);';

if (str.includes(repFrom)) {
    str = str.replace(repFrom, fixedText);
} else if (str.includes(repFrom2)) {
    str = str.replace(repFrom2, fixedText);
} else {
    console.log('Could not find the broken string');
}

fs.writeFileSync(path, str, 'utf8');
console.log('Done!');
