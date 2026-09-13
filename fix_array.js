const fs = require("fs");
const path = "C:/Users/pablo/.gemini/antigravity/brain/b82eb01a-92d0-4a4b-a364-ef4ebb0ae351/manual_despliegue_clientes.md";
let str = fs.readFileSync(path, "utf8");
let lines = str.split("\\n");

let start = -1;
let end = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("### Código SQL para crear las tablas (Copia y pega esto):")) {
    start = i;
  }
  if (lines[i].includes("-- Tabla de Subcategorias")) {
    end = i;
  }
}

if (start !== -1 && end !== -1) {
  const insert = [
    "### Código SQL para crear las tablas (Copia y pega esto):",
    "",
    "```sql",
    "-- Base de datos ecommerce (Correr este script en pgAdmin o psql)",
    "",
    "-- 🚨 ¡ATENCIÓN! ESTE BLOQUE BORRA TODAS LAS TABLAS Y SUS DATOS.",
    "-- SOLO EJECUTAR EN BASES DE DATOS NUEVAS/VACÍAS.",
    "-- Eliminamos tablas si existen para poder recrearlas",
    "DROP TABLE IF EXISTS \\"detalles_pedido\\";",
    "DROP TABLE IF EXISTS \\"pedidos\\";",
    "DROP TABLE IF EXISTS \\"productos\\";",
    "DROP TABLE IF EXISTS \\"clientes\\";",
    "DROP TABLE IF EXISTS \\"administradores\\";",
    "DROP TABLE IF EXISTS \\"configuracion\\";",
    "DROP TABLE IF EXISTS \\"subcategorias\\";",
    "DROP TABLE IF EXISTS \\"categorias\\";",
    "",
    "-- Tabla de Categorias",
    "CREATE TABLE \\"categorias\\" (",
    "  \\"id\\" SERIAL PRIMARY KEY,",
    "  \\"nombre\\" VARCHAR(100) UNIQUE NOT NULL,",
    "  \\"imagen_url\\" VARCHAR(255)",
    ");",
    ""
  ];
  lines.splice(start, end - start, ...insert);
  fs.writeFileSync(path, lines.join("\\n"), "utf8");
  console.log("Fixed properly!");
} else {
  console.log("Not found");
}

