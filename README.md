# Mi Ecommerce Simple

Este es un ecommerce completo y estructurado de forma sencilla utilizando **HTML, CSS puro y Vanilla JavaScript** en el Frontend, y **Node.js con Express y PostgreSQL (pg puro)** en el Backend.

## 🛠️ Requisitos Previos

1. Tener instalado **Node.js** (v14 o superior).
2. Tener instalado **PostgreSQL** y preferiblemente una interfaz gráfica como **pgAdmin**.

## 🚀 Instalación y Ejecución Local

### Paso 1: Configurar la Base de Datos

1. Abre **pgAdmin** o tu terminal de psql.
2. Crea una base de datos llamada `ecommerce` (o el nombre que prefieras).
3. Abre el archivo localizado en `backend/database/schema.sql` y ejecuta todo su contenido dentro de tu nueva base de datos.
> **Nota:** Esto creará todas las tablas (productos, clientes, pedidos, administradores, etc.) e insertará automáticamente un usuario administrador por defecto. **Por razones de seguridad, asegúrate de cambiar estas credenciales una vez que inicies sesión por primera vez.**

### Paso 2: Configurar las Variables de Entorno

1. En la raíz del proyecto, asegúrate de que exista un archivo `.env` (si no, créalo basado en el esquema a continuación).
2. Modifica los parámetros de configuración de BD:

```env
PORT=3000

# Base de datos PostgreSQL
DB_USER=postgres
DB_PASSWORD=tu_contraseña_aqui
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecommerce

# JWT Secret para el login de admin (Usa una cadena larga y aleatoria)
JWT_SECRET=tu_jwt_secret_largo_y_aleatorio_aqui
```

### Paso 3: Instalar Dependencias

Abre una terminal en la raíz de la carpeta (`c:\Users\pablo\OneDrive\Escritorio\ecommerce`) y ejecuta:

```bash
npm install
```

### Paso 4: Iniciar el Servidor

Desde esa misma terminal ejecuta:

```bash
node backend/app.js
```

Verás el mensaje: `Servidor iniciado en http://localhost:3000`.

## 🌐 Uso del Ecommerce

1. **Cliente Final (Tienda):** Ingresa en tu navegador a `http://localhost:3000/`. Podrás ver la landing, agregar productos de prueba (una vez creados) al carrito, y proceder al checkout.
2. **Administrador:** Ingresa a `http://localhost:3000/admin/login.html`.
   - Utiliza las credenciales: `admin@ecommerce.com` / `admin123`.
   - Podrás ver el dashboard, dar de alta nuevos productos y ver el registro simulado de pedidos y clientes.

## ✨ Características Principales

* **Seguridad:** Consultas SQL parametrizadas, encriptación de claves y Middlewares con Json Web Tokens (JWT).
* **Diseño:** SPA puro con interacciones DOM directas, CSS nativo minimalista e incorporando `localStorage` para persistencia del carrito.
* **Backend Estructurado:** Separación de lógica en Modelos (`/models`), Controladores (`/controllers`), y Rutas (`/routes`).
