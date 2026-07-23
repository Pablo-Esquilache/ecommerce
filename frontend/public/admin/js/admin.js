const API_URL = '/api';

// --- Pagination Variables ---
let currentAdminPageProductos = 1;
let currentAdminPagePedidos = 1;
let currentAdminPageClientes = 1;
const ITEMS_PER_PAGE_ADMIN = 20;

function renderAdminPagination(containerId, totalPages, currentPage, onPageClick) {
    const cont = document.getElementById(containerId);
    if(!cont) return;
    cont.innerHTML = '';
    if(totalPages <= 1) return;

    const btnPrev = document.createElement('button');
    btnPrev.innerText = '< Anterior';
    btnPrev.className = 'btn-pag ' + (currentPage === 1 ? 'disabled' : '');
    if(currentPage > 1) {
        btnPrev.onclick = () => onPageClick(currentPage - 1);
    }
    cont.appendChild(btnPrev);

    for(let i=1; i<=totalPages; i++) {
        const btn = document.createElement('button');
        btn.innerText = i;
        btn.className = 'btn-pag ' + (i === currentPage ? 'active' : '');
        if(i !== currentPage) {
            btn.onclick = () => onPageClick(i);
        }
        cont.appendChild(btn);
    }

    const btnNext = document.createElement('button');
    btnNext.innerText = 'Siguiente >';
    btnNext.className = 'btn-pag ' + (currentPage === totalPages ? 'disabled' : '');
    if(currentPage < totalPages) {
        btnNext.onclick = () => onPageClick(currentPage + 1);
    }
    cont.appendChild(btnNext);
}

// Función para Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorMsg = document.getElementById('error-msg');
        const btn = document.getElementById('btn-submit');
        
        btn.innerText = "Cargando...";
        try {
            const res = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (res.ok) {
                localStorage.setItem('admin_token', data.token);
                localStorage.setItem('admin_name', data.nombre);
                window.location.href = '/admin/index.html';
            } else {
                errorMsg.innerText = data.error;
                errorMsg.style.display = 'block';
                btn.innerText = "Ingresar";
            }
        } catch (err) {
            errorMsg.innerText = "Error de red";
            errorMsg.style.display = 'block';
            btn.innerText = "Ingresar";
        }
    });
}

// Global Headers con Token
function authHeaders() {
    const token = localStorage.getItem('admin_token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// Inicializar Dashboard
async function initDashboard() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }
    
    document.getElementById('dashboard-body').style.display = 'flex';
    document.getElementById('admin-name').innerText = localStorage.getItem('admin_name') || 'Admin';

    // Cargar info del dashboard
    fetchDashboardStats();
    fetchProductos(); // Precargar productos
    fetchPedidos(); // Precargar pedidos
    fetchClientes(); // Precargar clientes
    fetchConfiguracion(); // Precargar Módulo de Ajustes
    fetchCategorias(); // Cargar categorías para el modal de productos

    // Restaurar última pestaña activa
    const lastTab = localStorage.getItem('admin_active_tab') || 'dashboard';
    const tabElement = document.querySelector(`.sidebar .nav li[onclick*="switchTab('${lastTab}'"]`);
    switchTab(lastTab, tabElement);
}

// Tabs
function switchTab(tabId, el) {
    localStorage.setItem('admin_active_tab', tabId);

    document.querySelectorAll('.sidebar .nav li').forEach(li => li.classList.remove('active'));
    if(el) {
        el.classList.add('active');
    } else {
        const fallbackEl = document.querySelector(`.sidebar .nav li[onclick*="switchTab('${tabId}'"]`);
        if(fallbackEl) fallbackEl.classList.add('active');
    }
    
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    
    const section = document.getElementById(`view-${tabId}`);
    if(section) section.classList.add('active'); // Added safety check

    const titles = { dashboard: 'Dashboard', productos: 'Gestión de Productos', pedidos: 'Gestión de Pedidos', clientes: 'Listado de Clientes', usuarios: 'Administradores', ajustes: 'Ajustes del Sistema' };
    document.getElementById('page-title').innerText = titles[tabId] || 'Dashboard';
    
    if (tabId === 'usuarios') loadUsuarios();
}

let adminPedidosCache = [];

async function fetchPedidos() {
    try {
        const res = await fetch(`${API_URL}/pedidos`, { headers: authHeaders() });
        adminPedidosCache = await res.json();
        renderAdminPedidos(adminPedidosCache);
    } catch(e) { console.error('Error cargando pedidos:', e); }
}

function renderAdminPedidos(pedidos) {
    const pTB = document.getElementById('pedidos-list-tb');
    if(!pTB) return;
    pTB.innerHTML = '';
    
    if(pedidos.length === 0) {
        pTB.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No hay pedidos registrados en este estado</td></tr>';
        const pCont = document.getElementById('pedidos-pagination');
        if(pCont) pCont.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(pedidos.length / ITEMS_PER_PAGE_ADMIN);
    if(currentAdminPagePedidos > totalPages) currentAdminPagePedidos = totalPages;
    if(currentAdminPagePedidos < 1) currentAdminPagePedidos = 1;

    const start = (currentAdminPagePedidos - 1) * ITEMS_PER_PAGE_ADMIN;
    const paginatedItems = pedidos.slice(start, start + ITEMS_PER_PAGE_ADMIN);

    paginatedItems.forEach(p => {
        const isPagado = p.estado === 'pagado';
        const isSend = p.estado === 'enviado';
        pTB.innerHTML += `<tr>
            <td>#${p.id}</td>
            <td>${p.cliente_nombre} - <small>${p.cliente_email}</small></td>
            <td>$${parseFloat(p.total).toLocaleString('es-AR')}</td>
            <td><span class="badge ${p.estado}">${p.estado}</span></td>
            <td>${p.metodo_pago}</td>
            <td>
                <select onchange="updatePedidoStatus(${p.id}, this.value)" style="padding:4px; border-radius:4px;">
                    <option value="pendiente" ${p.estado==='pendiente'?'selected':''}>Pendiente</option>
                    <option value="pagado" ${isPagado?'selected':''}>Pagado</option>
                    <option value="preparando_envio" ${p.estado==='preparando_envio'?'selected':''}>Preparando Envío</option>
                    <option value="enviado" ${isSend?'selected':''}>Enviado</option>
                    <option value="entregado" ${p.estado==='entregado'?'selected':''}>Entregado</option>
                    <option value="cancelado" ${p.estado==='cancelado'?'selected':''}>Cancelado</option>
                </select>
            </td>
            <td>
                <button class="btn" style="background:#2ecc71; color:white; padding: 4px 8px;" onclick="verEticket(${p.id})"><i class="fas fa-ticket-alt"></i> Ver ticket</button>
            </td>
        </tr>`;
    });

    renderAdminPagination('pedidos-pagination', totalPages, currentAdminPagePedidos, (page) => {
        currentAdminPagePedidos = page;
        renderAdminPedidos(pedidos);
    });
}

async function verEticket(pedidoId) {
    try {
        const res = await fetch(`${API_URL}/pedidos/${pedidoId}`, { headers: authHeaders() });
        if (!res.ok) throw new Error("No se pudo obtener el pedido");
        const p = await res.json();
        
        let detalleHtml = '';
        if (p.detalles && p.detalles.length > 0) {
            p.detalles.forEach(d => {
                detalleHtml += `<div>${d.cantidad}x ${d.producto_nombre} - $${parseFloat(d.subtotal).toLocaleString('es-AR')}</div>`;
            });
        }
        
        const fecha = new Date(p.fecha_creacion || Date.now()).toLocaleDateString('es-AR');

        document.getElementById('eticket-content').innerHTML = `
            <div style="text-align:center; border-bottom:1px dashed #ccc; padding-bottom:10px; margin-bottom:10px;">
                <h3 style="margin:0;">E-Shopper Libros</h3>
                <small>Comprobante de Venta</small><br>
                <strong>Ticket #${p.id}</strong><br>
                <span>Fecha: ${fecha}</span>
            </div>
            <div style="margin-bottom:10px;">
                <strong>Cliente:</strong> ${p.nombre} ${p.apellido}<br>
                <strong>Email:</strong> ${p.email}<br>
                <strong>Método Pago:</strong> ${p.metodo_pago}<br>
                <strong>Estado:</strong> ${p.estado.toUpperCase()}
            </div>
            <div style="border-top:1px dashed #ccc; padding-top:10px;">
                <strong>Artículos:</strong>
                ${detalleHtml}
            </div>
            <div style="text-align:right; margin-top:10px; font-size:18px; font-weight:bold; border-top:1px dashed #ccc; padding-top:10px;">
                <small>Envío (Contra Reembolso): $0.00</small><br>
                TOTAL: $${parseFloat(p.total).toLocaleString('es-AR')}
            </div>
        `;
        openModal('eticket-modal');
    } catch(err) {
        console.error(err);
        alert('Error abriendo E-Ticket');
    }
}

async function updatePedidoStatus(id, estado) {
    try {
        const res = await fetch(`${API_URL}/pedidos/${id}/estado`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ estado })
        });
        if(res.ok) {
            // Recargar info sin refrescar todo
            fetchDashboardStats();
            fetchPedidos();
        } else {
            alert('Error al actualizar el estado del pedido');
            fetchPedidos(); // Reset combo box
        }
    } catch(e) { console.error(e); }
}

let adminClientesCache = [];

async function fetchClientes() {
    try {
        const res = await fetch(`${API_URL}/admin/clientes`, { headers: authHeaders() });
        adminClientesCache = await res.json();
        renderAdminClientes(adminClientesCache);
    } catch(e) { console.error('Error cargando clientes:', e); }
}

function renderAdminClientes(clientes) {
    const cTB = document.getElementById('clientes-list-tb');
    if(!cTB) return;
    cTB.innerHTML = '';
    if(clientes.length === 0) {
        cTB.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px;">No se encontraron clientes</td></tr>';
        const cCont = document.getElementById('clientes-pagination');
        if(cCont) cCont.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(clientes.length / ITEMS_PER_PAGE_ADMIN);
    if(currentAdminPageClientes > totalPages) currentAdminPageClientes = totalPages;
    if(currentAdminPageClientes < 1) currentAdminPageClientes = 1;

    const start = (currentAdminPageClientes - 1) * ITEMS_PER_PAGE_ADMIN;
    const paginatedItems = clientes.slice(start, start + ITEMS_PER_PAGE_ADMIN);

    paginatedItems.forEach(c => {
        const generoDisplay = c.genero ? c.genero.charAt(0).toUpperCase() + c.genero.slice(1) : '-';
        cTB.innerHTML += `<tr>
            <td>${c.id}</td>
            <td>${c.nombre} ${c.apellido}</td>
            <td>${c.email}</td>
            <td>${c.telefono || '-'}</td>
            <td>${generoDisplay}</td>
            <td>${c.dni_cuil || '-'}</td>
            <td><button class="btn" style="background:#3498db; color:white; padding: 4px 8px;" onclick="verHistorialCliente(${c.id})"><i class="fas fa-history"></i> Ver</button></td>
        </tr>`;
    });

    renderAdminPagination('clientes-pagination', totalPages, currentAdminPageClientes, (page) => {
        currentAdminPageClientes = page;
        renderAdminClientes(clientes);
    });
}

async function verHistorialCliente(clienteId) {
    try {
        const res = await fetch(`${API_URL}/pedidos`, { headers: authHeaders() });
        const todosPedidos = await res.json();
        
        // Filtrar del lado del cliente por simplicidad
        const pedidosDelCliente = todosPedidos.filter(p => p.cliente_id === clienteId || String(p.cliente_id) === String(clienteId));
        
        const tb = document.getElementById('historial-tb');
        tb.innerHTML = '';
        if (pedidosDelCliente.length === 0) {
            tb.innerHTML = '<tr><td colspan="4">No tiene compras registradas.</td></tr>';
        } else {
            pedidosDelCliente.forEach(p => {
                tb.innerHTML += `<tr>
                    <td>#${p.id}</td>
                    <td>${new Date(p.fecha_creacion || Date.now()).toLocaleDateString('es-AR')}</td>
                    <td>$${parseFloat(p.total).toLocaleString('es-AR')}</td>
                    <td><span class="badge ${p.estado}">${p.estado}</span></td>
                    <td><button class="btn" style="background:#2ecc71; color:white; padding: 2px 6px; font-size:12px;" onclick="verEticket(${p.id})"><i class="fas fa-ticket-alt"></i> Ver</button></td>
                </tr>`;
            });
        }
        openModal('historial-modal');
    } catch(e) {
        console.error('Error abriendo historial', e);
        alert('Ocurrió un error al cargar el historial del cliente');
    }
}

async function fetchDashboardStats() {
    try {
        const res = await fetch(`${API_URL}/admin/dashboard`, { headers: authHeaders() });
        if (res.status === 401) return logout(); // Token inválido o expirado
        const stats = await res.json();
        
        const ingresos = stats.ventas.total_ingresos || 0;
        document.getElementById('total-ingresos').innerText = `$${parseFloat(ingresos).toLocaleString('es-AR')}`;
        document.getElementById('total-ventas').innerText = stats.ventas.cantidad_pedidos || 0;

        // Tabla Pedidos Recientes
        const rTB = document.getElementById('pedidos-recientes-tb');
        rTB.innerHTML = '';
        if (stats.pedidosRecientes.length === 0) rTB.innerHTML = '<tr><td colspan="4">No hay pedidos recientes</td></tr>';
        stats.pedidosRecientes.forEach(p => {
            rTB.innerHTML += `<tr>
                <td>#${p.id}</td>
                <td>$${p.total}</td>
                <td><span class="badge ${p.estado}">${p.estado}</span></td>
                <td>${p.metodo_pago}</td>
            </tr>`;
        });

        // Alerta Bajo stock
        const alertBox = document.getElementById('bajo-stock-alert');
        const okBox = document.getElementById('bajo-stock-ok');
        if (alertBox && okBox) {
            if (stats.bajoStock && stats.bajoStock.length > 0) {
                alertBox.style.display = 'block';
                okBox.style.display = 'none';
            } else {
                alertBox.style.display = 'none';
                okBox.style.display = 'block';
            }
        }
    } catch(err) {
        console.error("Error cargando dashboard:", err);
    }
}

let adminProductosCache = [];

async function fetchProductos() {
    try {
        const res = await fetch(`${API_URL}/productos/admin/all?all=true`, { headers: authHeaders() }); 
        adminProductosCache = await res.json();
        renderAdminProductos(adminProductosCache);
    } catch(e) { console.error(e); }
}

function renderAdminProductos(lista) {
    const pTB = document.getElementById('productos-tb');
    if (!pTB) return;
    pTB.innerHTML = '';
    
    if (lista.length === 0) {
        pTB.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;">No se encontraron productos</td></tr>';
        const pCont = document.getElementById('productos-pagination');
        if(pCont) pCont.innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(lista.length / ITEMS_PER_PAGE_ADMIN);
    if(currentAdminPageProductos > totalPages) currentAdminPageProductos = totalPages;
    if(currentAdminPageProductos < 1) currentAdminPageProductos = 1;

    const start = (currentAdminPageProductos - 1) * ITEMS_PER_PAGE_ADMIN;
    const paginatedItems = lista.slice(start, start + ITEMS_PER_PAGE_ADMIN);

    paginatedItems.forEach(p => {
        pTB.innerHTML += `<tr>
            <td>${p.id}</td>
            <td><img src="${p.imagen_1 || ''}" width="40" height="40" style="object-fit:cover; border-radius:4px; background:#f0f0f0;"></td>
            <td>${p.nombre}</td>
            <td>$${p.precio}</td>
            <td>${p.stock}</td>
            <td style="display:flex; gap:10px; align-items:center;">
                <button class="btn" style="background:#f1c40f; color:#fff; padding: 4px 8px;" onclick="editarProducto(${p.id})">Editar</button>
                <label class="switch" title="Activar/Desactivar Producto">
                    <input type="checkbox" ${p.activo ? 'checked' : ''} onchange="toggleProductoActivo(${p.id})">
                    <span class="slider"></span>
                </label>
            </td>
        </tr>`;
    });

    renderAdminPagination('productos-pagination', totalPages, currentAdminPageProductos, (page) => {
        currentAdminPageProductos = page;
        renderAdminProductos(lista);
    });
}


async function toggleProductoActivo(id) {
    try {
        const res = await fetch(`${API_URL}/productos/${id}/toggle`, {
            method: 'PATCH',
            headers: authHeaders()
        });
        if(!res.ok) throw new Error('Error al cambiar estado');
        fetchProductos(); 
    } catch(e) {
        console.error(e);
        alert('Error al cambiar el estado del producto');
        fetchProductos(); 
    }
}

async function editarProducto(id) {
    try {
        const res = await fetch(`${API_URL}/productos/admin/${id}`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Error al cargar producto');
        const p = await res.json();
        
        document.getElementById('modal-producto-title').innerText = 'Editar Producto';
        document.getElementById('prod-id').value = p.id;
        document.getElementById('prod-nombre').value = p.nombre;
        document.getElementById('prod-precio').value = p.precio;
        document.getElementById('prod-stock').value = p.stock;
        document.getElementById('prod-peso').value = p.peso || '';
        document.getElementById('prod-dimensiones').value = p.dimensiones || '';
        document.getElementById('prod-desc').value = p.descripcion || '';
        document.getElementById('prod-display-id').value = p.id;
        document.getElementById('prod-tipo').value = p.tipo_producto || 'fisico';
        document.getElementById('prod-video').value = p.video_url || '';
        
        // Asignar categoría dinámica
        const catSelect = document.getElementById('prod-cat');
        // si la categoría de p.categoria no existe en el select, podemos intentar agregarla temporalmente o dejarla seleccionada si el fetchCategorias ya la trajo
        if (Array.from(catSelect.options).some(opt => opt.value === p.categoria)) {
            catSelect.value = p.categoria;
        } else if (p.categoria) {
            catSelect.value = ''; // o dejar en blanco si no existe
        } else {
            catSelect.value = '';
        }
        
        toggleProductType();
        
        // Reset file and url inputs since we can't pre-fill them easily for files
        document.getElementById('prod-img1').value = '';
        document.getElementById('prod-img2').value = '';
        document.getElementById('prod-img3').value = '';
        document.getElementById('prod-img-url').value = '';
        document.getElementById('prod-img2-url').value = '';
        document.getElementById('prod-img3-url').value = '';

        openModal('producto-modal');
    } catch(e) {
        console.error(e);
        alert('Error al cargar datos del producto');
    }
}

// Sobrescribimos openModal para resetear el formulario si es uno nuevo
function openModal(id) { 
    if (id === 'producto-modal' && !document.getElementById('prod-id').value) {
        document.getElementById('modal-producto-title').innerText = 'Nuevo Producto';
        const formProducto = document.getElementById('form-producto');
        if (formProducto) formProducto.reset();
        document.getElementById('prod-id').value = '';
    }
    document.getElementById(id).classList.add('open'); 
}

function closeModal(id) { 
    document.getElementById(id).classList.remove('open'); 
    if (id === 'producto-modal') {
        document.getElementById('prod-id').value = ''; // clean up on close
    }
}

function toggleProductType() {
    const tipo = document.getElementById('prod-tipo').value;
    const contFisicos = document.getElementById('container-fisicos');
    const contDigitales = document.getElementById('container-digitales');
    const inputStock = document.getElementById('prod-stock');
    const contStock = document.getElementById('container-stock');
    const inputPeso = document.getElementById('prod-peso');
    const inputDimensiones = document.getElementById('prod-dimensiones');

    if (tipo === 'digital') {
        contFisicos.style.display = 'none';
        contDigitales.style.display = 'flex';
        contStock.style.display = 'none';
        inputStock.value = 9999;
        inputPeso.removeAttribute('required');
        inputDimensiones.removeAttribute('required');
    } else {
        contFisicos.style.display = 'flex';
        contDigitales.style.display = 'none';
        contStock.style.display = 'block';
        inputPeso.setAttribute('required', 'true');
        inputDimensiones.setAttribute('required', 'true');
    }
}

// Helper para comprimir imágenes en el cliente antes de subirlas
async function compressImage(file, maxWidth = 800, quality = 0.8) {
    if (!file || !file.type.startsWith('image/')) return file; // Si no es imagen, no tocar
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    // Recrear un objeto File a partir del Blob comprimido
                    const compressedFile = new File([blob], file.name, {
                        type: file.type,
                        lastModified: Date.now(),
                    });
                    resolve(compressedFile);
                }, file.type, quality);
            };
        };
    });
}

const formProducto = document.getElementById('form-producto');
if (formProducto) {
    formProducto.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Use FormData instead of JSON to allow Image Uploading (Multer compatibility)
        const formData = new FormData();
        formData.append('nombre', document.getElementById('prod-nombre').value);
        formData.append('precio', document.getElementById('prod-precio').value);
        formData.append('stock', document.getElementById('prod-stock').value);
        formData.append('peso', document.getElementById('prod-peso').value);
        formData.append('dimensiones', document.getElementById('prod-dimensiones').value);
        formData.append('descripcion', document.getElementById('prod-desc').value);
        formData.append('categoria', document.getElementById('prod-cat').value);
        
        formData.append('tipo_producto', document.getElementById('prod-tipo').value);
        formData.append('video_url', document.getElementById('prod-video').value);
        
        const archivoDigital = document.getElementById('prod-archivo').files[0];
        if (archivoDigital) formData.append('archivo_digital', archivoDigital);
        
        // Adjuntar enlace externo si existe
        const imgUrl = document.getElementById('prod-img-url').value;
        if (imgUrl) formData.append('imagen_url', imgUrl);
        const imgUrl2 = document.getElementById('prod-img2-url').value;
        if (imgUrl2) formData.append('imagen_2_url', imgUrl2);
        const imgUrl3 = document.getElementById('prod-img3-url').value;
        if (imgUrl3) formData.append('imagen_3_url', imgUrl3);
        
        // Attach image files if present (Comprimiendo si existen)
        const file1 = document.getElementById('prod-img1').files[0];
        const file2 = document.getElementById('prod-img2').files[0];
        const file3 = document.getElementById('prod-img3').files[0];
        
        if (file1) formData.append('imagen_1', await compressImage(file1));
        if (file2) formData.append('imagen_2', await compressImage(file2));
        if (file3) formData.append('imagen_3', await compressImage(file3));

        try {
            const token = localStorage.getItem('admin_token');
            const prodId = document.getElementById('prod-id').value;
            let url = `${API_URL}/productos`;
            let method = 'POST';

            if (prodId) {
                url = `${API_URL}/productos/${prodId}`;
                method = 'PUT';
            }

            const res = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }, // NO setear Content-Type en fetch con FormData, el browser lo calcula auto
                body: formData
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Error del servidor');
            }

            closeModal('producto-modal');
            formProducto.reset();
            document.getElementById('prod-id').value = '';
            fetchProductos();
            fetchDashboardStats(); // Recargar alerta de stock
        }catch(e){ alert('Error al guardar producto: ' + e.message); console.error(e); }
    });
}

function logout() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_name');
    window.location.href = '/admin/login.html';
}

// --- CATEGORÍAS DINÁMICAS ---
async function fetchCategorias() {
    try {
        const res = await fetch(`${API_URL}/categorias`);
        const categorias = await res.json();
        const select = document.getElementById('prod-cat');
        if (!select) return;
        
        // Guardar el valor seleccionado actual
        const valActual = select.value;
        
        select.innerHTML = '<option value="">Selecciona...</option>';
        categorias.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.nombre;
            opt.innerText = cat.nombre;
            select.appendChild(opt);
        });
        
        // Restaurar si existe
        if (Array.from(select.options).some(o => o.value === valActual)) {
            select.value = valActual;
        }
    } catch(e) { console.error('Error cargando categorias', e); }
}

async function crearNuevaCategoria() {
    const input = document.getElementById('nueva-categoria-input');
    const nombre = input.value.trim();
    if (!nombre) return alert('Escribe un nombre para la categoría');
    
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/categorias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ nombre })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        input.value = '';
        await fetchCategorias();
        document.getElementById('prod-cat').value = data.nombre;
    } catch(e) { alert('Error: ' + e.message); }
}

async function eliminarCategoriaSeleccionada() {
    const select = document.getElementById('prod-cat');
    const nombre = select.value;
    if (!nombre) return alert('Selecciona una categoría primero');
    
    if (!confirm(`¿Estás seguro de eliminar la categoría "${nombre}"?`)) return;
    
    try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/categorias/${nombre}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        
        await fetchCategorias();
    } catch(e) { alert('Error: ' + e.message); }
}

const formExcel = document.getElementById('form-excel');
if (formExcel) {
    formExcel.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fileInput = document.getElementById('excel-file');
        const file = fileInput.files[0];
        if (!file) return alert('Selecciona un archivo primero');

        const formData = new FormData();
        formData.append('file', file);

        const btn = document.getElementById('btn-submit-excel');
        const originalText = btn.innerText;
        btn.innerText = 'Cargando y procesando...';
        btn.disabled = true;

        try {
            const token = localStorage.getItem('admin_token');
            const res = await fetch(`${API_URL}/productos/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Multer / navegador configura el boundary solo
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Error al procesar el archivo Excel');

            alert(`Éxito: Se importaron ${data.importedCount} productos correctamente.`);
            closeModal('excel-modal');
            formExcel.reset();
            fetchProductos(); // Recargar la tabla
        } catch (e) {
            alert('Error: ' + e.message);
            console.error(e);
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}

// Lógica del buscador de productos en tiempo real
const searchAdminInput = document.getElementById('admin-search-producto');
if (searchAdminInput) {
    searchAdminInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        const filtrados = adminProductosCache.filter(p => p.nombre.toLowerCase().includes(term));
        currentAdminPageProductos = 1;
        renderAdminProductos(filtrados);
    });
}

// Lógica de filtro para pedidos
const filterPedidosSelect = document.getElementById('admin-filter-pedidos-estado');
if (filterPedidosSelect) {
    filterPedidosSelect.addEventListener('change', (e) => {
        const estado = e.target.value;
        currentAdminPagePedidos = 1;
        if (!estado) {
            renderAdminPedidos(adminPedidosCache);
        } else {
            const filtrados = adminPedidosCache.filter(p => p.estado === estado);
            renderAdminPedidos(filtrados);
        }
    });
}

// Lógica de búsqueda de clientes
const searchClienteInput = document.getElementById('admin-search-cliente');
if (searchClienteInput) {
    searchClienteInput.addEventListener('input', (e) => {
        const term = e.target.value.trim().toLowerCase();
        const filtrados = adminClientesCache.filter(c => 
            (c.nombre || '').toLowerCase().includes(term) ||
            (c.apellido || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term)
        );
        currentAdminPageClientes = 1;
        renderAdminClientes(filtrados);
    });
}

// Lógica para descargar Excel de clientes
async function descargarExcelClientes() {
    try {
        const btn = event.currentTarget;
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando...';
        btn.disabled = true;

        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/clientes/excel`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error('No se pudo generar el reporte Excel');
        
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = "clientes.xlsx";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        a.remove();
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch(err) {
        alert('Error descargando el Excel de clientes: ' + err.message);
        console.error(err);
        if (event && event.currentTarget) {
            event.currentTarget.disabled = false;
            event.currentTarget.innerHTML = '<i class="fas fa-file-excel"></i> Descargar Excel';
        }
    }
}

// --- CONFIGURACIÓN GLOBAL ---
async function fetchConfiguracion() {
    try {
        const res = await fetch(`${API_URL}/configuracion`);
        const conf = await res.json();
        
        if(conf.id) {
            document.getElementById('conf-admin-nombre').value = conf.admin_nombre || '';
            document.getElementById('conf-email-admin').value = conf.email_admin || '';
            document.getElementById('conf-email').value = conf.email || '';
            document.getElementById('conf-telefono').value = conf.telefono || '';
            document.getElementById('conf-direccion').value = conf.direccion || '';
            
            document.getElementById('conf-ig-activo').checked = conf.instagram_activo;
            document.getElementById('conf-ig-url').value = conf.instagram_url || '';
            document.getElementById('conf-fb-activo').checked = conf.facebook_activo;
            document.getElementById('conf-fb-url').value = conf.facebook_url || '';
            document.getElementById('conf-tk-activo').checked = conf.tiktok_activo;
            document.getElementById('conf-tk-url').value = conf.tiktok_url || '';
            document.getElementById('conf-tw-activo').checked = conf.twitter_activo;
            document.getElementById('conf-tw-url').value = conf.twitter_url || '';
            
            document.getElementById('conf-banner-activo').checked = conf.banner_activo;
            document.getElementById('conf-banner-texto').value = conf.banner_texto || '';
            
            document.getElementById('conf-banco-nombre').value = conf.banco_nombre || '';
            document.getElementById('conf-banco-titular').value = conf.banco_titular || '';
            document.getElementById('conf-banco-cuit').value = conf.banco_cuit || '';
            document.getElementById('conf-banco-cbu').value = conf.banco_cbu || '';
            document.getElementById('conf-banco-alias').value = conf.banco_alias || '';
            
            document.getElementById('conf-envio-activo').checked = conf.envio_gratis_activo;
            document.getElementById('conf-envio-limite').value = conf.envio_gratis_limite || 0;
            
            document.getElementById('conf-desc-activo').checked = conf.descuento_activo;
            document.getElementById('conf-desc-porcentaje').value = conf.descuento_porcentaje || 0;
            
            const syncActivoEl = document.getElementById('conf-sync-activo');
            if (syncActivoEl) syncActivoEl.checked = conf.sync_activo || false;
            const syncKeyEl = document.getElementById('conf-sync-key');
            if (syncKeyEl) syncKeyEl.value = conf.sync_api_key || '';
            
            // Actualizar Saludo
            document.getElementById('admin-name').innerText = conf.admin_nombre || 'Admin';
            localStorage.setItem('admin_name', conf.admin_nombre || 'Admin');
        }
    } catch(e) {
        console.error('Error cargando configuracion:', e);
    }
}

async function guardarConfiguracion() {
    // Recolectar datos
    const payload = {
        admin_nombre: document.getElementById('conf-admin-nombre').value.trim(),
        email_admin: document.getElementById('conf-email-admin').value.trim(),
        email: document.getElementById('conf-email').value.trim(),
        telefono: document.getElementById('conf-telefono').value.trim(),
        direccion: document.getElementById('conf-direccion').value.trim(),
        
        instagram_activo: document.getElementById('conf-ig-activo').checked,
        instagram_url: document.getElementById('conf-ig-url').value.trim(),
        facebook_activo: document.getElementById('conf-fb-activo').checked,
        facebook_url: document.getElementById('conf-fb-url').value.trim(),
        tiktok_activo: document.getElementById('conf-tk-activo').checked,
        tiktok_url: document.getElementById('conf-tk-url').value.trim(),
        twitter_activo: document.getElementById('conf-tw-activo').checked,
        twitter_url: document.getElementById('conf-tw-url').value.trim(),
        
        banner_activo: document.getElementById('conf-banner-activo').checked,
        banner_texto: document.getElementById('conf-banner-texto').value.trim(),
        
        banco_nombre: document.getElementById('conf-banco-nombre').value.trim(),
        banco_titular: document.getElementById('conf-banco-titular').value.trim(),
        banco_cuit: document.getElementById('conf-banco-cuit').value.trim(),
        banco_cbu: document.getElementById('conf-banco-cbu').value.trim(),
        banco_alias: document.getElementById('conf-banco-alias').value.trim(),
        
        envio_gratis_activo: document.getElementById('conf-envio-activo').checked,
        envio_gratis_limite: Number(document.getElementById('conf-envio-limite').value) || 0,
        
        descuento_activo: document.getElementById('conf-desc-activo').checked,
        descuento_porcentaje: Number(document.getElementById('conf-desc-porcentaje').value) || 0,
        
        sync_activo: document.getElementById('conf-sync-activo') ? document.getElementById('conf-sync-activo').checked : undefined,
        sync_api_key: document.getElementById('conf-sync-key') ? document.getElementById('conf-sync-key').value.trim() : undefined
    };

    try {
        const btn = document.querySelector('button[onclick="guardarConfiguracion()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
        btn.disabled = true;

        const token = localStorage.getItem('admin_token');
        const res = await fetch(`${API_URL}/admin/configuracion`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Configuración guardada exitosamente');
            fetchConfiguracion(); // Recargar validación visual
        } else {
            const data = await res.json();
            alert(data.error || 'Error al guardar la configuración');
        }

        btn.innerHTML = originalText;
        btn.disabled = false;
    } catch(e) {
        console.error('Error guardando configuracion:', e);
        alert('Error de red al intentar guardar');
    }
}

function generarTokenSync() {
    const randomStr = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    document.getElementById('conf-sync-key').value = 'OMNI-' + randomStr.toUpperCase();
}

// --- CAMBIAR CONTRASEÑA EN PANEL ---
document.addEventListener('DOMContentLoaded', () => {
    const formPwd = document.getElementById('form-cambiar-password');
    if (formPwd) {
        formPwd.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-cambiar-pwd');
            const msg = document.getElementById('pwd-msg');
            const actual = document.getElementById('pwd-actual').value;
            const nueva = document.getElementById('pwd-nueva').value;
            const repetir = document.getElementById('pwd-repetir').value;

            msg.style.color = '#e74c3c';
            if (nueva !== repetir) {
                msg.innerText = 'Las nuevas credenciales no coinciden.';
                return;
            }

            const payload = { currentPassword: actual, newPassword: nueva };
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Solicitando PIN...';
            btn.disabled = true;

            try {
                // Paso 1: Solicitar autorización MFA
                const resOtp = await fetch(`${API_URL}/admin/request-change-otp`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ currentPassword: actual })
                });
                const dataOtp = await resOtp.json();
                
                if(!resOtp.ok) {
                    msg.innerText = dataOtp.error || 'Credenciales fallidas.';
                    btn.innerHTML = 'Cambiar Clave';
                    btn.disabled = false;
                    return;
                }

                // Paso 2: Interceptar UI (Prompt Sencillo)
                const pin = prompt(`🛡️ ${dataOtp.message}\nRevisa tu bandeja de entrada y escribe aquí el PIN de seguridad de 6 dígitos:`);
                
                if(!pin) {
                    msg.innerText = 'Trámite cancelado por el usuario.';
                    btn.innerHTML = 'Cambiar Clave';
                    btn.disabled = false;
                    return;
                }

                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando PIN...';

                // Paso 3: Confirmar y Guardar
                const resConf = await fetch(`${API_URL}/admin/confirm-change-otp`, {
                    method: 'POST',
                    headers: authHeaders(),
                    body: JSON.stringify({ otp: pin, newPassword: nueva })
                });
                const dataConf = await resConf.json();

                if(resConf.ok) {
                    msg.style.color = '#27ae60';
                    msg.innerText = dataConf.message;
                    formPwd.reset();
                } else {
                    msg.style.color = '#e74c3c';
                    msg.innerText = dataConf.error || 'Falla de seguridad.';
                }
            } catch(e) {
                msg.innerText = 'Servidor inaccesible.';
            } finally {
                btn.innerHTML = 'Cambiar Clave';
                btn.disabled = false;
                setTimeout(() => msg.innerText = '', 8000);
            }
        });
    }
});

// ==========================================
// GESTION DE ADMINISTRADORES
// ==========================================

async function loadUsuarios() {
    try {
        const res = await fetch(`${API_URL}/admin/usuarios`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Error al obtener administradores');
        const admins = await res.json();
        
        const tb = document.getElementById('usuarios-tb');
        tb.innerHTML = '';
        admins.forEach(u => {
            tb.innerHTML += `<tr>
                <td>${u.id}</td>
                <td>${u.email}</td>
                <td>${u.nombre || 'N/A'}</td>
                <td>${new Date(u.creado_en).toLocaleDateString()}</td>
                <td>
                    <button class="btn" style="background:#e74c3c; color:white; padding: 2px 6px; font-size:12px;" onclick="deleteUsuario(${u.id})"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch (e) {
        console.error('Error loadUsuarios:', e);
        alert('Hubo un error cargando los usuarios administradores.');
    }
}

async function saveUsuario(e) {
    e.preventDefault();
    const nombre = document.getElementById('u-nombre').value;
    const email = document.getElementById('u-email').value;
    const password = document.getElementById('u-password').value;

    try {
        const res = await fetch(`${API_URL}/admin/usuarios`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ nombre, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            closeModal('usuario-modal');
            document.getElementById('usuario-form').reset();
            loadUsuarios();
            alert('Administrador creado exitosamente.');
        } else {
            alert(data.error || 'Error al crear administrador.');
        }
    } catch (err) {
        console.error(err);
        alert('Ocurrió un error al guardar el administrador.');
    }
}

async function deleteUsuario(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar a este administrador? Perderá acceso inmediato.')) return;
    
    try {
        const res = await fetch(`${API_URL}/admin/usuarios/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const data = await res.json();
        if (res.ok) {
            loadUsuarios();
        } else {
            alert(data.error || 'Error al eliminar.');
        }
    } catch(err) {
        alert('Ocurrió un error de conexión.');
    }
}

