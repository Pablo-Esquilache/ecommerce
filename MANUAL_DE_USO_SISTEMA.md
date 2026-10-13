# 📖 Manual de Uso Integral — María Magdalena (Iconografía Bizantina)

Este manual documenta el funcionamiento completo del sistema e-commerce de **María Magdalena — Iconografía Bizantina**, abarcando tanto la experiencia pública de los clientes como la operativa diaria desde el panel de administración.

---

# PARTE 1: La Tienda Pública (Lado Cliente / Visitante)

La experiencia pública está diseñada para ser sobria, intuitiva y espiritualmente acogedora, respetando la estética del arte sacro bizantino (paleta azul profundo `#0E2A47`, dorado `#C78515`, marfil `#FAF8F5` y tipografía romana clásica *Cinzel*).

---

## 1.1 Barra de Navegación Superior (Navbar)
* **Fija en pantalla (Sticky):** Acompaña al visitante en todo momento durante el scroll.
* **Logo:** Acceso directo al inicio (`index.html`).
* **Enlaces de navegación:**
  - **Inicio:** Vuelve al tope de la portada.
  - **Productos:** Desplaza suavemente hacia la sección del catálogo.
  - **Blog:** Dirige a la biblioteca completa de publicaciones (`blog.html`).
  - **Quiénes Somos:** Desplaza hacia la biografía de Giselle Ochoa y la tradición bizantina.
  - **Contacto:** Desplaza hacia el pie de página y formulario de mensajes.
* **Carrito de Compras flotante:** Muestra un contador en tiempo real con la cantidad de artículos seleccionados. Al hacer click, despliega el carrito lateral sin recargar la página.

---

## 1.2 Portada Principal (Hero Carousel)
* **Carrusel de bienvenida:** Muestra obras maestras de iconografía en alta definición.
* **Adaptabilidad inteligente:**
  - En computadoras: despliega imágenes panorámicas (16:9).
  - En celulares: conmuta automáticamente a fotografías verticales (2:3) para no recortar la obra ni forzar franjas negras.
* **Banner de avisos superior (Marquee):** Cuando la administradora lo activa desde el panel, muestra un texto animado deslizante con anuncios importantes (por ejemplo: *"Próximo taller presencial en noviembre — Cupos limitados"* o promociones vigentes).

---

## 1.3 Las 4 Tarjetas de Categorías (Ventanas Informativas)
Debajo del carrusel se encuentran las 4 áreas de trabajo del atelier:
1. **Iconografía Bizantina** (Venta de pinturas sacras originales y encargos personalizados a pedido).
2. **Cursos Digitales** (Formación online a tu propio ritmo con acceso de por vida).
3. **Talleres y Seminarios** (Experiencias prácticas en atelier o transmisiones sincrónicas en vivo).
4. **Viajes y Retiros** (Convivencias contemplativas e inmersiones de arte y oración).

### ¿Cómo funcionan al hacer click?
Al presionar cualquiera de las 4 tarjetas, **se abre un modal interactivo en el centro de la pantalla**:
* El scroll del modal inicia siempre en el tope superior para facilitar la lectura.
* Muestra una imagen destacada, el título canónico, un subtítulo y una explicación completa de qué ofrece y cómo adquirirlo.
* Al pie incluye:
  - Botón **"Cerrar"** (también se cierra tocando fuera del modal o con la tecla `Esc`).
  - Botón **"Ver en catálogo"**: cierra el modal y desplaza suavemente hacia la tienda filtrando solo los productos de esa categoría.

---

## 1.4 Catálogo de Productos y Precios Multidivisa
* **Detección automática de país:**
  - Visitantes de **Argentina:** Ven los precios expresados en **Pesos Argentinos (ARS)**.
  - Visitantes del **Exterior:** El sistema detecta su IP y conmuta automáticamente a **Dólares Estadounidenses (USD)**.
* **Filtros y Búsqueda:**
  - Buscador predictivo por nombre de obra o temática.
  - Menú desplegable para filtrar por categorías y subcategorías.
* **Ficha de Producto:**
  - Cada tarjeta exhibe la imagen, nombre, tipo de propuesta, precio y botón *"Ver Detalle"* o *"Agregar al Carrito"*.
  - Al abrir un producto (`producto.html`), se visualiza la galería con hasta 3 fotografías ampliables, descripción detallada, disponibilidad de stock y notas especiales de entrega.

### Particularidades por tipo de producto:
* **Iconografías (Obras físicas):** Cuentan con control de stock estricto en el servidor. Al ser piezas únicas, cuando se agotan la tienda bloquea nuevas compras para evitar sobreventa.
* **Cursos Digitales:** No requieren envío físico ni descuentan stock. El comprador recibe el material descargable automáticamente una vez confirmado el pago.
* **Talleres y Seminarios:** Permiten optar por modalidad **Presencial** (con cupos físicos) o **Online en vivo** (sin costo de flete).
* **Viajes y Retiros:** Incluyen el detalle del programa y el formulario de reserva.

---

## 1.5 Carrito Lateral y Proceso de Checkout

1. **Apertura:** Al tocar el ícono del carrito o agregar un ítem, se despliega un panel lateral derecho.
2. **Control:** El usuario puede sumar o restar unidades, o quitar productos. Si un producto físico tiene stock limitado, no permite superar el límite.
3. **Paso al Checkout (`checkout.html`):**
   - **Datos de contacto y entrega:** Nombre, teléfono, correo electrónico y domicilio postal.
   - **Snapshot de seguridad:** El sistema congela una copia exacta de la dirección en la orden de compra. Aunque el cliente modifique su domicilio en el futuro, el destino de los pedidos anteriores queda 100% inalterable.
   - **Cálculo de Envíos:** Los productos digitales y talleres online fijan el costo de envío automáticamente en $0. Si la tienda tiene activada la promoción de *"Envío Gratis"* a partir de cierto monto, el flete se bonifica de inmediato.
   - **Medios de Pago Disponibles:**
     - **Mercado Pago (Checkout Pro):** Tarjetas de crédito, débito, dinero en cuenta o puntos de pago en efectivo (Rapipago/Pago Fácil). El cliente es redirigido a la pasarela segura y, al finalizar, regresa a la tienda con confirmación oficial.
     - **Transferencia Bancaria en Pesos (ARS):** Despliega en pantalla el CBU, Alias, CUIT y Titular configurados en el sistema, enviando por correo las instrucciones para remitir el comprobante.
     - **Transferencia Internacional en Dólares (USD):** Para clientes del exterior, despliega los datos de la cuenta en dólares y código SWIFT/Alias.

---

## 1.6 Sección "Quiénes Somos"
* Presenta a **Giselle Ochoa**, narrando su formación en arte sacro desde 2015, sus maestros y su viaje de especialización por España.
* Explica la dimensión teológica del ícono bizantino: una obra litúrgica trabajada con levkas, pan de oro y temple al huevo donde cada pigmento encierra un significado espiritual.

---

## 1.7 Novedades del Blog en la Portada
* Ubicada justo debajo de "Quiénes Somos".
* **Diseño apaisado:** Presenta las **3 últimas publicaciones activas** en una línea horizontal, con miniatura al costado izquierdo, fecha, título y extracto al costado derecho.
* **Lector Modal Rápido:** Al hacer click en cualquier nota, se abre una ventana modal con el artículo completo listo para leer sin abandonar la página principal. Al pie del modal se incluye el botón *"Ir al Blog"* para acceder al archivo general.

---

## 1.8 Biblioteca del Blog (`blog.html`) y Lectura (`articulo.html`)
* **Listado General:** Grilla completa con todas las publicaciones activas, fechas de publicación y portadas en alta resolución.
* **Lectura Inmersiva:** Tipografía cuidada, párrafo a párrafo, con foto de cabecera panorámica, firma de Giselle Ochoa y barra de herramientas:
  - Botón nativo para compartir directamente por **WhatsApp**.
  - Botón para compartir por **Correo Electrónico**.
  - Botón de compartir nativo en dispositivos móviles (para enviar a Instagram, Facebook, Telegram, etc.).
  - Enlace de retorno al catálogo de obras y cursos.

---

## 1.9 Contacto y Pie de Página (Footer)
* **Datos dinámicos:** Muestra automáticamente el email, teléfono oficial, dirección del taller y enlaces a redes sociales (Instagram, Facebook, etc.) administrados desde el panel.
* **Formulario de contacto:** Permite al visitante enviar consultas que llegan inmediatamente al correo de Giselle mediante Brevo SMTP.
* **Botón Flotante de WhatsApp:** Ícono fijo en el margen inferior que abre un chat directo con el número de la iconógrafa.

---
---

# PARTE 2: Panel de Administración (Lado Gestor / Admin)

El panel privado permite gestionar de punta a punta el inventario, los cobros, los envíos, las notas del blog y los parámetros de la tienda.

---

## 2.1 Acceso y Seguridad
* **Ruta de acceso:** `/admin/login.html` (o ingresando a `/admin/`).
* **Credenciales:** Correo electrónico del administrador y contraseña encriptada (con hash seguro `bcrypt`).
* **Seguridad de Sesión:** Protegido con **JSON Web Token (JWT)**. Si se detectan intentos fallidos masivos, actúa el rate limiting preventivo del servidor.
* **Recuperación de Contraseña:** Si olvidás la clave, en la pantalla de login hacé click en *"¿Olvidaste tu contraseña?"* (`/admin/forgot-password.html`), ingresá tu email y el sistema te enviará un código OTP de 6 dígitos para crear una clave nueva en minutos.

---

## 2.2 Pestaña "Resumen" (Dashboard)
Es la pantalla de control central que se actualiza en tiempo real vía Supabase Realtime:
* **Métricas Principales:**
  - Total de ventas acumuladas.
  - Ingresos brutos en Pesos (ARS) y Dólares (USD).
  - Cantidad de pedidos pendientes de aprobación o despacho.
  - Alertas de inventario bajo (productos con 3 unidades o menos).
* **Últimos Pedidos:** Tabla rápida con las transacciones más recientes.

---

## 2.3 Pestaña "Productos" (Gestión del Catálogo)

### A. Dar de alta un nuevo producto
1. Hacé click en el botón **"+ Nuevo Producto"**.
2. Completá los campos del formulario:
   - **Nombre del producto:** Título visible en la tienda.
   - **Categoría:** Seleccioná entre *Iconografías*, *Cursos Digitales*, *Talleres y Seminarios*, o *Viajes y Retiros*.
   - **Tipo de producto:** 
     - `Físico` (para obras en madera o insumos que requieren flete).
     - `Digital` (para guías en PDF o cursos descargables).
   - **Precio en ARS ($):** Valor en moneda argentina.
   - **Precio en USD (U$S):** Valor para compradores extranjeros.
   - **Stock disponible:** Cantidad física en existencia. Si es un curso digital, podés colocar un número alto (ej. 999).
   - **Modalidad (para Talleres):** Elegí si es *Presencial* (cupo físico) u *Online* (transmisión en vivo).
   - **Descripción:** Texto explicativo, medidas de la tabla (ej. 25×35 cm), materiales nobles utilizados y cuidados.
   - **Imágenes (hasta 3 fotos):** Podés subir archivos JPG, PNG o WebP de hasta 15 MB. La primera foto será la portada principal.
   - **Material Digital descargable (opcional):** Si el producto es un curso o manual, podés adjuntar el archivo PDF o comprimido ZIP con las lecciones.
3. Hacé click en **"Guardar Producto"**.

### B. Editar, Pausar o Eliminar
* **Modificar:** Hacé click en el ícono del lápiz para corregir precios, cambiar fotos o actualizar el stock.
* **Pausar / Activar (Toggle):** Podés ocultar temporalmente un producto de la tienda pública sin borrarlo tocando el interruptor de estado.
* **Eliminar:** Tocá el ícono del cesto de basura para borrar el artículo de forma permanente.

---

## 2.4 Pestaña "Categorías"
Permite organizar la jerarquía y menús de la tienda:
* Podés crear categorías principales y subcategorías anidadas.
* Asignar una imagen de portada representativa para cada categoría.
* Las 4 categorías principales (*Iconografías*, *Cursos Digitales*, *Talleres y Seminarios*, *Viajes y Retiros*) vienen preconfiguradas con sus modales explicativos específicos en la portada.

---

## 2.5 Pestaña "Pedidos" (Ventas y Despachos)

Aquí se centralizan todas las compras realizadas en la plataforma.

### A. Filtros Inteligentes
Podés filtrar la lista de pedidos combinando:
1. **Por Estado:** Ver solo los *Pendientes*, *Pagados*, *Enviados*, *Entregados* o *Cancelados*.
2. **Por Tipo de Producto:** Aislar rápidamente los pedidos que contienen *Cursos Digitales*, *Talleres* o *Obras Físicas*.
3. **Por Producto Puntual:** Muy útil para talleres o viajes: elegís un taller específico y ves exactamente la nómina de inscritos a esa fecha.

### B. Gestión del Ciclo de Vida de un Pedido
Haciendo click sobre un pedido podés consultar:
* Datos completos del comprador (nombre, email, teléfono de contacto y dirección congelada de envío).
* Desglose de productos, modalidad elegida, subtotal y método de pago (Mercado Pago o Transferencia).
* **Cambio de Estado:**
  - De `Pendiente` a `Pagado`: Al verificar el ingreso de una transferencia bancaria, cambiás el estado a **Pagado**. Automáticamente el sistema envía un correo al cliente confirmando la acreditación (y si compró un curso digital, le envía el botón de descarga en ese mismo mail).
  - De `Pagado` a `Enviado`: Al despachar una iconografía física por correo, podés ingresar el **Número de Seguimiento (Tracking)**. El cliente recibirá un mail con su código de envío.
  - De `Enviado` a `Entregado`: Finaliza el ciclo del pedido.
  - `Cancelado`: Si un pedido se cancela, el sistema restituye automáticamente el stock a la tienda protegiendo la simetría del inventario.

### C. Exportación a Excel (`.xlsx`)
Al presionar el botón **"Exportar a Excel"**, el sistema genera y descarga un archivo `.xlsx` con la nómina filtrada (ideal para llevar listas impresas a los talleres o gestionar los despachos con la empresa de transporte).

---

## 2.6 Pestaña "Blog" (Publicaciones y Artículos)

Permite publicar reflexiones, novedades del taller o guías pedagógicas.

### A. Crear una nueva nota
1. Presioná el botón **"+ Nueva Publicación"**.
2. Completá:
   - **Título:** Encabezado de la nota (ej. *"El secreto de los pigmentos naturales: cuando la tierra se transforma en luz"*).
   - **Subtítulo:** Frase breve de síntesis que aparecerá en las tarjetas y miniaturas.
   - **Imagen de portada:** Foto apaisada (ideal 1200×675 px) representativa del artículo.
   - **Contenido:** Escribí el texto completo. Podés separar párrafos con doble enter para que se lean cómodos.
   - **Estado:** Podés guardarla como *Activo* (se publica de inmediato) o como *Borrador* (solo visible para vos dentro del admin hasta que decidas lanzarla).
3. Presioná **"Guardar Artículo"**.

---

## 2.7 Pestaña "Usuarios" (Administradores)
Permite gestionar quién tiene acceso al panel de administración:
* Podés dar de alta a un nuevo administrador con su propio correo y contraseña.
* Modificar accesos o revocar administradores antiguos.

---

## 2.8 Pestaña "Envíos"
Permite configurar las opciones de logística:
* Costos fijos de envío por zona o provincia.
* Parámetros para paquetería de encomiendas.

---

## 2.9 Pestaña "Ajustes" (Configuración General)

Desde esta sección se controla todo el comportamiento global del e-commerce:

1. **Datos de Contacto Públicos:**
   - **Email de Contacto:** Dirección visible en el footer.
   - **Teléfono / Celular:** Número de contacto que alimenta el botón flotante de WhatsApp.
   - **Dirección del Atelier:** Ubicación física para consultas.
2. **Recepción de Avisos Internos (`email_admin`):**
   - El correo electrónico donde Giselle desea recibir las alertas inmediatas cada vez que un cliente realiza una compra o envía una consulta de contacto.
3. **Banner de Anuncios Superior:**
   - Casilla para activar/desactivar el banner deslizante de la portada.
   - Campo para escribir el mensaje (ej: *"Envíos a todo el país y al exterior. Consultas por obras a pedido"*).
4. **Promociones y Descuentos:**
   - **Descuento global activo:** Porcentaje de rebaja que se aplica automáticamente sobre todos los precios de la tienda.
   - **Envío gratis:** Monto mínimo de compra a partir del cual el costo de flete se vuelve $0 de forma automática.
5. **Datos Bancarios para Transferencias en Pesos (ARS):**
   - Banco, Titular, CUIT, CBU y Alias.
6. **Datos Bancarios para Transferencias en Dólares (USD):**
   - Banco internacional, Titular, Cuenta, CBU/SWIFT y Alias.
7. **Redes Sociales:**
   - Enlaces directos a perfiles de Instagram, Facebook, TikTok y Twitter/X.

Al presionar **"Guardar Configuración"**, todos los cambios se reflejan de inmediato en la tienda pública sin necesidad de reiniciar el servidor.

---

# Resumen de Buenas Prácticas para el Día a Día

1. **Gestión de Stock:** Recordá que las iconografías son piezas únicas; mantener actualizado el stock evita compromisos de entrega de obras ya vendidas.
2. **Revisión de Transferencias:** Al recibir pagos bancarios, contrastá el comprobante con tu cuenta antes de pasar el pedido al estado `Pagado` en el panel.
3. **Imágenes Ligeras:** Guardá siempre las fotos en formato `.webp` o comprimilas antes de subirlas para que la web cargue veloz en cualquier teléfono.
4. **Borradores de Blog:** Podés dejar notas escritas en estado borrador y activarlas el día que quieras comunicar un lanzamiento o retiro.
