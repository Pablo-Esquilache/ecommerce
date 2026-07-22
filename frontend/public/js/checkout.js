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

    const metodoPagoSelect = document.getElementById('metodo_pago');
    const datosBancariosDiv = document.getElementById('datos-bancarios');

    if (metodoPagoSelect && datosBancariosDiv) {
        metodoPagoSelect.addEventListener('change', async (e) => {
            if (e.target.value === 'transferencia') {
                datosBancariosDiv.style.display = 'block';
                try {
                    const res = await fetch('/api/configuracion');
                    const conf = await res.json();
                    document.getElementById('b_banco').innerText = conf.banco_nombre || '-';
                    document.getElementById('b_titular').innerText = conf.banco_titular || '-';
                    document.getElementById('b_cuit').innerText = conf.banco_cuit || '-';
                    document.getElementById('b_cbu').innerText = conf.banco_cbu || '-';
                    document.getElementById('b_alias').innerText = conf.banco_alias || '-';
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
    let todosDigitales = carrito.length > 0;
    carrito.forEach(item => {
        if (item.tipo_producto !== 'digital') {
            todosDigitales = false;
        }
        subtotalCheckout += item.precio * item.cantidad;
        container.innerHTML += `
            <div class="summary-item">
                <span>${item.cantidad}x ${item.nombre}</span>
                <span>$${(item.precio * item.cantidad).toFixed(2)}</span>
            </div>
        `;
    });
    
    document.getElementById('resumen-subtotal').innerText = `$${subtotalCheckout.toFixed(2)}`;
    
    const seccionEnvio = document.getElementById('seccion-envio');
    if (seccionEnvio) {
        if (todosDigitales) {
            seccionEnvio.style.display = 'none';
            document.getElementById('direccion').removeAttribute('required');
            document.getElementById('provincia').removeAttribute('required');
            document.getElementById('partido').removeAttribute('required');
            document.getElementById('ciudad').removeAttribute('required');
            document.getElementById('codigo_postal').removeAttribute('required');
            document.getElementById('direccion').value = '-';
            document.getElementById('provincia').innerHTML = '<option value="-">-</option>';
            document.getElementById('partido').innerHTML = '<option value="-">-</option>';
            document.getElementById('ciudad').innerHTML = '<option value="-">-</option>';
            document.getElementById('codigo_postal').value = '0000';
        } else {
            seccionEnvio.style.display = 'block';
            document.getElementById('direccion').setAttribute('required', 'true');
            document.getElementById('provincia').setAttribute('required', 'true');
            document.getElementById('partido').setAttribute('required', 'true');
            document.getElementById('ciudad').setAttribute('required', 'true');
            document.getElementById('codigo_postal').setAttribute('required', 'true');
        }
    }
}

async function calcularEnvio() {
    // Shipping is disabled for now, all calculations are skipped and cost is 0.
    costoEnvioFinal = 0;
    
    const total = subtotalCheckout + costoEnvioFinal;
    const resumenTotalEl = document.getElementById('resumen-total');
    if (resumenTotalEl) {
        resumenTotalEl.innerText = `$${total.toFixed(2)}`;
    }
}

async function procesarCheckout(e) {
    e.preventDefault();
    const carrito = JSON.parse(localStorage.getItem('cart')) || [];
    
    const cliente = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        email: document.getElementById('email').value,
        telefono: document.getElementById('telefono').value,
        genero: document.getElementById('genero').value,
        direccion: document.getElementById('direccion').value,
        // Combinamos Partido y Ciudad de forma transparente para el Backend
        ciudad: document.getElementById('partido').value + ' - ' + document.getElementById('ciudad').value,
        provincia: document.getElementById('provincia').value,
        codigo_postal: document.getElementById('codigo_postal').value
    };

    const metodo_pago = document.getElementById('metodo_pago').value;
    
    // Método de envío para el backend (podría ser un selector)
    const metodo_envio = costoEnvioFinal === 0 ? 'promocion' : 'domicilio';

    const payload = {
        cliente,
        carrito,
        metodo_pago,
        metodo_envio
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
