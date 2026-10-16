let appConfig = {};

document.addEventListener('DOMContentLoaded', async () => {
    let carrito = JSON.parse(localStorage.getItem('cart')) || [];
    if (carrito.length === 0) {
        window.location.href = '/';
        return;
    }

    try {
        const res = await fetch('/api/configuracion');
        appConfig = await res.json();
    } catch (e) {
        appConfig = {};
    }

    renderSummary();
    inicializarGeoRef();

    const hayFisico = carrito.some(item => !item.tipo_producto || item.tipo_producto === 'fisico');
    if (hayFisico && appConfig.correo_activo) {
        calcularEnvio();
    }

    document.getElementById('checkout-form').addEventListener('submit', procesarCheckout);

    const isUSD = localStorage.getItem('currency') === 'USD';
    const metodoPagoSelect = document.getElementById('metodo_pago');
    const datosBancariosDiv = document.getElementById('datos-bancarios');

    if (metodoPagoSelect) {
        if (isUSD) {
            metodoPagoSelect.innerHTML = '<option value="transferencia_usd">Transferencia Bancaria (USD)</option>';
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
                if (e.target.value === 'transferencia_usd') {
                    document.getElementById('b_banco').innerText = appConfig.banco_usd_nombre || '-';
                    document.getElementById('b_titular').innerText = appConfig.banco_usd_titular || '-';
                    document.getElementById('b_cuit').innerText = appConfig.banco_usd_cuit || '-';
                    document.getElementById('b_cbu').innerText = appConfig.banco_usd_cbu || '-';
                    document.getElementById('b_alias').innerText = appConfig.banco_usd_alias || '-';
                } else {
                    document.getElementById('b_banco').innerText = appConfig.banco_nombre || '-';
                    document.getElementById('b_titular').innerText = appConfig.banco_titular || '-';
                    document.getElementById('b_cuit').innerText = appConfig.banco_cuit || '-';
                    document.getElementById('b_cbu').innerText = appConfig.banco_cbu || '-';
                    document.getElementById('b_alias').innerText = appConfig.banco_alias || '-';
                }
            } else {
                datosBancariosDiv.style.display = 'none';
            }
        });

        metodoPagoSelect.dispatchEvent(new Event('change'));
    }
});

let subtotalCheckout = 0;
let costoEnvioFinal = 0;
let envioSeleccionado = { costo: 0, nombre: '', id: '' };

function renderSummary() {
    let carrito = JSON.parse(localStorage.getItem('cart')) || [];
    const container = document.getElementById('checkout-items');
    container.innerHTML = '';
    subtotalCheckout = 0;

    let hayDigital = false;
    let hayFisico = false;
    let hayTaller = false;
    let hayViaje = false;

    const isUSD = localStorage.getItem('currency') === 'USD';
    const sign = isUSD ? 'USD $' : '$';
    
    carrito.forEach(item => {
        if (item.tipo_producto === 'digital') {
            hayDigital = true;
        } else if (item.tipo_producto === 'taller') {
            hayTaller = true;
        } else if (item.tipo_producto === 'viaje') {
            hayViaje = true;
        } else {
            hayFisico = true;
        }
        
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
    
    const formTitle = document.getElementById('checkout-form-title');
    const seccionEnvio = document.getElementById('seccion-envio');
    const tituloDireccion = document.getElementById('titulo-direccion');
    const grupoDireccion = document.getElementById('grupo-direccion');
    const dirInput = document.getElementById('direccion');
    const grupoCP = document.getElementById('grupo-codigo-postal');
    const cpInput = document.getElementById('codigo_postal');
    const btnCalcularEnvio = document.getElementById('contenedor-btn-calcular-envio');
    const opcionesContainer = document.getElementById('opciones-envio-container');

    if (seccionEnvio) {
        if (hayFisico) {
            seccionEnvio.style.display = 'block';
            if (formTitle) formTitle.innerText = 'Datos de Envío y Facturación';
            if (tituloDireccion) tituloDireccion.innerText = 'Dirección de Envío';
            if (grupoDireccion) grupoDireccion.style.display = 'block';
            if (dirInput) dirInput.setAttribute('required', 'true');
            if (grupoCP) grupoCP.style.display = 'flex';
            if (cpInput) cpInput.setAttribute('required', 'true');

            document.getElementById('provincia').setAttribute('required', 'true');
            document.getElementById('partido').setAttribute('required', 'true');
            document.getElementById('ciudad').setAttribute('required', 'true');

            if (appConfig.correo_activo) {
                if (btnCalcularEnvio) btnCalcularEnvio.style.display = 'block';
            } else {
                if (btnCalcularEnvio) btnCalcularEnvio.style.display = 'none';
                if (opcionesContainer) opcionesContainer.style.display = 'none';
                seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'a_convenir');
            }
        } else if (hayTaller || hayViaje) {
            seccionEnvio.style.display = 'block';
            if (formTitle) formTitle.innerText = hayViaje ? 'Datos de Reserva y Facturación' : 'Datos de Inscripción y Facturación';
            if (tituloDireccion) tituloDireccion.innerText = 'Ubicación del Participante';
            if (grupoDireccion) grupoDireccion.style.display = 'none';
            if (dirInput) dirInput.removeAttribute('required');
            if (grupoCP) grupoCP.style.display = 'none';
            if (cpInput) cpInput.removeAttribute('required');
            if (btnCalcularEnvio) btnCalcularEnvio.style.display = 'none';
            if (opcionesContainer) opcionesContainer.style.display = 'none';

            document.getElementById('provincia').setAttribute('required', 'true');
            document.getElementById('partido').setAttribute('required', 'true');
            document.getElementById('ciudad').setAttribute('required', 'true');

            seleccionarOpcionEnvio(0, hayViaje ? 'Reserva de Viaje' : 'Inscripción Digital / Acceso', 'Digital');
        } else {
            // 100% digital
            seccionEnvio.style.display = 'none';
            if (formTitle) formTitle.innerText = 'Datos del Comprador y Facturación';
            if (dirInput) dirInput.removeAttribute('required');
            if (cpInput) cpInput.removeAttribute('required');
            document.getElementById('provincia').removeAttribute('required');
            document.getElementById('partido').removeAttribute('required');
            document.getElementById('ciudad').removeAttribute('required');
            seleccionarOpcionEnvio(0, 'Envío Digital', 'Digital');
        }

        let avisoEnvio = document.getElementById('aviso-envio-dinamico');
        if (!avisoEnvio) {
            avisoEnvio = document.createElement('div');
            avisoEnvio.id = 'aviso-envio-dinamico';
            avisoEnvio.style.marginTop = '18px';
            avisoEnvio.style.padding = '14px 16px';
            avisoEnvio.style.borderRadius = '8px';
            avisoEnvio.style.backgroundColor = '#FAF8F5';
            avisoEnvio.style.borderLeft = '4px solid #C78515';
            avisoEnvio.style.fontSize = '14px';
            avisoEnvio.style.color = '#0E2A47';
            avisoEnvio.style.lineHeight = '1.5';
            seccionEnvio.parentNode.insertBefore(avisoEnvio, seccionEnvio.nextSibling);
        }
        
        let mensajes = [];
        if (hayViaje) {
            mensajes.push('📧 <b>Información por Email:</b> Una vez confirmada tu reserva, recibirás en tu correo electrónico la información completa, cronograma, instrucciones y detalles del viaje.');
        }
        if (hayTaller) {
            mensajes.push('📧 <b>Información por Email:</b> Una vez confirmada tu inscripción, recibirás en tu correo electrónico la información completa, cronograma, instrucciones y enlaces de encuentro.');
        }
        if (hayDigital && !hayViaje && !hayTaller) {
            mensajes.push('📧 <b>Producto Digital:</b> Al confirmarse el pago, recibirás de forma automática en tu correo electrónico el enlace de acceso y los archivos descargables.');
        }
        if (hayFisico) {
            if (appConfig.correo_activo) {
                mensajes.push('🚚 <b>Envíos por Correo Argentino:</b> Ingresá tu código postal y hacé clic en "Calcular Envío" para seleccionar el costo de entrega.');
            } else {
                mensajes.push('📦 <b>Envío a convenir:</b> El costo de envío se coordina directamente con el vendedor luego de la compra y se abona al momento de la entrega.');
            }
        }
        
        avisoEnvio.innerHTML = mensajes.join('<br><br>');

        const btnSubmit = document.querySelector('button[type="submit"]');
        if (btnSubmit) {
            if (hayViaje) {
                btnSubmit.innerText = 'Confirmar Reserva';
            } else if (hayTaller) {
                btnSubmit.innerText = 'Confirmar Inscripción';
            } else {
                btnSubmit.innerText = 'Confirmar Pedido';
            }
        }
    }
}

async function calcularEnvio() {
    const cpEl = document.getElementById('codigo_postal');
    const cp = cpEl ? cpEl.value.trim() : '';
    const opcionesContainer = document.getElementById('opciones-envio-container');
    const opcionesLista = document.getElementById('opciones-envio-lista');
    
    if (!appConfig.correo_activo || !cp || cp.length < 4) return;
    
    const isUSD = localStorage.getItem('currency') === 'USD';
    const sign = isUSD ? 'USD $' : '$';

    try {
        const carrito = JSON.parse(localStorage.getItem('cart')) || [];
        if (opcionesContainer) opcionesContainer.style.display = 'block';
        if (opcionesLista) opcionesLista.innerHTML = '<p><i class="fas fa-spinner fa-spin" style="color:#C78515;"></i> Calculando envíos con Correo Argentino...</p>';
        
        const res = await fetch('/api/envios/cotizar', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ codigo_postal: cp, carrito })
        });
        
        const data = await res.json();
        
        if (data.isDigital) {
            if (opcionesLista) opcionesLista.innerHTML = '<p style="color:#27ae60;"><i class="fas fa-check-circle"></i> Envío Digital Gratuito</p>';
            seleccionarOpcionEnvio(0, 'Envío Digital', 'Digital');
            return;
        }

        if (data.success && data.opciones && data.opciones.length > 0) {
            let html = '';
            data.opciones.forEach((opcion, index) => {
                const checked = index === 0 ? 'checked' : '';
                html += `
                    <div style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 8px; cursor: pointer; background:#fff;" onclick="document.getElementById('envio_${index}').click()">
                        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
                            <input type="radio" name="opcion_envio" id="envio_${index}" value="${opcion.costo}" data-nombre="${opcion.nombre}" data-id="${opcion.id}" ${checked} onchange="seleccionarOpcionEnvio(${opcion.costo}, '${opcion.nombre}', '${opcion.id}')" style="margin-right: 10px;">
                            <div style="flex:1;">
                                <strong style="display:block; color:#0E2A47;">${opcion.nombre}</strong>
                                <span style="font-size:12px; color:#7f8c8d;">${opcion.tiempo_entrega}</span>
                            </div>
                            <strong style="color:#C78515;">${sign}${opcion.costo.toFixed(2)}</strong>
                        </label>
                    </div>
                `;
            });
            if (opcionesLista) opcionesLista.innerHTML = html;
            seleccionarOpcionEnvio(data.opciones[0].costo, data.opciones[0].nombre, data.opciones[0].id);
        } else {
            if (opcionesLista) {
                opcionesLista.innerHTML = `
                    <div style="padding: 12px; border: 1px solid #f6d365; border-radius: 6px; background:#fff9e6; color:#7a5500;">
                        <p style="margin:0 0 6px 0; font-weight:600;"><i class="fas fa-handshake"></i> Envío a convenir con el vendedor</p>
                        <p style="margin:0 0 8px 0; font-size:12.5px; line-height:1.4;">El despacho se coordinará y abonará directamente con el vendedor ($0 en esta orden).</p>
                        <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
                            <input type="radio" name="opcion_envio" id="envio_convenir" value="0" checked onchange="seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir')">
                            <span style="margin-left: 8px; font-weight:500;">Coordinar envío tras la compra</span>
                        </label>
                    </div>
                `;
            }
            seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir');
        }
    } catch (e) {
        console.error('Error calculando envio:', e);
        if (opcionesLista) {
            opcionesLista.innerHTML = `
                <div style="padding: 12px; border: 1px solid #f6d365; border-radius: 6px; background:#fff9e6; color:#7a5500;">
                    <p style="margin:0 0 6px 0; font-weight:600;"><i class="fas fa-handshake"></i> Envío a convenir con el vendedor</p>
                    <p style="margin:0 0 8px 0; font-size:12.5px; line-height:1.4;">No se pudo conectar con el cotizador postal. Coordinaremos el despacho directamente contigo tras la compra.</p>
                    <label style="display:flex; align-items:center; cursor:pointer; margin:0;">
                        <input type="radio" name="opcion_envio" id="envio_convenir_err" value="0" checked onchange="seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir')">
                        <span style="margin-left: 8px; font-weight:500;">Coordinar envío tras la compra ($0 en esta orden)</span>
                    </label>
                </div>
            `;
        }
        seleccionarOpcionEnvio(0, 'A convenir con el vendedor', 'A convenir');
    }
}

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
    
    const hayFisico = carrito.some(item => !item.tipo_producto || item.tipo_producto === 'fisico');
    const hayDigital = carrito.some(item => item.tipo_producto === 'digital');
    const hayTaller = carrito.some(item => item.tipo_producto === 'taller');
    const hayViaje = carrito.some(item => item.tipo_producto === 'viaje');
    const hayEvento = hayTaller || hayViaje;
    
    const dirInput = document.getElementById('direccion');
    const cpInput = document.getElementById('codigo_postal');
    const provSelect = document.getElementById('provincia');
    const partidoSelect = document.getElementById('partido');
    const ciudadSelect = document.getElementById('ciudad');

    const dirVal = dirInput ? dirInput.value.trim() : '';
    const cpVal = cpInput ? cpInput.value.trim() : '';
    const provVal = provSelect ? provSelect.value : '';
    const partidoVal = partidoSelect ? partidoSelect.value : '';
    const ciudadVal = ciudadSelect ? ciudadSelect.value : '';

    const cliente = {
        nombre: document.getElementById('nombre').value.trim(),
        apellido: document.getElementById('apellido').value.trim(),
        email: document.getElementById('email').value.trim(),
        telefono: document.getElementById('telefono').value.trim(),
        genero: document.getElementById('genero').value || null,
        direccion: hayFisico ? dirVal : (hayEvento ? 'Inscripción Evento / Taller' : 'Envío Digital'),
        ciudad: (partidoVal && ciudadVal) ? `${partidoVal} - ${ciudadVal}` : (ciudadVal || partidoVal || 'Digital'),
        provincia: provVal || 'Digital',
        codigo_postal: hayFisico ? cpVal : '0000'
    };

    const metodo_pago = document.getElementById('metodo_pago').value;
    
    const metodo_envio = (envioSeleccionado.id && envioSeleccionado.id !== 'A_CONVENIR' && envioSeleccionado.id !== 'Digital') 
                          ? `correo_${envioSeleccionado.id}` 
                          : (envioSeleccionado.id === 'Digital' ? 'digital' : 'a_convenir');
    
    const payload = {
        cliente,
        carrito,
        metodo_pago,
        metodo_envio,
        costo_envio: costoEnvioFinal
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
            localStorage.removeItem('cart');
            
            if (metodo_pago === 'mercadopago' && data.mpUrl) {
                window.location.href = data.mpUrl;
            } else {
                alert(`¡Pedido #${data.pedido.id} confirmado con éxito! Nos comunicaremos vía email.`);
                window.location.href = '/';
            }
        } else {
            alert('Error al procesar el pedido: ' + data.error);
            const defaultText = hayViaje ? 'Confirmar Reserva' : (hayTaller ? 'Confirmar Inscripción' : 'Confirmar Pedido');
            btn.innerText = defaultText;
            btn.disabled = false;
        }

    } catch (error) {
        console.error(error);
        alert('Ocurrió un error inesperado de red.');
        document.querySelector('button[type="submit"]').disabled = false;
    }
}

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
