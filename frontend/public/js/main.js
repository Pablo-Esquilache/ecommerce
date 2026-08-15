const API_URL = '/api';
let productos = [];
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let globalConfig = null;
let userCurrency = localStorage.getItem('currency') || null;

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
    updateCartUI();
    initCarousel();

    const buscador = document.getElementById('buscador');
    if(buscador) buscador.addEventListener('input', filtrarProductos);
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
});

async function checkMercadoPagoReturn() {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const externalRef = urlParams.get('external_reference');
    
    if (status === 'success' && externalRef) {
        try {
            // Opcional: Llamar a nuestro propio webhook localmente para forzar el update (ideal para dev local sin ngrok)
            await fetch(`${API_URL}/webhooks/mercadopago/return?status=${status}&external_reference=${externalRef}`);
            
            alert("¡Pago exitoso! Tu orden #" + externalRef + " ha sido confirmada.");
            carrito = [];
            saveCart();
            window.history.replaceState({}, document.title, "/");
        } catch(e) { console.error('Error verificando pago:', e); }
    } else if (status === 'failure') {
        alert("El pago no ha sido procesado correctamente.");
        window.history.replaceState({}, document.title, "/");
    } else if (status === 'pending') {
        alert("Tu pago está pendiente de aprobación. Te avisaremos cuando se confirme.");
        window.history.replaceState({}, document.title, "/");
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
        document.getElementById('grid-productos').innerHTML = `<p style="color:red">Error al cargar productos: ${error.message}</p>`;
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
        
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.innerText = cat.nombre;
            select.appendChild(opt);
        });
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

let currentPageDigital = 1;
let currentPageFisico = 1;
const itemsPerPageMain = 12;

// Renderizar en el DOM
function renderProductos(arrayProductos) {
    const container = document.getElementById('productos-dinamicos-container');
    if (!container) return;
    container.innerHTML = '';
    
    if (arrayProductos.length === 0) {
        container.innerHTML = '<p style="text-align:center; width: 100%;">No se encontraron productos.</p>';
        return;
    }

    const digitales = arrayProductos.filter(p => p.tipo_producto === 'digital');
    const fisicos = arrayProductos.filter(p => p.tipo_producto !== 'digital');

    if (digitales.length > 0) {
        renderSeccionProductos(container, 'Productos Digitales', digitales, currentPageDigital, (newPage) => {
            currentPageDigital = newPage;
            renderProductos(arrayProductos);
        });
    }

    if (fisicos.length > 0) {
        renderSeccionProductos(container, 'Productos Físicos', fisicos, currentPageFisico, (newPage) => {
            currentPageFisico = newPage;
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
                <button class="btn btn-block btn-add" onclick="agregarAlCarrito(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}', ${prod.precio}, ${parseFloat(prod.precio_usd) || 0}, '${img}', '${prod.tipo_producto || 'fisico'}')">
                    Agregar al Carrito
                </button>
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
    const texto = document.getElementById('buscador').value.toLowerCase();
    const categoria = document.getElementById('categoria-filtro').value;

    const filtrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(texto);
        const matchCategoria = categoria === "" || p.categoria === categoria;
        return matchTexto && matchCategoria;
    });

    currentPageDigital = 1;
    currentPageFisico = 1;
    renderProductos(filtrados);
}

// --- Carrito Logic ---
function toggleCart() {
    document.getElementById('side-cart').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function agregarAlCarrito(id, nombre, precio, precio_usd, img, tipo_producto) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, precio_usd, img, tipo_producto, cantidad: 1 });
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
function initCarousel() {
    const slides = document.querySelectorAll('.carousel-slide');
    if (slides.length === 0) return;
    
    let currentSlide = 0;
    
    // Cambiar de imagen cada 5 segundos
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 5000);
}

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
        if(conf.id) {
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
    const heroSection = document.getElementById('inicio');
    if (waBtn) {
        // Si no hay hero section, mostramos a partir de los 300px
        const threshold = heroSection ? (heroSection.offsetHeight || 500) - 100 : 300;
        if (window.scrollY > threshold) {
            waBtn.style.opacity = '1';
            waBtn.style.pointerEvents = 'auto';
        } else {
            waBtn.style.opacity = '0';
            waBtn.style.pointerEvents = 'none';
        }
    }
});
