document.addEventListener('DOMContentLoaded', () => {
    let carrito = JSON.parse(localStorage.getItem('cart')) || [];
    if (carrito.length === 0) {
        window.location.href = '/';
        return;
    }
    renderSummary();
    calcularEnvio(); // Calcular un envío inicial por defecto
    inicializarGeoRef(); // Iniciar selectores de GeoRef

    document.getElementById('checkout-form').addEventListener('submit', procesarCheckout);

    const isUSD = localStorage.getItem('currency') === 'USD';

    const metodoPagoSelect = document.getElementById('metodo_pago');
    const datosBancariosDiv = document.getElementById('datos-bancarios');

    if (metodoPagoSelect) {
        if (isUSD) {
            metodoPagoSelect.innerHTML = `<option value="transferencia_usd">Transferencia Bancaria (USD)</option>`;
        } else {
            metodoPagoSelect.innerHTML = `
                <option value="mercadopago">Mercado Pago</option>
                <option value="transferencia">Transferencia Bancaria</option>
            `;
        }
    }

    if (metodoPagoSelect && datosBancariosDiv) {
        metodoPagoSelect.addEventListener('change', async (e) => {
            if (e.target.value === 'transferencia' || e.target.value === 'transferencia_usd') {
                datosBancariosDiv.style.display = 'block';
                try {
                    const res = await fetch('/api/configuracion');
                    const conf = await res.json();
                    if (e.target.value === 'transferencia_usd') {
                        document.getElementById('b_banco').innerText = conf.banco_usd_nombre || '-';
                        document.getElementById('b_titular').innerText = conf.banco_usd_titular || '-';
                        document.getElementById('b_cuit').innerText = conf.banco_usd_cuit || '-';
                        document.getElementById('b_cbu').innerText = conf.banco_usd_cbu || '-';
                        document.getElementById('b_alias').innerText = conf.banco_usd_alias || '-';
                    } else {
                        document.getElementById('b_banco').innerText = conf.banco_nombre || '-';
                        document.getElementById('b_titular').innerText = conf.banco_titular || '-';
                        document.getElementById('b_cuit').innerText = conf.banco_cuit || '-';
                        document.getElementById('b_cbu').innerText = conf.banco_cbu || '-';
                        document.getElementById('b_alias').innerText = conf.banco_alias || '-';
                    }
                } catch (err) {
                    console.error('Error cargando los datos bancarios:', err);
                }
            } else {
                datosBancariosDiv.style.display = 'none';
            }
        });

        // Trigger the check once on initialization
        metodoPagoSelect.dispatchEvent(new Event('change'));
    }
});

let subtotalCheckout = 0;
let costoEnvioFinal = 0;

function renderSummary() {
    let carrito = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('checkout-items');
    subtotalCheckout = 0;
    let hayDigital = false;
    let hayFisico = false;
    const isUSD = localStorage.getItem('currency') === 'USD';
    const sign = isUSD ? 'USD $' : '$';
    
    carrito.forEach(item => {
        if (item.tipo_producto === 'digital') hayDigital = true;
        else hayFisico = true;
        
        let price = isUSD && parseFloat(item.precio_usd) > 0 ? parseFloat(item.precio_usd) : parseFloat(item.precio);
        subtotalCheckout += price * item.cantidad;
        container.innerHTML += `
            <div class="summary-item">
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>${sign}${(price * item.cantidad).toFixed(2)}</span>
            </div>
        `;
    });
    
    document.getElementById('resumen-subtotal').innerText = `${sign}${subtotalCheckout.toFixed(2)}`;
    
    const seccionEnvio = document.getElementById('seccion-envio');
    if (seccionEnvio) {
        if (!hayFisico && hayDigital) {
            seccionEnvio.style.display = 'none';
            document.getElementById('direccion').removeAttribute('required');
            document.getElementById('provincia').removeAttribute('required');
            document.getElementById('partido').removeAttribute('required');
            document.getElementById('ciudad').removeAttribute('required');
            document.getElementById('codigo_postal').removeAttribute('required');
        } else {
            seccionEnvio.style.display = 'block';
            document.getElementById('direccion').setAttribute('required', 'true');
            document.getElementById('provincia').setAttribute('required', 'true');
            document.getElementById('partido').setAttribute('required', 'true');
            document.getElementById('ciudad').setAttribute('required', 'true');
            document.getElementById('codigo_postal').setAttribute('required', 'true');
        }
        
        let avisoEnvio = document.getElementById('aviso-envio-dinamico');
        if (!avisoEnvio) {
            avisoEnvio = document.createElement('div');
            avisoEnvio.id = 'aviso-envio-dinamico';
            avisoEnvio.style.marginTop = '15px';
            avisoEnvio.style.fontSize = '14px';
            avisoEnvio.style.color = '#e67e22';
            avisoEnvio.style.fontWeight = 'bold';
            seccionEnvio.parentNode.insertBefore(avisoEnvio, seccionEnvio.nextSibling); // Puesto afuera de seccionEnvio para que se vea siempre
        }
        
        let mensajes = [];
        if (hayDigital) {
            mensajes.push('📧 <b>Producto Digital:</b> Una vez confirmado el pago, recibirás automáticamente un correo con el acceso a tu material.');
        }
        if (hayFisico) {
            mensajes.push('⚠️ <b>Producto Físico:</b> El envío se coordina directamente con el vendedor posterior a la compra.');
        }
        
        avisoEnvio.innerHTML = mensajes.join('<br><br>');
    }
}

async function calcularEnvio() {
    const cp = document.getElementById('codigo_postal').value;
    const opcionesContainer = document.getElementById('opciones-envio-container');
    const opcionesLista = document.getElementById('opciones-envio-lista');
    
    if (!cp || cp.length < 4) return;
    
    const isUSD = localStorage.getItem('currency') === 'USD';
    const sign = isUSD ? 'USD $' : '$';

    try {
        const carrito = JSON.parse(localStorage.getItem('cart')) || [];
        
        opcionesContainer.style.display = 'block';
        opcionesLista.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Calculando envíos...</p>';
        
        const res = await fetch('/api/envios/cotizar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ codigo_postal: cp, carrito })
        });
        
        const data = await res.json();
        
        if (data.isDigital) {
            opcionesLista.innerHTML = '<p style="color:#27ae60;"><i class="fas fa-check-circle"></i> Envío Digital Gratuito</p>';
            seleccionarOpcionEnvio(0, 'Envío Digital', 'Digital');
            return;
        }

        if (data.success) {
            let html = '';
            data.opciones.forEach((opcion, index) => {
                const checked = index === 0 ? 'checked' : '';
                html += `
                    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; cursor: pointer;" onclick="document.getElementById('envio_${index}').click()">
                        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
                            <input type="radio" name="opcion_envio" id="envio_${index}" value="${opcion.costo}" data-nombre="${opcion.nombre}" data-id="${opcion.id}" ${checked} onchange="seleccionarOpcionEnvio(${opcion.costo}, '${opcion.nombre}', '${opcion.id}')" style="margin-right: 10px;">
                            <div style="flex:1;">
                                <strong style="display:block;">${opcion.nombre}</strong>
                                <span style="font-size:12px; color:#7f8c8d;">${opcion.tiempo_entrega}</span>
                            </div>
                            <strong style="color:#2c3e50;">${sign}${opcion.costo.toFixed(2)}</strong>
                        </label>
                    </div>
                `;
            });
            opcionesLista.innerHTML = html;
            
            // Auto select the first one
            if (data.opciones.length > 0) {
                seleccionarOpcionEnvio(data.opciones[0].costo, data.opciones[0].nombre, data.opciones[0].id);
            }
        } else {
            if (!data.success) {
            // Mostrar fallback (A convenir)
            console.error("Error devuelto por el servidor:", data.error || data.message || 'Error desconocido');
            opcionesLista.innerHTML = `
                <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; background:#fff3cd; color:#856404;">
                    <p style="margin:0 0 10px 0;"><i class="fas fa-info-circle"></i> A convenir con el vendedor</p>
                    <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
                        <input type="radio" name="opcion_envio" id="envio_convenir" value="0" checked onchange="seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir')">
                        <span style="margin-left: 8px;">Pagaré el envío luego de la compra</span>
                    </label>
                    <p style="font-size: 11px; color: red; margin-top: 10px;"><strong>Error (Solo para debug):</strong> ${data.error || data.message || 'No se devolvió un error específico'}</p>
                </div>
            `;
            seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir');
            return;
        }
    } catch (e) {
        console.error('Error:', e);
        opcionesLista.innerHTML = '<p style="color:#e74c3c;">Ocurrió un error al cotizar. Por favor, reintente en unos minutos o continúe y acordaremos el envío.</p>';
        seleccionarOpcionEnvio(0, 'A convenir con vendedor', 'A_CONVENIR');
    }
}

// Global para la orden
let envioSeleccionado = { costo: 0, nombre: '', id: '' };

function seleccionarOpcionEnvio(costo, nombre, id) {
    costoEnvioFinal = parseFloat(costo) || 0;
    envioSeleccionado = { costo, nombre, id };
    
    const isUSD = localStorage.getItem('currency') === 'USD';
    const sign = isUSD ? 'USD $' : '$';

    const total = subtotalCheckout + costoEnvioFinal;
    const resumenTotalEl = document.getElementById('resumen-total');
    if (resumenTotalEl) {
        resumenTotalEl.innerText = `${sign}${total.toFixed(2)}`;
    }
}

async function procesarCheckout(e) {
    e.preventDefault();
    const carrito = JSON.parse(localStorage.getItem('cart')) || [];
    
    const hayFisico = carrito.some(item => item.tipo_producto !== 'digital');
    const hayDigital = carrito.some(item => item.tipo_producto === 'digital');
    
    const cliente = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        genero: document.getElementById('genero').value,
        direccion: (!hayFisico && hayDigital) ? 'Envío Digital' : document.getElementById('direccion').value,
        // Combinamos Partido y Ciudad de forma transparente para el Backend
        ciudad: (!hayFisico && hayDigital) ? 'Digital' : (document.getElementById('partido').value + ' - ' + document.getElementById('ciudad').value),
        provincia: (!hayFisico && hayDigital) ? 'Digital' : document.getElementById('provincia').value,
        codigo_postal: (!hayFisico && hayDigital) ? '0000' : document.getElementById('codigo_postal').value
    };

    const metodo_pago = document.getElementById('metodo_pago').value;
    
    // Enviar la opción seleccionada al backend
    const metodo_envio = (envioSeleccionado.id && envioSeleccionado.id !== 'A_CONVENIR' && envioSeleccionado.id !== 'Digital') 
                          ? `correo_${envioSeleccionado.id}` 
                          : (envioSeleccionado.id === 'Digital' ? 'digital' : 'a_convenir');
    
    const payload = {
        cliente,
        carrito,
        metodo_pago,
        metodo_envio,
        costo_envio: costoEnvioFinal // Mandamos el costo calculado para que lo sumen en el ticket
    };

    try {
        const btn = document.querySelector('button[type="submit"]');
        btn.innerText = "Procesando...";
        btn.disabled = true;

        const response = await fetch('/api/pedidos/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            // Vaciar carrito
            localStorage.removeItem('cart');
            
            if (metodo_pago === 'mercadopago' && data.mpUrl) {
                // Redirigir a MercadoPago
                window.location.href = data.mpUrl;
            } else {
                alert(`¡Pedido #${data.pedido.id} confirmado con éxito! Nos comunicaremos vía email.`);
                window.location.href = '/';
            }
        } else {
            alert('Error al procesar el pedido: ' + data.error);
            btn.innerText = "Confirmar Pedido";
            btn.disabled = false;
        }

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error inesperado de red.');
        document.querySelector('button[type="submit"]').disabled = false;
    }
}

// --- Integración API GeoRef / Argentina ---
async function inicializarGeoRef() {
    const provSelect = document.getElementById('provincia');
    const partidoSelect = document.getElementById('partido');
    const ciudadSelect = document.getElementById('ciudad');
    if(!provSelect || !partidoSelect || !ciudadSelect) return;

    try {
        const provRes = await fetch('https://apis.datos.gob.ar/georef/api/provincias?campos=id,nombre&max=100');
        const provData = await provRes.json();
        
        provData.provincias.sort((a,b) => a.nombre.localeCompare(b.nombre));
        provSelect.innerHTML = '<option value="">Seleccione Provincia...</option>';
        provData.provincias.forEach(p => provSelect.innerHTML += `<option value="${p.nombre}" data-id="${p.id}">${p.nombre}</option>`);

        provSelect.addEventListener('change', async () => {
            const provId = provSelect.options[provSelect.selectedIndex].getAttribute('data-id');
            partidoSelect.innerHTML = '<option value="">Cargando...</option>';
            partidoSelect.disabled = true;
            ciudadSelect.innerHTML = '<option value="">Elija Partido...</option>';
            ciudadSelect.disabled = true;
            
            if (!provId) {
                partidoSelect.innerHTML = '<option value="">Elija Provincia...</option>';
                return;
            }

            try {
                // Departamentos abarca a "Partidos" en Buenos Aires y "Departamentos" en el resto de Argentina
                const deptoRes = await fetch(`https://apis.datos.gob.ar/georef/api/departamentos?provincia=${provId}&campos=id,nombre&max=500`);
                const deptoData = await deptoRes.json();
                deptoData.departamentos.sort((a,b) => a.nombre.localeCompare(b.nombre));
                
                partidoSelect.innerHTML = '<option value="">Seleccione Partido/Depto...</option>';
                deptoData.departamentos.forEach(d => partidoSelect.innerHTML += `<option value="${d.nombre}" data-id="${d.id}">${d.nombre}</option>`);
                partidoSelect.disabled = false;
            } catch (err) {
                console.error("Error cargando partidos", err);
                partidoSelect.innerHTML = '<option value="">Error de conexión</option>';
            }
        });

        partidoSelect.addEventListener('change', async () => {
             const deptoId = partidoSelect.options[partidoSelect.selectedIndex].getAttribute('data-id');
             ciudadSelect.innerHTML = '<option value="">Cargando...</option>';
             ciudadSelect.disabled = true;
             
             if (!deptoId) {
                 ciudadSelect.innerHTML = '<option value="">Elija Partido...</option>';
                 return;
             }
             
             try {
                 const locRes = await fetch(`https://apis.datos.gob.ar/georef/api/localidades?departamento=${deptoId}&campos=id,nombre&max=1000`);
                 const locData = await locRes.json();
                 
                 locData.localidades.sort((a,b) => a.nombre.localeCompare(b.nombre));
                 
                 ciudadSelect.innerHTML = '<option value="">Seleccione Localidad...</option>';
                 // Usamos un Set para evitar las localidades con mismo nombre pero distinto ID (barrios/parajes integrados)
                 const localidadesUnicas = [...new Set(locData.localidades.map(l => l.nombre))];
                 localidadesUnicas.forEach(l => ciudadSelect.innerHTML += `<option value="${l}">${l}</option>`);
                 ciudadSelect.disabled = false;
             } catch (err) {
                 console.error("Error cargando localidades", err);
                 ciudadSelect.innerHTML = '<option value="">Error de conexión</option>';
             }
        });

    } catch(err) {
        console.error("Error cargando provincias", err);
        provSelect.innerHTML = '<option value="">Error de conexión</option>';
    }
}
