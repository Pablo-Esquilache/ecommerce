const API_URL = '/api';
let productos = [];
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let globalConfig = null;
let userCurrency = localStorage.getItem('currency') || null;

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function detectCurrency() {
    if (userCurrency) return;
    try {
        const res = await fetch('https://get.geojs.io/v1/ip/country.json');
        const data = await res.json();
        if (data && data.country) {
            userCurrency = data.country === 'AR' ? 'ARS' : 'USD';
            localStorage.setItem('currency', userCurrency);
            if (productos && productos.length > 0) renderProductos(productos);
        }
    } catch (e) {
        console.warn('Error detectando país:', e);
        userCurrency = 'ARS';
        localStorage.setItem('currency', 'ARS');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    detectCurrency();
    fetchConfigWeb();
    checkMercadoPagoReturn();
    fetchProductos();
    fetchCategoriasPublic();
    loadCategoriasMenu();
    loadBlogHome();
    updateCartUI();
    initCarousel();

    const buscador = document.getElementById('buscador');
    if(buscador) buscador.addEventListener('input', filtrarProductos);
    const navBuscador = document.getElementById('nav-buscador');
    if(navBuscador) {
        navBuscador.addEventListener('input', filtrarProductos);
        navBuscador.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') scrollToProductos();
        });
    }
    const categoriaFiltro = document.getElementById('categoria-filtro');
    if(categoriaFiltro) categoriaFiltro.addEventListener('change', filtrarProductos);

    // Formulario de Contacto
    const formContacto = document.getElementById('form-contacto');
    if (formContacto) {
        formContacto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = formContacto.querySelector('button[type="submit"]');
            btn.innerText = "Enviando...";
            btn.disabled = true;
            try {
                const payload = {
                    nombre: document.getElementById('contacto-nombre').value,
                    email: document.getElementById('contacto-email').value,
                    asunto: document.getElementById('contacto-asunto').value,
                    mensaje: document.getElementById('contacto-mensaje').value
                };
                const res = await fetch(`${API_URL}/contacto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                
                const data = await res.json();
                if (res.ok) {
                    alert(data.message || "Mensaje enviado exitosamente.");
                    formContacto.reset();
                } else {
                    alert(data.error || "Ocurrió un error al enviar el mensaje.");
                }
            } catch (error) {
                console.error('Error enviando contacto:', error);
                alert("Error de red. Intenta nuevamente.");
            }
            btn.innerText = "Enviar Mensaje";
            btn.disabled = false;
        });
    }

    // Botón de Arrepentimiento (Ley N° 24.240 y Res. 424/2020)
    window.solicitarArrepentimiento = function() {
        const contactoSec = document.getElementById('contacto');
        if (contactoSec) {
            contactoSec.scrollIntoView({ behavior: 'smooth' });
        } else {
            window.location.href = '/#contacto';
            return;
        }
        const asunto = document.getElementById('contacto-asunto');
        const mensaje = document.getElementById('contacto-mensaje');
        if (asunto) asunto.value = 'Solicitud de Arrepentimiento / Revocación (Ley N° 24.240)';
        if (mensaje) {
            mensaje.placeholder = 'Por favor indicá tu número de pedido, fecha de compra y el motivo para coordinar la devolución...';
            mensaje.focus();
        }
    };
});

async function checkMercadoPagoReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const pago = urlParams.get('pago');
    const externalRef = urlParams.get('pedido') || urlParams.get('external_reference');
    const collectionStatus = urlParams.get('collection_status');
    
    if (pago === 'exitoso' || status === 'success' || collectionStatus === 'approved') {
        const ordenTexto = externalRef ? ` #${externalRef}` : '';
        alert(`¡Pago exitoso! Tu orden${ordenTexto} ha sido confirmada.`);
        carrito = [];
        saveCart();
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (pago === 'fallido' || status === 'failure' || collectionStatus === 'rejected') {
        alert("El pago no ha sido procesado o fue rechazado.");
        window.history.replaceState({}, document.title, window.location.pathname);
    } else if (pago === 'pendiente' || status === 'pending' || collectionStatus === 'in_process') {
        alert("Tu pago está pendiente de aprobación. Te avisaremos cuando se confirme.");
        carrito = [];
        saveCart();
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Mobile Menu
function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

// Obtener productos de la API
async function fetchProductos() {
    try {
        const response = await fetch(`${API_URL}/productos`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Server Error');
        productos = data;
        renderProductos(productos);
        validarCarrito(productos); // Silenciosamente corrige precios viejos
    } catch (error) {
        console.error('Error cargando productos:', error);
        const gridErr = document.getElementById('grid-productos') || document.getElementById('productos-dinamicos-container'); if (gridErr) gridErr.innerHTML = `<p style="color:red; text-align:center;">Error al cargar productos: ${error.message}</p>`;
    }
}

// Obtener categorías dinámicas de la API
async function fetchCategoriasPublic() {
    try {
        const response = await fetch(`${API_URL}/categorias`);
        const categorias = await response.json();
        
        const select = document.getElementById('categoria-filtro');
        if (!select) return;
        
        // Mantener "Todas las categorías"
        select.innerHTML = '<option value="">Todas las categorías</option>';
        
        if (Array.isArray(categorias)) { categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.innerText = cat.nombre;
            select.appendChild(opt);
        }); }
    } catch (error) {
        console.error('Error cargando categorias:', error);
    }
}

// Nueva función de Auto-Actualización de Precios del Carrito
function validarCarrito(productosDB) {
    let hayCambios = false;
    carrito.forEach(cartItem => {
        const prodOficial = productosDB.find(p => p.id === cartItem.id);
        if (!prodOficial || Number(prodOficial.stock) < cartItem.cantidad) {
            cartItem.invalido = true;
            cartItem.invalidoMsg = 'Agotado / Sin Stock';
            hayCambios = true;
        } else if (cartItem.precio !== Number(prodOficial.precio)) {
            cartItem.invalido = true;
            cartItem.invalidoMsg = `El precio cambió (ahora $${prodOficial.precio})`;
            hayCambios = true;
        } else {
            if (cartItem.invalido) hayCambios = true;
            cartItem.invalido = false;
            cartItem.invalidoMsg = '';
        }
    });
    if (hayCambios) {
        saveCart();
        updateCartUI(); // Relenderiza mostrar grises y bloqueos
    }
}

let currentPageIconografias = 1;
let currentPageDigitales = 1;
let currentPageTalleres = 1;
let currentPageViajes = 1;
const itemsPerPageMain = 12;

// Inyección dinámica de Schema.org JSON-LD para Google Rich Results
function actualizarSchemaProductos(productos) {
    try {
        let schemaScript = document.getElementById('schema-productos');
        if (!schemaScript) {
            schemaScript = document.createElement('script');
            schemaScript.id = 'schema-productos';
            schemaScript.type = 'application/ld+json';
            document.head.appendChild(schemaScript);
        }
        const schemaData = {
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "Catálogo de Obras y Cursos de Iconografía Bizantina",
            "itemListElement": productos.slice(0, 30).map((p, idx) => ({
                "@type": "ListItem",
                "position": idx + 1,
                "item": {
                    "@type": "Product",
                    "name": p.nombre,
                    "description": p.descripcion ? p.descripcion.substring(0, 160) : p.nombre,
                    "image": p.imagen_1 || 'https://iconografiabizantina.netlify.app/img/og-image.jpg',
                    "offers": {
                        "@type": "Offer",
                        "priceCurrency": "ARS",
                        "price": p.precio,
                        "availability": (p.stock > 0 || p.tipo_producto === 'digital') ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
                    }
                }
            }))
        };
        schemaScript.textContent = JSON.stringify(schemaData);
    } catch(e) {
        console.warn('No se pudo inyectar el schema dinámico:', e);
    }
}

// Renderizar en el DOM
function renderProductos(arrayProductos) {
    const container = document.getElementById('productos-dinamicos-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (!Array.isArray(arrayProductos) || arrayProductos.length === 0) {
        container.innerHTML = '<p style="text-align:center; width: 100%; color:#64748B; font-size:16px; margin: 40px 0;">No se encontraron productos disponibles en este momento.</p>';
        return;
    }

    actualizarSchemaProductos(arrayProductos);

    const iconografias = arrayProductos.filter(p => !p.tipo_producto || p.tipo_producto === 'fisico');
    const digitales = arrayProductos.filter(p => p.tipo_producto === 'digital');
    const talleres = arrayProductos.filter(p => p.tipo_producto === 'taller');
    const viajes = arrayProductos.filter(p => p.tipo_producto === 'viaje');

    if (iconografias.length > 0) {
        renderSeccionProductos(container, 'Iconografías', iconografias, currentPageIconografias, (newPage) => {
            currentPageIconografias = newPage;
            renderProductos(arrayProductos);
        });
    }

    if (digitales.length > 0) {
        renderSeccionProductos(container, 'Cursos Digitales', digitales, currentPageDigitales, (newPage) => {
            currentPageDigitales = newPage;
            renderProductos(arrayProductos);
        });
    }

    if (talleres.length > 0) {
        renderSeccionProductos(container, 'Talleres y Seminarios', talleres, currentPageTalleres, (newPage) => {
            currentPageTalleres = newPage;
            renderProductos(arrayProductos);
        });
    }

    if (viajes.length > 0) {
        renderSeccionProductos(container, 'Viajes y Retiros', viajes, currentPageViajes, (newPage) => {
            currentPageViajes = newPage;
            renderProductos(arrayProductos);
        });
    }
}

function renderSeccionProductos(parentContainer, titulo, productos, currentPage, setPageCallback) {
    // 1. Título de sección
    const title = document.createElement('h3');
    title.className = 'section-dynamic-title';
    title.innerText = titulo;
    parentContainer.appendChild(title);

    // 2. Grilla
    const grid = document.createElement('div');
    grid.className = 'grid-productos';
    
    const totalPages = Math.ceil(productos.length / itemsPerPageMain);
    if(currentPage > totalPages) currentPage = totalPages;
    if(currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPageMain;
    const paginatedItems = productos.slice(start, start + itemsPerPageMain);

    paginatedItems.forEach(prod => {
        const img = prod.imagen_1 || 'https://via.placeholder.com/250';
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <a href="/producto.html?id=${prod.id}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height: 100%;">
                <div class="producto-img-container">
                    <img src="${img}" alt="${prod.nombre}" loading="lazy">
                </div>
                <div class="producto-info">
                    <h3>${prod.nombre}</h3>
                    ${renderPriceHTML(prod)}
                </div>
            </a>
            <div style="padding: 0 20px 20px;">
                ${prod.tipo_producto === 'taller' ? `
                    <button class="btn btn-block btn-add" onclick="window.location.href='/producto.html?id=${prod.id}'">
                        <i class="fas fa-user-plus"></i> Inscribirme
                    </button>
                ` : (prod.tipo_producto === 'viaje' ? `
                    <button class="btn btn-block btn-add" onclick="window.location.href='/producto.html?id=${prod.id}'">
                        <i class="fas fa-ticket-alt"></i> Reservar
                    </button>
                ` : `
                    <button class="btn btn-block btn-add" onclick="agregarAlCarrito(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}', ${prod.precio}, ${parseFloat(prod.precio_usd) || 0}, '${img}', '${prod.tipo_producto || 'fisico'}')">
                        <i class="fas fa-cart-plus"></i> Agregar al Carrito
                    </button>
                `)}
            </div>
        `;
        grid.appendChild(card);
    });
    parentContainer.appendChild(grid);

    // 3. Paginación
    if (totalPages > 1) {
        const pagContainer = document.createElement('div');
        pagContainer.className = 'pagination';
        pagContainer.style.justifyContent = 'center';
        pagContainer.style.marginTop = '20px';
        pagContainer.style.marginBottom = '50px';

        const scrollToSection = () => {
            title.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };

        const btnPrev = document.createElement('button');
        btnPrev.innerText = '< Anterior';
        btnPrev.className = 'btn-pag ' + (currentPage === 1 ? 'disabled' : '');
        if(currentPage > 1) {
            btnPrev.onclick = () => { setPageCallback(currentPage - 1); scrollToSection(); };
        }
        pagContainer.appendChild(btnPrev);

        for(let i=1; i<=totalPages; i++) {
            const btn = document.createElement('button');
            btn.innerText = i;
            btn.className = 'btn-pag ' + (i === currentPage ? 'active' : '');
            if(i !== currentPage) {
                btn.onclick = () => { setPageCallback(i); scrollToSection(); };
            }
            pagContainer.appendChild(btn);
        }

        const btnNext = document.createElement('button');
        btnNext.innerText = 'Siguiente >';
        btnNext.className = 'btn-pag ' + (currentPage === totalPages ? 'disabled' : '');
        if(currentPage < totalPages) {
            btnNext.onclick = () => { setPageCallback(currentPage + 1); scrollToSection(); };
        }
        pagContainer.appendChild(btnNext);
        parentContainer.appendChild(pagContainer);
    } else {
        const spacer = document.createElement('div');
        spacer.style.marginBottom = '40px';
        parentContainer.appendChild(spacer);
    }
}

function filtrarProductos() {
    const nv = document.getElementById('nav-buscador');
    const texto = (nv ? nv.value.toLowerCase() : '') || (document.getElementById('buscador') ? document.getElementById('buscador').value.toLowerCase() : '');
    const catFiltro = expForFilt.cat;
    const subFiltro = expForFilt.sub;

    const filtrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(texto);
        const matchCategoria = !catFiltro || p.categoria === catFiltro;
        const matchSubcategoria = !subFiltro || p.subcategoria === subFiltro;
        return matchTexto && matchCategoria && matchSubcategoria;
    });

    currentPageIconografias = 1;
    currentPageDigitales = 1;
    currentPageTalleres = 1;
    currentPageViajes = 1;
    renderProductos(filtrados);
}

// --- Carrito Logic ---
function toggleCart() {
    document.getElementById('side-cart').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function agregarAlCarrito(id, nombre, precio, precio_usd, img, tipo_producto, modalidad = 'presencial') {
    const itemExistente = carrito.find(item => item.id === id && (item.modalidad || 'presencial') === modalidad);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, precio_usd, img, tipo_producto, modalidad, cantidad: 1 });
    }
    saveCart();
    toggleCart(); // Abre el carrito al añadir
}

function removeFromCart(id) {
    carrito = carrito.filter(item => item.id !== id);
    saveCart();
}

function updateQuantity(id, change) {
    const item = carrito.find(item => item.id === id);
    if (item) {
        item.cantidad += change;
        if (item.cantidad <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
        }
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(carrito));
    updateCartUI();
}

function updateCartUI() {
    const cartCount = document.getElementById('cart-count');
    const cartItems = document.getElementById('cart-items');
    const cartSubtotal = document.getElementById('cart-subtotal');
    
    if (!cartItems) {
        if (cartCount) cartCount.innerText = carrito.reduce((a, b) => a + (b.cantidad || 1), 0);
        return;
    }
    
    cartItems.innerHTML = '';
    let totalItems = 0;
    let subtotal = 0;
    let hayInvalidos = false;

    carrito.forEach(item => {
        const isUSD = userCurrency === 'USD';
        const itemPrecioARS = parseFloat(item.precio) || 0;
        const itemPrecioUSD = parseFloat(item.precio_usd) || 0;
        
        let precioBase = isUSD && itemPrecioUSD > 0 ? itemPrecioUSD : itemPrecioARS;
        let sign = isUSD && itemPrecioUSD > 0 ? 'USD $' : '$';
        
        let precioItem = precioBase;
        let precioOriginalHtml = '';
        
        if (item.invalido) {
            hayInvalidos = true;
        } else {
            if (globalConfig && globalConfig.descuento_activo) {
                const desc = globalConfig.descuento_porcentaje;
                precioItem = precioItem * (1 - desc / 100);
                precioOriginalHtml = `<del style="color:#999; font-size:12px; margin-right:5px;">${sign}${precioBase.toFixed(2)}</del>`;
            }
            totalItems += item.cantidad;
            subtotal += precioItem * item.cantidad;
        }

        const overlayStyle = item.invalido ? 'opacity: 0.5; background: #fdfdfd;' : '';
        const dangerMsg = item.invalidoMsg ? `<span style="color:red; font-size:12px; font-weight:bold;">⚠️ ${item.invalidoMsg}</span><br>` : '';

        cartItems.innerHTML += `
            <div class="cart-item" style="${overlayStyle}">
                <img src="${item.img}" alt="${item.nombre}" class="cart-item-img" loading="lazy">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>${precioOriginalHtml} <span style="color:#e74c3c; font-weight:bold;">${sign}${precioItem.toFixed(2)}</span></p>
                    ${dangerMsg}
                    <div class="cart-item-qty">
                        <button onclick="updateQuantity(${item.id}, -1)" ${item.invalido ? 'disabled' : ''}>-</button>
                        <span>${item.cantidad}</span>
                        <button onclick="updateQuantity(${item.id}, 1)" ${item.invalido ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="remove-item" onclick="removeFromCart(${item.id})">Eliminar</button>
                </div>
            </div>
        `;
    });

    cartCount.innerText = totalItems;
    const isUSD = userCurrency === 'USD';
    const sign = isUSD ? 'USD $' : '$';
    
    // Evaluar envío gratis
    let avisoEnvio = '';
    if (globalConfig && globalConfig.envio_gratis_activo && subtotal > 0 && !isUSD) {
        if (subtotal >= globalConfig.envio_gratis_limite) {
            avisoEnvio = `<div style="color:#27ae60; font-weight:bold; font-size:14px; margin-top:5px;"><i class="fas fa-truck"></i> ¡Tenes Envío Gratis activado!</div>`;
        } else {
            const falta = (globalConfig.envio_gratis_limite - subtotal).toFixed(2);
            avisoEnvio = `<div style="color:#f39c12; font-size:13px; margin-top:5px;">Te faltan $${falta} para envío gratis.</div>`;
        }
    }

    cartSubtotal.innerText = `${sign}${subtotal.toFixed(2)}`;
    
    // Contenedor de aviso
    let contAviso = document.getElementById('cart-aviso-envio');
    if (!contAviso) {
        contAviso = document.createElement('div');
        contAviso.id = 'cart-aviso-envio';
        cartSubtotal.parentElement.parentElement.insertBefore(contAviso, cartSubtotal.parentElement.nextSibling);
    }
    contAviso.innerHTML = avisoEnvio;

    // Bloquear Botón de Checkout Frontend si hay inválidos
    const checkoutBtn = document.querySelector('.cart-footer .btn-block');
    if (checkoutBtn) {
        if (hayInvalidos) {
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.onclick = () => alert("Por favor elimine los productos desactualizados o sin stock de su carrito para poder continuar.");
        } else {
            checkoutBtn.style.opacity = '1';
            checkoutBtn.onclick = goToCheckout;
        }
    }
}

function goToCheckout() {
    if (carrito.length === 0) {
        alert("El carrito está vacío.");
        return;
    }
    window.location.href = '/checkout.html';
}

// Funciones de Contacto consolidadas. (Función duplicada antigua borrada para evitar race-conditions)

// --- Carousel Logic ---
let carouselInterval;
let currentSlideIdx = 0;

function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    currentSlideIdx = 0;
    startCarousel();
}

function startCarousel() {
    clearInterval(carouselInterval);
    carouselInterval = setInterval(() => {
        changeSlide(currentSlideIdx + 1);
    }, 5000);
}

window.changeSlide = function(newIdx) {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    slides[currentSlideIdx].classList.remove('active');
    
    currentSlideIdx = newIdx;
    if (currentSlideIdx >= slides.length) currentSlideIdx = 0;
    if (currentSlideIdx < 0) currentSlideIdx = slides.length - 1;
    
    slides[currentSlideIdx].classList.add('active');
    startCarousel();
};

window.prevSlide = function() { window.changeSlide(currentSlideIdx - 1); };
window.nextSlide = function() { window.changeSlide(currentSlideIdx + 1); };

// --- ABOUT SECTION LOGIC ---
function toggleAbout(btn) {
    const article = btn.closest('.about-article');
    const fullContent = article.querySelector('.about-full');
    
    if (fullContent.style.display === 'none') {
        fullContent.style.display = 'block';
        btn.innerHTML = 'Leer menos <i class="fas fa-chevron-up"></i>';
    } else {
        fullContent.style.display = 'none';
        btn.innerHTML = 'Leer más <i class="fas fa-chevron-down"></i>';
        // Opcional: hacer un pequeño scroll hacia arriba si el texto era muy largo
        // article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// --- CONFIG DATA FETCH ---
async function fetchConfigWeb() {
    try {
        const res = await fetch(`${API_URL}/configuracion`);
        const conf = await res.json();
        if(conf && (conf.id || conf.email || conf.telefono)) {
            globalConfig = conf;
            
            // Renderizar Banner
            if (conf.banner_activo && conf.banner_texto) {
                const bannerDiv = document.getElementById('anuncio-banner');
                if(document.getElementById('anuncio-texto')) document.getElementById('anuncio-texto').innerHTML = conf.banner_texto;
                if(document.getElementById('anuncio-texto-dup')) document.getElementById('anuncio-texto-dup').innerHTML = conf.banner_texto;
                if(bannerDiv) bannerDiv.style.display = 'block';
            }

            // Renderizar Footer Textos
            if(document.getElementById('footer-email')) document.getElementById('footer-email').innerText = conf.email || '';
            if(document.getElementById('footer-telefono')) document.getElementById('footer-telefono').innerText = conf.telefono || '';
            if(document.getElementById('footer-direccion')) document.getElementById('footer-direccion').innerText = conf.direccion || '';
            
            // Renderizar Redes
            let redesHtml = '';
            if (conf.instagram_activo && conf.instagram_url) redesHtml += `<a href="${conf.instagram_url}" target="_blank" style="color:white;"><i class="fab fa-instagram"></i></a>`;
            if (conf.facebook_activo && conf.facebook_url) redesHtml += `<a href="${conf.facebook_url}" target="_blank" style="color:white;"><i class="fab fa-facebook"></i></a>`;
            if (conf.twitter_activo && conf.twitter_url) redesHtml += `<a href="${conf.twitter_url}" target="_blank" style="color:white;"><i class="fab fa-twitter"></i></a>`;
            if (conf.tiktok_activo && conf.tiktok_url) redesHtml += `<a href="${conf.tiktok_url}" target="_blank" style="color:white;"><i class="fab fa-tiktok"></i></a>`;
            if(document.getElementById('footer-redes')) document.getElementById('footer-redes').innerHTML = redesHtml;
            
            // Configurar Botón Flotante de WhatsApp
            if (conf.telefono) {
                const waBtn = document.getElementById('wa-btn');
                if (waBtn) {
                    let cleanPhone = conf.telefono.replace(/\D/g, '');
                    // Si no tiene codigo de area argentino y arranca con 11, etc., asume AR
                    if (cleanPhone.length === 10) cleanPhone = '549' + cleanPhone;
                    waBtn.href = `https://wa.me/${cleanPhone}?text=Hola,%20me%20comunico%20desde%20tu%20página%20web%20y%20quería%20consultarte%20por...`;
                }
            }
            
            // Re-render UI ya que tenemos config ahora
            if(productos && productos.length > 0) renderProductos(productos);
            updateCartUI();
        }
    } catch(e) {
        console.error('Error obteniendo configuracion global:', e);
    }
}

function renderPriceHTML(prod) {
    const isUSD = userCurrency === 'USD';
    const hasDiscount = globalConfig && globalConfig.descuento_activo;
    const discountMult = hasDiscount ? (1 - globalConfig.descuento_porcentaje / 100) : 1;
    
    const priceARS = parseFloat(prod.precio) || 0;
    const finalARS = (priceARS * discountMult).toFixed(2);
    const priceUSD = parseFloat(prod.precio_usd || 0);
    const finalUSD = (priceUSD * discountMult).toFixed(2);

    if (isUSD && priceUSD > 0) {
        return `
            <p class="producto-precio">
                ${hasDiscount ? `<del style="color:#999; font-size:14px; margin-right:5px;">USD $${priceUSD.toFixed(2)}</del>` : ''}
                <span style="color:#e74c3c; font-weight:bold; font-size: 1.2em;">USD $${finalUSD}</span>
                <span style="display:block; color:#7f8c8d; font-size:0.85em; margin-top:2px;">(ARS $${finalARS})</span>
            </p>
        `;
    } else {
        return `
            <p class="producto-precio">
                ${hasDiscount ? `<del style="color:#999; font-size:14px; margin-right:5px;">$${priceARS.toFixed(2)}</del>` : ''}
                <span style="color:#e74c3c; font-weight:bold; font-size: 1.2em;">$${finalARS}</span>
                ${priceUSD > 0 ? `<span style="display:inline-block; color:#7f8c8d; font-size:0.85em; margin-left:5px;">(USD $${finalUSD})</span>` : ''}
            </p>
        `;
    }
}

// Mostrar/Ocultar botón flotante de WhatsApp según el scroll
window.addEventListener('scroll', () => {
    const waBtn = document.getElementById('wa-btn');
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    const heroSection = document.getElementById('inicio');
    
    const threshold = heroSection ? (heroSection.offsetHeight || 500) - 100 : 300;
    
    if (window.scrollY > threshold) {
        if (waBtn) { waBtn.style.opacity = '1'; waBtn.style.pointerEvents = 'auto'; }
        if (scrollTopBtn) { scrollTopBtn.style.opacity = '1'; scrollTopBtn.style.pointerEvents = 'auto'; }
    } else {
        if (waBtn) { waBtn.style.opacity = '0'; waBtn.style.pointerEvents = 'none'; }
        if (scrollTopBtn) { scrollTopBtn.style.opacity = '0'; scrollTopBtn.style.pointerEvents = 'none'; }
    }
});

let expForFilt = { cat: null, sub: null };
async function loadCategoriasMenu() {
  try {
    const res = await fetch('/api/categorias/tree');
    const categorias = await res.json();
    if (!Array.isArray(categorias)) return;
    const dMenu = document.getElementById('nav-dropdown-menu');
    if (dMenu && categorias.length > 0) {
      dMenu.innerHTML = '';
      categorias.forEach(cat => {
        let h = '<li><a href="#productos" onclick="filCat(\'' + cat.nombre + '\')">' + cat.nombre;
        if (cat.subcategorias.length > 0) {
          h += ' <i class="fas fa-chevron-right" style="font-size:10px;"></i></a><ul class="submenu">';
          cat.subcategorias.forEach(sub => {
            h += '<li><a href="#productos" onclick="filSub(\'' + cat.nombre + '\', \'' + sub + '\')">' + sub + '</a></li>';
          });
          h += '</ul>';
        } else {
          h += '</a>';
        }
        h += '</li>';
        dMenu.innerHTML += h;
      });
    }
    const cGrid = document.getElementById('categorias-grid');
    if (cGrid && categorias.length > 0) {
      categorias.sort((a, b) => {
        const getPriority = (nom) => {
          const n = (nom || '').toLowerCase();
          if (n.includes('iconograf')) return 1;
          if (n.includes('curso')) return 2;
          if (n.includes('taller') || n.includes('seminario')) return 3;
          if (n.includes('viaje') || n.includes('retiro')) return 4;
          return 5;
        };
        return getPriority(a.nombre) - getPriority(b.nombre);
      });
      cGrid.innerHTML = '';
      categorias.forEach(cat => {
        const img = cat.imagen_url || 'img/logo.png';
        const nomEsc = escapeHtml(cat.nombre);
        cGrid.innerHTML += `
          <div class="cat-card" role="button" tabindex="0" onclick="abrirModalCategoria('${nomEsc}', '${escapeHtml(img)}')">
            <div class="cat-card-img"><img src="${img}" alt="${nomEsc}" width="300" height="300" loading="lazy"></div>
            <div class="cat-card-info">
              <h3>${nomEsc}</h3>
              <span class="cat-card-badge-info"><i class="fas fa-info-circle"></i> Conocer más</span>
            </div>
          </div>`;
      });
    } else if (cGrid) {
      document.querySelector('.categorias-cards-section').style.display = 'none';
    }
  } catch(e) { console.error(e); }
}
function filCat(c) { expForFilt.cat = c; expForFilt.sub = null; filtrarProductos(); }
function filSub(c, s) { expForFilt.cat = c; expForFilt.sub = s; filtrarProductos(); }

function scrollToProductos() {
    const sect = document.getElementById('productos');
    if (sect) {
        const offset = 80;
        const top = sect.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
    }
}

// ======================================================
// MODAL DE DETALLE DE CATEGORÍAS EN PORTADA
// ======================================================
const CATEGORIAS_DETALLES = {
  iconografia: {
    titulo: "Iconografía Bizantina Tradicional",
    subtitulo: "Venta de pinturas sacras originales y obras personalizadas a pedido",
    parrafos: [
      "En esta sección podés adquirir pinturas sacras auténticas y originales, creadas individualmente bajo los cánones estéticos y teológicos de la tradición bizantina milenaria.",
      "Además de las obras disponibles en catálogo, podés solicitar íconos personalizados por encargo: podés elegir la advocación mariana, Cristo, santos patronos o escenas bíblicas particulares, así como las dimensiones y detalles ornamentales específicos para capillas, oratorios familiares, parroquias, o como regalo conmemorativo de bodas, bautismos y ordenaciones.",
      "Cada obra es una pieza única de colección y devoción. Se realiza sobre tablas de madera maciza preparadas artesanalmente con levkas (yeso y cola de conejo), doradas con pan de oro legítimo, y pintadas pacientemente mediante la técnica histórica del temple al huevo con pigmentos minerales y naturales molidos a mano. Cada pintura se entrega lista para colgar, firmada por la artista y con su certificado de autenticidad y memoria técnica."
    ],
    botonTexto: "Ver obras disponibles",
    categoriaFiltro: "Iconografías"
  },
  cursos: {
    titulo: "Cursos y Capacitaciones Online",
    subtitulo: "Formación integral en arte sacro para aprender desde cualquier lugar del mundo",
    parrafos: [
      "Nuestros programas formativos en video están pensados tanto para quienes nunca tomaron un pincel como para artistas, restauradores y docentes que desean dominar el método riguroso de la iconografía bizantina.",
      "Al adquirir un curso digital, obtenés acceso inmediato, ilimitado y de por vida a un aula virtual donde aprenderás cada fase del proceso: la teología de la imagen, el dibujo geométrico canónico, la preparación de la emulsión al temple de huevo, la molienda de tierras y minerales, y las sucesivas capas de luces (ochrenie) y sombras (proplasmos).",
      "El material incluye lecciones en video en alta definición, manuales descargables en formato PDF con esquemas anatómicos y paletas cromáticas recomendadas, listas detalladas de proveedores de materiales e insumos, y canales directos para resolver dudas durante tu aprendizaje."
    ],
    botonTexto: "Ver cursos disponibles",
    categoriaFiltro: "Cursos Digitales"
  },
  talleres: {
    titulo: "Talleres y Seminarios Vivos",
    subtitulo: "Experiencia práctica intensiva con acompañamiento personalizado y corrección en tiempo real",
    parrafos: [
      "Si preferís la dinámica de un taller interactivo y el intercambio directo con la docente, estos espacios están diseñados para guiarte en la elaboración completa de un ícono, acompañando cada pincelada paso a paso.",
      "Modalidad Presencial: Se dictan en el atelier y en espacios culturales y religiosos de distintas ciudades. Son cupos reducidos para garantizar un seguimiento minucioso. Brindamos un entorno de silencio, concentración y calidez fraterna, con todas las maderas curadas, pinceles finos y pigmentos tradicionales incluidos.",
      "Modalidad Online en Vivo (Sincrónica): Clases magistrales y prácticas transmitidas por videoconferencia con cámara cenital sobre la mesa de trabajo. Te permiten pintar desde tu casa pero interactuando en vivo, recibiendo correcciones individuales y compartiendo la evolución con el resto del grupo. Las inscripciones se abren periódicamente con cupos limitados según el cronograma de fechas de cada ciclo."
    ],
    botonTexto: "Ver talleres y seminarios",
    categoriaFiltro: "Talleres y Seminarios"
  },
  viajes: {
    titulo: "Retiros y Viajes Contemplativos",
    subtitulo: "Una vivencia profunda que une arte sagrado, espiritualidad, historia y silencio",
    parrafos: [
      "Una propuesta única para alejarse de las exigencias cotidianas y sumergirse en una experiencia transformadora donde la pintura del ícono se convierte en un camino de oración interior y comunión.",
      "Retiros Espirituales y Artísticos: Convivencias de varios días en abadías, monasterios o entornos de naturaleza y tranquilidad. Combinamos jornadas intensivas de pintura y aprendizaje técnico con tiempos de meditación, charlas sobre historia del arte cristiano primitivo, liturgia y silencio contemplativo.",
      "Viajes Temáticos y Rutas de Arte Sacro: Itinerarios culturales guiados hacia centros emblemáticos de la iconografía, templos y museos, pensados para contemplar las obras maestras en su contexto original y nutrir la mirada del artista y el creyente. Cada propuesta incluye alojamiento, comidas, kits completos de trabajo y la coordinación integral para vivir una experiencia enriquecedora tanto a nivel técnico como humano y espiritual."
    ],
    botonTexto: "Ver retiros disponibles",
    categoriaFiltro: "Viajes y Retiros"
  }
};

let currentModalCatFiltro = null;

function getDetalleCategoria(nombre) {
  const n = (nombre || '').toLowerCase();
  if (n.includes('iconograf')) return CATEGORIAS_DETALLES.iconografia;
  if (n.includes('curso')) return CATEGORIAS_DETALLES.cursos;
  if (n.includes('taller') || n.includes('seminario')) return CATEGORIAS_DETALLES.talleres;
  if (n.includes('viaje') || n.includes('retiro')) return CATEGORIAS_DETALLES.viajes;
  return null;
}

function abrirModalCategoria(nombre, imgUrl) {
  const detalle = getDetalleCategoria(nombre) || {
    titulo: nombre,
    subtitulo: 'Propuesta de arte sacro y formación bizantina',
    parrafos: ['Conocé más sobre esta propuesta y consultá las opciones vigentes.'],
    botonTexto: 'Ver en catálogo',
    categoriaFiltro: nombre
  };

  currentModalCatFiltro = detalle.categoriaFiltro || nombre;

  const modalBody = document.getElementById('modal-categoria-body');
  const actionBtn = document.getElementById('modal-cat-action-btn');
  const modal = document.getElementById('modal-categoria');
  if (!modalBody || !modal) return;

  const parrafosHtml = detalle.parrafos.map(p => `<p>${escapeHtml(p)}</p>`).join('');

  modalBody.innerHTML = `
    ${imgUrl ? `<div class="cat-modal-hero-img"><img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(detalle.titulo)}"></div>` : ''}
    <span class="cat-modal-badge"><i class="fas fa-feather-alt"></i> María Magdalena</span>
    <h2 class="cat-modal-title">${escapeHtml(detalle.titulo)}</h2>
    <p class="cat-modal-subtitle">${escapeHtml(detalle.subtitulo)}</p>
    <div class="cat-modal-body-text">
      ${parrafosHtml}
    </div>
  `;

  if (actionBtn) {
    actionBtn.innerHTML = `<span>${escapeHtml(detalle.botonTexto || 'Ver en catálogo')}</span> <i class="fas fa-arrow-right"></i>`;
  }

  // Scroll posicionado estrictamente al inicio
  modalBody.scrollTop = 0;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function explorarCategoriaDesdeModal() {
  const cat = currentModalCatFiltro;
  cerrarModalCategoria();
  if (cat) {
    filCat(cat);
    scrollToProductos();
  }
}

function cerrarModalCategoria(e) {
  if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('custom-modal-close') && !e.target.classList.contains('btn-modal-close')) {
    return;
  }
  const modal = document.getElementById('modal-categoria');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  }
}

// ======================================================
// SECCIÓN DE ÚLTIMAS DEL BLOG EN HOME
// ======================================================
let blogHomeArticulos = [];

async function loadBlogHome() {
  const grid = document.getElementById('blog-home-grid');
  if (!grid) return;
  try {
    const res = await fetch(`${API_URL}/blog`);
    if (!res.ok) throw new Error('Error al cargar notas');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      const sec = document.getElementById('blog-home');
      if (sec) sec.style.display = 'none';
      return;
    }

    // Tomar las 3 últimas publicaciones
    blogHomeArticulos = data.slice(0, 3);

    grid.innerHTML = blogHomeArticulos.map(art => {
      const fecha = new Date(art.creado_en || Date.now()).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      const titEsc = escapeHtml(art.titulo);
      const subEsc = art.subtitulo ? escapeHtml(art.subtitulo) : '';
      const img = art.imagen_portada || 'img/portada1.webp';

      return `
        <article class="blog-home-card" onclick="abrirModalBlog(${art.id})" role="button" tabindex="0">
          <div class="blog-home-img-wrap">
            <img src="${img}" alt="${titEsc}" loading="lazy">
          </div>
          <div class="blog-home-content">
            <span class="blog-home-date"><i class="far fa-calendar-alt"></i> ${fecha}</span>
            <h3 class="blog-home-title">${titEsc}</h3>
            ${subEsc ? `<p class="blog-home-sub">${subEsc}</p>` : ''}
            <span class="blog-home-cta">Leer nota <i class="fas fa-arrow-right"></i></span>
          </div>
        </article>
      `;
    }).join('');
  } catch (err) {
    console.warn('No se pudieron cargar las notas en la portada:', err);
    const sec = document.getElementById('blog-home');
    if (sec) sec.style.display = 'none';
  }
}

function abrirModalBlog(id) {
  const art = blogHomeArticulos.find(a => a.id === id);
  if (!art) {
    window.location.href = `articulo.html?id=${id}`;
    return;
  }

  const fecha = new Date(art.creado_en || Date.now()).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const titEsc = escapeHtml(art.titulo);
  const subEsc = art.subtitulo ? escapeHtml(art.subtitulo) : '';
  const img = art.imagen_portada || 'img/portada1.webp';

  const parrafos = (art.contenido || '')
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');

  const modalBody = document.getElementById('modal-blog-body');
  const actionLink = document.getElementById('modal-blog-action-btn');
  const modal = document.getElementById('modal-blog');
  if (!modalBody || !modal) return;

  modalBody.innerHTML = `
    <div class="modal-blog-header-img">
      <img src="${img}" alt="${titEsc}">
    </div>
    <div class="modal-blog-meta">
      <span><i class="far fa-calendar-alt"></i> ${fecha}</span>
      <span><i class="fas fa-feather-alt"></i> Por Giselle Ochoa</span>
    </div>
    <h2 class="modal-blog-title">${titEsc}</h2>
    ${subEsc ? `<h4 class="modal-blog-sub">${subEsc}</h4>` : ''}
    <div class="modal-blog-text">
      ${parrafos}
    </div>
  `;

  if (actionLink) {
    actionLink.href = 'blog.html';
  }

  // Scroll posicionado al inicio
  modalBody.scrollTop = 0;

  modal.style.display = 'flex';
  setTimeout(() => modal.classList.add('active'), 10);
}

function cerrarModalBlog(e) {
  if (e && e.target && e.target !== e.currentTarget && !e.target.classList.contains('custom-modal-close') && !e.target.classList.contains('btn-modal-close')) {
    return;
  }
  const modal = document.getElementById('modal-blog');
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => { modal.style.display = 'none'; }, 250);
  }
}

// Cerrar cualquier modal con tecla Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarModalCategoria();
    cerrarModalBlog();
  }
});
