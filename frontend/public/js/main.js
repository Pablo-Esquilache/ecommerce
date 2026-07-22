const API_URL = '/api';
let productos = [];
let carrito = JSON.parse(localStorage.getItem('cart')) || [];
let globalConfig = null;

document.addEventListener('DOMContentLoaded', () => {
    fetchConfigWeb();
    checkMercadoPagoReturn();
    fetchProductos();
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

let currentPageMain = 1;
const itemsPerPageMain = 16;

// Renderizar en el DOM
function renderProductos(arrayProductos) {
    const grid = document.getElementById('grid-productos');
    grid.innerHTML = '';
    
    if (arrayProductos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align:center;">No se encontraron productos.</p>';
        const pCont = document.getElementById('productos-pagination');
        if(pCont) pCont.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(arrayProductos.length / itemsPerPageMain);
    if(currentPageMain > totalPages) currentPageMain = totalPages;
    if(currentPageMain < 1) currentPageMain = 1;

    const start = (currentPageMain - 1) * itemsPerPageMain;
    const paginatedItems = arrayProductos.slice(start, start + itemsPerPageMain);

    paginatedItems.forEach(prod => {
        const img = prod.imagen_1 || 'https://via.placeholder.com/250';
        const card = document.createElement('div');
        card.className = 'producto-card';
        card.innerHTML = `
            <a href="/producto.html?id=${prod.id}" style="text-decoration:none; color:inherit; display:flex; flex-direction:column; height: 100%;">
                <div class="producto-img-container">
                    <img src="${img}" alt="${prod.nombre}">
                </div>
                <div class="producto-info">
                    <h3>${prod.nombre}</h3>
                    ${globalConfig && globalConfig.descuento_activo ? 
                        `<p class="producto-precio">
                            <del style="color:#999; font-size:14px; margin-right:5px;">$${parseFloat(prod.precio).toFixed(2)}</del> 
                            <span style="color:#e74c3c; font-weight:bold;">$${(prod.precio * (1 - globalConfig.descuento_porcentaje / 100)).toFixed(2)}</span>
                        </p>` 
                        : `<p class="producto-precio">$${parseFloat(prod.precio).toFixed(2)}</p>`
                    }
                </div>
            </a>
            <div style="padding: 0 20px 20px;">
                <button class="btn btn-block btn-add" onclick="agregarAlCarrito(${prod.id}, '${prod.nombre.replace(/'/g, "\\'")}', ${prod.precio}, '${img}', '${prod.tipo_producto || 'fisico'}')">
                    Agregar al Carrito
                </button>
            </div>
        `;
        grid.appendChild(card);
    });

    renderPaginationMain(totalPages, arrayProductos);
}

function renderPaginationMain(totalPages, currentArray) {
    const pagCont = document.getElementById('productos-pagination');
    if(!pagCont) return;
    pagCont.innerHTML = '';
    
    if(totalPages <= 1) return;

    const scrollToProducts = () => {
        const section = document.getElementById('productos');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const btnPrev = document.createElement('button');
    btnPrev.innerText = '< Anterior';
    btnPrev.className = 'btn-pag ' + (currentPageMain === 1 ? 'disabled' : '');
    if(currentPageMain > 1) {
        btnPrev.onclick = () => { currentPageMain--; renderProductos(currentArray); scrollToProducts(); };
    }
    pagCont.appendChild(btnPrev);

    for(let i=1; i<=totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = 'btn-pag ' + (i === currentPageMain ? 'active' : '');
        if(i !== currentPageMain) {
            btn.onclick = () => { currentPageMain = i; renderProductos(currentArray); scrollToProducts(); };
        }
        pagCont.appendChild(btn);
    }

    const btnNext = document.createElement('button');
    btnNext.innerText = 'Siguiente >';
    btnNext.className = 'btn-pag ' + (currentPageMain === totalPages ? 'disabled' : '');
    if(currentPageMain < totalPages) {
        btnNext.onclick = () => { currentPageMain++; renderProductos(currentArray); scrollToProducts(); };
    }
    pagCont.appendChild(btnNext);
}

function filtrarProductos() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    const categoria = document.getElementById('categoria-filtro').value;

    const filtrados = productos.filter(p => {
        const matchTexto = p.nombre.toLowerCase().includes(texto);
        const matchCategoria = categoria === "" || p.categoria === categoria;
        return matchTexto && matchCategoria;
    });

    currentPageMain = 1;
    renderProductos(filtrados);
}

// --- Carrito Logic ---
function toggleCart() {
    document.getElementById('side-cart').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('open');
}

function agregarAlCarrito(id, nombre, precio, img, tipo_producto) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({ id, nombre, precio, img, tipo_producto, cantidad: 1 });
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
        let precioItem = parseFloat(item.precio);
        let precioOriginalHtml = '';
        
        if (item.invalido) {
            hayInvalidos = true;
        } else {
            if (globalConfig && globalConfig.descuento_activo) {
                const desc = globalConfig.descuento_porcentaje;
                precioItem = precioItem * (1 - desc / 100);
                precioOriginalHtml = `<del style="color:#999; font-size:12px; margin-right:5px;">$${parseFloat(item.precio).toFixed(2)}</del>`;
            }
            totalItems += item.cantidad;
            subtotal += precioItem * item.cantidad;
        }

        const overlayStyle = item.invalido ? 'opacity: 0.5; background: #fdfdfd;' : '';
        const dangerMsg = item.invalidoMsg ? `<span style="color:red; font-size:12px; font-weight:bold;">⚠️ ${item.invalidoMsg}</span><br>` : '';

        cartItems.innerHTML += `
            <div class="cart-item" style="${overlayStyle}">
                <img src="${item.img}" alt="${item.nombre}" class="cart-item-img">
                <div class="cart-item-info">
                    <h4>${item.nombre}</h4>
                    <p>${precioOriginalHtml} <span style="color:#e74c3c; font-weight:bold;">$${precioItem.toFixed(2)}</span></p>
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
    
    // Evaluar envío gratis
    let avisoEnvio = '';
    if (globalConfig && globalConfig.envio_gratis_activo && subtotal > 0) {
        if (subtotal >= globalConfig.envio_gratis_limite) {
            avisoEnvio = `<div style="color:#27ae60; font-weight:bold; font-size:14px; margin-top:5px;"><i class="fas fa-truck"></i> ¡Tenes Envío Gratis activado!</div>`;
        } else {
            const falta = (globalConfig.envio_gratis_limite - subtotal).toFixed(2);
            avisoEnvio = `<div style="color:#e67e22; font-size:13px; margin-top:5px;">Te faltan $${falta} para envío gratis.</div>`;
        }
    }
    
    cartSubtotal.innerHTML = `$${subtotal.toFixed(2)} <br> ${avisoEnvio}`;

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
            
            // Re-render UI ya que tenemos config ahora
            if(productos && productos.length > 0) renderProductos(productos);
            updateCartUI();
        }
    } catch(e) {
        console.error('Error obteniendo configuracion global:', e);
    }
}
