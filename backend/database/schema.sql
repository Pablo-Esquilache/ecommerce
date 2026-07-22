-- Base de datos ecommerce (Correr este script en pgAdmin o psql)

-- Eliminamos tablas si existen para poder recrearlas
DROP TABLE IF EXISTS "detalles_pedido";
DROP TABLE IF EXISTS "pedidos";
DROP TABLE IF EXISTS "productos";
DROP TABLE IF EXISTS "clientes";
DROP TABLE IF EXISTS "administradores";
DROP TABLE IF EXISTS "configuracion";
DROP TABLE IF EXISTS "categorias";

-- Tabla de Categorias
CREATE TABLE "categorias" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de Administradores
CREATE TABLE "administradores" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(100) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "nombre" VARCHAR(100) NOT NULL,
  "creado_en" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Clientes
CREATE TABLE "clientes" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) NOT NULL,
  "apellido" VARCHAR(100) NOT NULL,
  "email" VARCHAR(150) UNIQUE NOT NULL,
  "telefono" VARCHAR(50) NOT NULL,
  "genero" VARCHAR(20),
  "direccion" VARCHAR(255) NOT NULL,
  "ciudad" VARCHAR(100) NOT NULL,
  "provincia" VARCHAR(100) NOT NULL,
  "codigo_postal" VARCHAR(20) NOT NULL,
  "creado_en" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos
CREATE TABLE "productos" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(200) NOT NULL,
  "descripcion" TEXT NOT NULL,
  "precio" DECIMAL(10, 2) NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "categoria" VARCHAR(100),
  "sku" VARCHAR(50) UNIQUE,
  "peso" DECIMAL(10, 2), -- en kg
  "dimensiones" VARCHAR(100), -- ej: "10x20x30 cm"
  "imagen_1" VARCHAR(255),
  "imagen_2" VARCHAR(255),
  "imagen_3" VARCHAR(255),
  "tipo_producto" VARCHAR(50) DEFAULT 'fisico',
  "archivo_digital" VARCHAR(255),
  "video_url" VARCHAR(255),
  "creado_en" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pedidos
CREATE TABLE "pedidos" (
  "id" SERIAL PRIMARY KEY,
  "cliente_id" INTEGER NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  "costo_envio" DECIMAL(10, 2) NOT NULL,
  "total" DECIMAL(10, 2) NOT NULL,
  "estado" VARCHAR(50) NOT NULL DEFAULT 'pendiente', -- pendiente, pagado, enviado, entregado
  "metodo_pago" VARCHAR(50) NOT NULL, -- mercadopago, transferencia
  "preferencia_mp_id" VARCHAR(255),
  "creado_en" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("cliente_id") REFERENCES "clientes" ("id") ON DELETE RESTRICT
);

-- Tabla de Detalles del Pedido
CREATE TABLE "detalles_pedido" (
  "id" SERIAL PRIMARY KEY,
  "pedido_id" INTEGER NOT NULL,
  "producto_id" INTEGER NOT NULL,
  "cantidad" INTEGER NOT NULL,
  "precio_unitario" DECIMAL(10, 2) NOT NULL,
  "subtotal" DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") ON DELETE RESTRICT
);

-- Tabla de Configuración Global
CREATE TABLE "configuracion" (
  "id" SERIAL PRIMARY KEY,
  "email" VARCHAR(255) DEFAULT '',
  "telefono" VARCHAR(255) DEFAULT '',
  "direccion" VARCHAR(255) DEFAULT '',
  "admin_nombre" VARCHAR(255) DEFAULT 'Admin',
  "email_admin" VARCHAR(255) DEFAULT '',
  "instagram_activo" BOOLEAN DEFAULT false,
  "instagram_url" VARCHAR(255) DEFAULT '',
  "facebook_activo" BOOLEAN DEFAULT false,
  "facebook_url" VARCHAR(255) DEFAULT '',
  "tiktok_activo" BOOLEAN DEFAULT false,
  "tiktok_url" VARCHAR(255) DEFAULT '',
  "twitter_activo" BOOLEAN DEFAULT false,
  "twitter_url" VARCHAR(255) DEFAULT '',
  "banner_activo" BOOLEAN DEFAULT false,
  "banner_texto" VARCHAR(255) DEFAULT '¡Aprovecha nuestras ofertas exclusivas!',
  "descuento_activo" BOOLEAN DEFAULT false,
  "descuento_porcentaje" NUMERIC(5,2) DEFAULT 0,
  "envio_gratis_activo" BOOLEAN DEFAULT false,
  "envio_gratis_limite" NUMERIC(10,2) DEFAULT 0,
  "sync_activo" BOOLEAN DEFAULT false,
  "sync_api_key" VARCHAR(255) DEFAULT '',
  "banco_nombre" VARCHAR(100) DEFAULT '',
  "banco_titular" VARCHAR(150) DEFAULT '',
  "banco_cuit" VARCHAR(50) DEFAULT '',
  "banco_cbu" VARCHAR(100) DEFAULT '',
  "banco_alias" VARCHAR(100) DEFAULT ''
);

INSERT INTO "configuracion" ("id", "admin_nombre") VALUES (1, 'Administrador') ON CONFLICT ("id") DO NOTHING;

-- Administrador por defecto (password = admin123)
-- Hash de bcrypt para "admin123" generado en Node.js ($2b$10$w4rYqL7yP0N3vV/Lh1D6YOSm9Gj2j3u4P5S8UvP6QxZ4E5wD0oM9q)
INSERT INTO "administradores" ("email", "password", "nombre") 
VALUES ('admin@ecommerce.com', '$2b$10$w4rYqL7yP0N3vV/Lh1D6YOSm9Gj2j3u4P5S8UvP6QxZ4E5wD0oM9q', 'Administrador Principal');
