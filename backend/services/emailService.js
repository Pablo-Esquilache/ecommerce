const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 2525,
    secure: process.env.EMAIL_PORT === '465',
    connectionTimeout: 8000,
    socketTimeout: 10000,
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

const useRealEmail = process.env.EMAIL_USER && process.env.EMAIL_PASS ? true : false;

if (useRealEmail) {
    console.log('✅ [EmailService] Variables detectadas. Intentaremos enviar correos a la fuerza.');
} else {
    console.log('⚠️ [EmailService] Faltan credenciales SMTP. Activando guardafallas de consola.');
}

const db = require('../config/database');

const getAdminEmail = async () => {
    try {
        const { rows } = await db.query('SELECT email_admin FROM configuracion WHERE id = 1');
        if (rows.length > 0 && rows[0].email_admin) return rows[0].email_admin;
    } catch (e) { console.error('Error fetching email_admin', e); }
    return process.env.EMAIL_FROM || 'admin@tienda.com';
};

const simularEnvio = (opciones) => {
    console.log('\n--- 📧 SIMULACIÓN DE ENVÍO DE CORREO ---');
    console.log(`De: ${opciones.from || 'Sistema'}`);
    console.log(`Para: ${opciones.to}`);
    console.log(`Asunto: ${opciones.subject}`);
    console.log('----------------------------------------\n');
};

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const DEFAULT_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Iconografía Bizantina" <noreply@iconografiabizantina.com>';

function formatFechaEspanol(fechaStr) {
    if (!fechaStr) return null;
    try {
        const d = new Date(fechaStr);
        if (isNaN(d.getTime())) return fechaStr;
        return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    } catch (_) {
        return fechaStr;
    }
}

const getHtmlTemplate = (titulo, contenido) => {
    const publicUrl = process.env.PUBLIC_URL || 'https://iconografiabizantina.netlify.app';
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #FAF8F5; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #0E2A47;">
            <h1 style="color: #0E2A47; margin: 0; font-size: 22px; font-family: 'Cinzel', serif;">Iconografía Bizantina</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #efe8df;">
            <h2 style="color: #0E2A47; margin-top: 0;">${titulo}</h2>
            <div style="color: #444444; font-size: 15px; line-height: 1.6;">
                ${contenido}
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #888888; font-size: 12px;">
            <p>© ${new Date().getFullYear()} Iconografía Bizantina — Giselle Ochoa. Todos los derechos reservados.</p>
            <p><a href="${publicUrl}" style="color: #C78515; text-decoration: none; font-weight: 600;">Visitar Tienda Oficial</a></p>
        </div>
    </div>
    `;
};

const enviarOConsola = async (mailOptions) => {
    if (useRealEmail) {
        try {
            console.log(`⏳ [EmailService] Enviando correo a ${mailOptions.to} (${mailOptions.subject})...`);
            const info = await transporter.sendMail(mailOptions);
            console.log(`✅ [EmailService] ¡Correo enviado con éxito! MessageId: ${info.messageId}`);
            return info;
        } catch (e) {
            console.error(`❌ [EmailService ERROR CRÍTICO SMTP] No se pudo enviar correo a ${mailOptions.to}. Detalle:`, e.message || e);
            if (process.env.SENTRY_DSN) {
                try { const Sentry = require('@sentry/node'); Sentry.captureException(e); } catch(_) {}
            }
            console.log('⚠️ [EmailService] Falló el envío real. Mostrando simulación de respaldo:');
            simularEnvio(mailOptions);
            throw e;
        }
    } else {
        simularEnvio(mailOptions);
        return { simulated: true };
    }
};

const emailService = {
    enviarCorreoContacto: async (nombre, email, asunto, mensaje) => {
        const adminEmail = await getAdminEmail();
        const nomEsc = escapeHtml(nombre);
        const mailEsc = escapeHtml(email);
        const asuntoEsc = escapeHtml(asunto || 'Sin asunto');
        const msgEsc = escapeHtml(mensaje || '').replace(/\n/g, '<br>');

        const mailOptions = {
            from: DEFAULT_FROM,
            to: adminEmail || 'admin@tienda.com',
            replyTo: email,
            subject: `Nuevo mensaje de contacto: ${asuntoEsc}`,
            html: getHtmlTemplate('Nuevo Mensaje de Contacto', `
                <p><strong>Nombre:</strong> ${nomEsc}</p>
                <p><strong>Email:</strong> ${mailEsc}</p>
                <div style="padding: 15px; background-color: #f7f4ee; border-left: 4px solid #C78515; margin-top: 15px; border-radius: 4px;">
                    ${msgEsc}
                </div>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoPago: async (clienteMail, detallesPedido) => {
        const items = detallesPedido.detalles || [];
        const digitalItems = items.filter(d => d.tipo_producto === 'digital');
        const tallerItems = items.filter(d => d.tipo_producto === 'taller');
        const viajeItems = items.filter(d => d.tipo_producto === 'viaje');
        const fisicoItems = items.filter(d => !d.tipo_producto || d.tipo_producto === 'fisico');

        let tallerContent = '';
        if (tallerItems.length > 0) {
            for (const t of tallerItems) {
                const modalidadTexto = (t.modalidad || 'presencial').toLowerCase();
                const esOnline = modalidadTexto === 'online';
                const fechaInicioTexto = formatFechaEspanol(t.fecha_inicio);
                const nombreEsc = escapeHtml(t.producto_nombre || 'Taller y Seminario');
                const descEsc = t.producto_descripcion ? escapeHtml(t.producto_descripcion).replace(/\n/g, '<br>') : '';
                const lugarEsc = t.lugar ? escapeHtml(t.lugar) : '';

                tallerContent += `
                <div style="background-color: #FAF8F5; border: 1px solid #efe8df; border-left: 4px solid #C78515; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="color: #0E2A47; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-family: 'Cinzel', serif;">🎨 Inscripción Confirmada: ${nombreEsc}</h3>
                    <ul style="list-style: none; padding-left: 0; line-height: 1.8; margin: 0 0 15px 0; color: #333;">
                        <li><strong>Modalidad elegida:</strong> <span style="text-transform: capitalize; background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ddd; font-weight: 600;">${escapeHtml(modalidadTexto)}</span></li>
                        ${fechaInicioTexto ? `<li><strong>Fecha de inicio:</strong> ${fechaInicioTexto}</li>` : ''}
                        ${lugarEsc ? `<li><strong>Lugar:</strong> ${lugarEsc}</li>` : ''}
                    </ul>
                    ${descEsc ? `
                        <div style="background: #ffffff; padding: 12px 15px; border-radius: 4px; border: 1px dashed #d1c7b7; font-size: 14px; color: #555; margin-bottom: 15px;">
                            <strong>ℹ️ Información importante para el inicio:</strong><br>
                            ${descEsc}
                        </div>
                    ` : ''}
                    ${esOnline ? `
                        <div style="background: #e0f2fe; padding: 12px 15px; border-radius: 4px; font-size: 13px; color: #0369a1;">
                            📹 <strong>Acceso a la transmisión:</strong> En los días previos al inicio del taller te enviaremos por este medio o por WhatsApp el enlace exclusivo de YouTube para conectarte a las clases en vivo.
                        </div>
                    ` : `
                        <div style="background: #fef3c7; padding: 12px 15px; border-radius: 4px; font-size: 13px; color: #92400e;">
                            📍 <strong>Lugar de encuentro:</strong> Te esperamos en el atelier en la fecha indicada.
                        </div>
                    `}
                </div>`;
            }
        }

        let viajeContent = '';
        if (viajeItems.length > 0) {
            for (const v of viajeItems) {
                const fechaInicioTexto = formatFechaEspanol(v.fecha_inicio);
                const nombreEsc = escapeHtml(v.producto_nombre || 'Viaje y Retiro');
                const descEsc = v.producto_descripcion ? escapeHtml(v.producto_descripcion).replace(/\n/g, '<br>') : '';
                const lugarEsc = v.lugar ? escapeHtml(v.lugar) : '';

                viajeContent += `
                <div style="background-color: #FAF8F5; border: 1px solid #efe8df; border-left: 4px solid #0E2A47; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="color: #0E2A47; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-family: 'Cinzel', serif;">✈️ Plaza Reservada: ${nombreEsc}</h3>
                    <ul style="list-style: none; padding-left: 0; line-height: 1.8; margin: 0 0 15px 0; color: #333;">
                        <li><strong>Concepto abonado:</strong> <span style="background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ddd; font-weight: 600; color: #0E2A47;">Reserva de Plaza Confirmada</span></li>
                        ${fechaInicioTexto ? `<li><strong>Fecha del viaje / retiro:</strong> ${fechaInicioTexto}</li>` : ''}
                        ${lugarEsc ? `<li><strong>Destino:</strong> ${lugarEsc}</li>` : ''}
                    </ul>
                    ${descEsc ? `
                        <div style="background: #ffffff; padding: 12px 15px; border-radius: 4px; border: 1px dashed #d1c7b7; font-size: 14px; color: #555; margin-bottom: 15px;">
                            <strong>🧭 Información importante del retiro:</strong><br>
                            ${descEsc}
                        </div>
                    ` : ''}
                    <div style="background: #ede9fe; padding: 12px 15px; border-radius: 4px; font-size: 13px; color: #5b21b6;">
                        📌 <strong>Próximos pasos y coordinación:</strong> Giselle se pondrá en contacto directo contigo a través de WhatsApp o teléfono en los próximos días para brindarte el itinerario completo, coordinar los puntos de encuentro y acompañarte en todo el proceso previo a la partida.
                    </div>
                </div>`;
            }
        }

        let digitalContent = '';
        if (digitalItems.length > 0) {
            digitalContent = '<h3 style="color:#0E2A47; margin-top:25px; border-top: 1px solid #eee; padding-top: 15px; font-family: \'Cinzel\', serif;">💻 Tus Productos Digitales</h3><ul style="list-style-type:none; padding:0;">';
            for (const item of digitalItems) {
                digitalContent += `<li style="background:#f8f9fa; padding:15px; border-radius:6px; margin-bottom:10px;"><strong>${escapeHtml(item.producto_nombre)}</strong>`;
                let archivoUrl = item.archivo_digital;
                if (archivoUrl && !archivoUrl.startsWith('http')) {
                    const { data } = await supabase.storage.from('digitales').createSignedUrl(archivoUrl, 7 * 24 * 60 * 60);
                    if (data) archivoUrl = data.signedUrl;
                }
                if (archivoUrl) {
                    digitalContent += `<br><a href="${archivoUrl}" target="_blank" style="display:inline-block; margin-top:10px; margin-bottom:5px; padding:10px 20px; background-color:#0E2A47; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">📥 Descargar Archivo</a>
                    <p style="font-size: 13px; color: #7f8c8d; margin-top: 5px; margin-bottom: 0;"><em>⚠️ Por seguridad, este enlace es válido por 7 días. Te recomendamos descargarlo en tu dispositivo.</em></p>`;
                }
                if (item.video_url) {
                    digitalContent += `<br><a href="${item.video_url}" target="_blank" style="display:inline-block; margin-top:10px; margin-left: 5px; padding:10px 20px; background-color:#C78515; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">▶ Ver Video</a>`;
                }
                digitalContent += `</li>`;
            }
            digitalContent += '</ul>';
        }

        let fisicoContent = '';
        if (fisicoItems.length > 0) {
            fisicoContent = '<p style="margin-top:20px; background: #FAF8F5; padding: 12px; border-radius: 6px; border: 1px solid #efe8df;">📦 <strong>Iconografías Físicas:</strong> Comenzaremos a preparar tu paquete cuidadosamente para su despacho. Te notificaremos por este medio cuando esté en camino con su código de seguimiento.</p>';
        }

        // Asunto y título adaptativos según los productos comprados
        let asunto = `¡Pago confirmado! Pedido #${detallesPedido.id}`;
        let tituloHtml = '¡Gracias por tu compra!';

        if (tallerItems.length > 0 && viajeItems.length === 0 && digitalItems.length === 0 && fisicoItems.length === 0) {
            asunto = `¡Inscripción confirmada! Taller: ${tallerItems[0].producto_nombre} — Pedido #${detallesPedido.id}`;
            tituloHtml = '¡Tu cupo está reservado con éxito!';
        } else if (viajeItems.length > 0 && tallerItems.length === 0 && digitalItems.length === 0 && fisicoItems.length === 0) {
            asunto = `¡Plaza reservada! ${viajeItems[0].producto_nombre} — Pedido #${detallesPedido.id}`;
            tituloHtml = '¡Tu reserva de viaje ha sido confirmada!';
        } else if (digitalItems.length > 0 && tallerItems.length === 0 && viajeItems.length === 0 && fisicoItems.length === 0) {
            asunto = `¡Pago confirmado y acceso a tu curso! Pedido #${detallesPedido.id}`;
            tituloHtml = '¡Acceso habilitado a tu material digital!';
        }

        const nombreCliente = escapeHtml(detallesPedido.cliente_nombre || detallesPedido.nombre || 'Cliente');

        const mailOptions = {
            from: DEFAULT_FROM,
            to: clienteMail,
            subject: asunto,
            html: getHtmlTemplate(tituloHtml, `
                <p>Hola <strong>${nombreCliente}</strong>, confirmamos que hemos recibido con éxito el pago de tu pedido <strong>#${detallesPedido.id}</strong>.</p>
                <div style="background-color: #f1f2f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <p style="margin:0; font-size: 18px;">Total abonado: <strong>$${detallesPedido.total}</strong></p>
                </div>
                ${tallerContent}
                ${viajeContent}
                ${digitalContent}
                ${fisicoContent}
                <p style="margin-top:25px; color:#666; font-size:14px;">¿Tenés alguna duda o consulta? Podés responder directamente a este correo o escribirnos por WhatsApp. ¡Muchas gracias por confiar en nuestra labor!</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoPreparandoEnvio: async (cliente_email, pedidoData) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `Tu pedido #${pedidoData.id} está siendo preparado 📦`,
            html: getHtmlTemplate('¡Manos a la obra con tu pedido!', `
                <p>Hola ${pedidoData.nombre || 'Cliente'}, te confirmamos que tu orden <strong>#${pedidoData.id}</strong> ya se encuentra registrada en la etapa de empaquetado y muy pronto será despachada.</p>
                <p>Si compraste con retiro en sucursal, te avisaremos cuando esté listo. Si es con envío, pronto saldrá en camino.</p>
                <p>¡Gracias por tu paciencia!</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoEnvio: async (cliente_email, pedidoData) => {
        let trackingHtml = '';
        if (pedidoData.tracking_number) {
            trackingHtml = `<p>Tu código de seguimiento es: <strong>${pedidoData.tracking_number}</strong></p>
                            <p>Podés hacer el seguimiento en la web de Correo Argentino.</p>`;
        }
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `Tu pedido #${pedidoData.id} está en camino 🚚`,
            html: getHtmlTemplate('¡Tu pedido ha sido despachado!', `
                <p>El pedido <strong>#${pedidoData.id}</strong> ya se encuentra en camino hacia tu domicilio o sucursal seleccionada.</p>
                ${trackingHtml}
                <p>¡Esperamos que lo disfrutes!</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoEntregado: async (cliente_email, pedidoData) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `¡Tu pedido #${pedidoData.id} ha sido Entregado! 🎉`,
            html: getHtmlTemplate('¡Pedido Entregado!', `
                <p>Hola, queríamos confirmarte que tu pedido <strong>#${pedidoData.id}</strong> figura como entregado.</p>
                <p>Esperamos que lo disfrutes mucho. ¡Gracias por confiar en nosotros!</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoCancelado: async (clienteMail, detallesPedido) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteMail,
            subject: `Pedido #${detallesPedido.id} Cancelado`,
            html: getHtmlTemplate('Pedido Cancelado', `
                <p>Hola, te informamos que tu pedido <strong>#${detallesPedido.id}</strong> ha sido cancelado.</p>
                <p>Si tienes alguna duda o consideras que se trata de un error, por favor contáctanos respondiendo a este correo.</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoHtml: async (toEmail, subject, htmlContent) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: toEmail,
            subject: subject,
            html: getHtmlTemplate(subject, htmlContent)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoNuevaVentaAdmin: async (detallesPedido) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online Venta" <noreply@tienda.com>',
            to: adminEmail,
            subject: `💰 ¡Nueva Venta! Pedido #${detallesPedido.id}`,
            html: getHtmlTemplate('¡Felicitaciones, ingresó una nueva venta!', `
                <p>El sistema acaba de procesar el pago del <strong>Pedido #${detallesPedido.id}</strong>.</p>
                <p>Monto total cobrado: <strong>$${detallesPedido.total}</strong></p>
                <p>Email del cliente: ${detallesPedido.email || 'No registrado'}</p>
                <p>Por favor, revisa tu Panel de Administrador para prepararlo.</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarCorreoNuevoPedidoCliente: async (clienteEmail, pedidoData, detalles = []) => {
        let bankDetailsHtml = '';
        const isDigitalOnly = detalles.length > 0 && detalles.every(d => d.tipo_producto === 'digital');
        let contactEmail = '';
        let contactPhone = '';
        
        if (pedidoData.metodo_pago && pedidoData.metodo_pago.toLowerCase().includes('transferencia')) {
            try {
                const isUSD = pedidoData.metodo_pago === 'transferencia_usd';
                const sign = isUSD ? 'USD $' : '$';
                
                const { rows } = await db.query('SELECT banco_nombre, banco_titular, banco_cuit, banco_cbu, banco_alias, banco_usd_nombre, banco_usd_titular, banco_usd_cuit, banco_usd_cbu, banco_usd_alias, email, telefono FROM configuracion WHERE id = 1');
                if (rows.length > 0) {
                    const b = rows[0];
                    contactEmail = b.email || '';
                    contactPhone = b.telefono || '';
                    
                    const bankData = isUSD ? {
                        nombre: b.banco_usd_nombre,
                        titular: b.banco_usd_titular,
                        cuit: b.banco_usd_cuit,
                        cbu: b.banco_usd_cbu,
                        alias: b.banco_usd_alias
                    } : {
                        nombre: b.banco_nombre,
                        titular: b.banco_titular,
                        cuit: b.banco_cuit,
                        cbu: b.banco_cbu,
                        alias: b.banco_alias
                    };

                    if (bankData.cbu || bankData.alias) {
                        bankDetailsHtml = `
                            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 20px; margin: 25px 0;">
                                <h3 style="margin-top: 0; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">💳 Datos para la Transferencia ${isUSD ? '(USD)' : ''}</h3>
                                <p style="margin-bottom: 10px;">Por favor, transfiere el total exacto de <strong>${sign}${pedidoData.total}</strong> a la siguiente cuenta:</p>
                                <ul style="list-style: none; padding-left: 0; line-height: 1.8; margin: 0;">
                                    ${bankData.nombre ? `<li><strong>Banco / Plataforma:</strong> ${bankData.nombre}</li>` : ''}
                                    ${bankData.titular ? `<li><strong>Titular:</strong> ${bankData.titular}</li>` : ''}
                                    ${bankData.cuit ? `<li><strong>CUIT / Identificación:</strong> ${bankData.cuit}</li>` : ''}
                                    ${bankData.cbu ? `<li><strong>CBU / CVU:</strong> <span style="background: #e8f4fd; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${bankData.cbu}</span></li>` : ''}
                                    ${bankData.alias ? `<li><strong>Alias:</strong> <span style="background: #e8f4fd; padding: 2px 6px; border-radius: 4px; font-family: monospace;">${bankData.alias}</span></li>` : ''}
                                </ul>
                                <p style="margin-top: 15px; margin-bottom: 5px; font-size: 13px; color: #7f8c8d;">Una vez realizado el pago, recuerda enviarnos el comprobante para procesar tu pedido a la brevedad.</p>
                                <p style="margin-top: 5px; margin-bottom: 0; font-size: 13px; color: #7f8c8d;"><strong>Enviar comprobante a:</strong> ${contactEmail || 'Respondiendo a este correo'}${contactPhone ? ` o por WhatsApp al ${contactPhone}` : ''}</p>
                            </div>
                        `;
                    }
                }
            } catch (e) {
                console.error("Error obteniendo datos bancarios para el mail:", e);
            }
        }

        const preparacionTexto = isDigitalOnly 
            ? '<p>Te avisaremos por esta vía apenas el pago sea confirmado para enviarte automáticamente el acceso a tu material digital.</p>'
            : '<p>Te avisaremos por esta vía apenas el pago sea confirmado y tu pedido comience a prepararse.</p>';

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteEmail,
            subject: `¡Hemos recibido tu pedido #${pedidoData.id}!`,
            html: getHtmlTemplate('¡Gracias por tu compra!', `
                <p>Hemos registrado correctamente tu pedido <strong>#${pedidoData.id}</strong> por un total de <strong>${pedidoData.metodo_pago === 'transferencia_usd' ? 'USD $' : '$'}${pedidoData.total}</strong>.</p>
                <p>El estado actual de tu pedido es: <strong>Pendiente</strong>.</p>
                ${bankDetailsHtml}
                ${!bankDetailsHtml ? '<p>Si elegiste abonar mediante Transferencia Bancaria, recuerda enviar el comprobante de pago. Si elegiste Mercado Pago, verificaremos la transacción en breve.</p>' : ''}
                ${preparacionTexto}
            `)
        };
        await enviarOConsola(mailOptions);
    },

    notificarAdminNuevoPedido: async (pedidoData) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `[NUEVO PEDIDO] #${pedidoData.id} Creado en estado Pendiente`,
            html: getHtmlTemplate('Nuevo Pedido Registrado', `
                <p>El cliente ha finalizado el carrito y se generó el pedido <strong>#${pedidoData.id}</strong> por <strong>${pedidoData.metodo_pago === 'transferencia_usd' ? 'USD $' : '$'}${pedidoData.total}</strong>.</p>
                <p>El estado actual es <strong>Pendiente</strong>.</p>
                <p>Método de pago seleccionado: ${pedidoData.metodo_pago}</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    notificarAdminCambioEstado: async (pedidoData, nuevoEstado) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `[CAMBIO DE ESTADO] Pedido #${pedidoData.id} -> ${nuevoEstado.toUpperCase()}`,
            html: getHtmlTemplate('Actualización de Pedido', `
                <p>El pedido <strong>#${pedidoData.id}</strong> ha cambiado su estado a: <strong>${nuevoEstado.toUpperCase()}</strong>.</p>
                <p>Total del pedido: $${pedidoData.total}</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },
    
    enviarAlertaStock: async (productoId, productoNombre, stockRestante) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `⚠️ ALERTA DE STOCK: ${productoNombre}`,
            html: getHtmlTemplate('Alerta de Bajo Stock', `
                <p>El producto <strong>${productoNombre}</strong> (ID: ${productoId}) tiene niveles críticos de inventario.</p>
                <div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 15px 0; color: #991b1b;">
                    <p style="margin:0; font-size: 18px;">Stock restante: <strong>${stockRestante} unidades</strong></p>
                </div>
                <p>Por favor, revisa tu Panel de Administrador para reponer el inventario pronto y no perder ventas.</p>
            `)
        };
        await enviarOConsola(mailOptions);
    },

    enviarAlertaPagoPedidoCancelado: async (pedidoData, paymentInfo) => {
        const adminEmail = await getAdminEmail();
        const monto = paymentInfo ? paymentInfo.transaction_amount : pedidoData.total;
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Iconografía Bizantina" <noreply@iconografiabizantina.com>',
            to: adminEmail,
            subject: `🚨 ALERTA: Pago recibido para Pedido #${pedidoData.id} CANCELADO`,
            html: getHtmlTemplate('Atención: Pago sobre Pedido Cancelado', `
                <p>Se ha recibido una notificación de pago en Mercado Pago por <strong>$${monto}</strong> para el <strong>Pedido #${pedidoData.id}</strong>.</p>
                <div style="background-color: #fee2e2; border: 1px solid #fca5a5; padding: 15px; border-radius: 6px; margin: 15px 0; color: #991b1b;">
                    <p style="margin:0; font-weight:bold; font-size:16px;">ESTADO ACTUAL: CANCELADO</p>
                    <p style="margin:6px 0 0; font-size:14px;">El stock de los productos NO fue alterado automáticamente para proteger tus obras de arte únicas.</p>
                </div>
                <p><strong>Email del cliente:</strong> ${pedidoData.email || 'No registrado'}</p>
                <p><strong>ID de Pago Mercado Pago:</strong> ${paymentInfo ? paymentInfo.id : 'N/A'}</p>
                <p>Por favor, ingresá al Panel de Administrador o contactá al comprador para coordinar la reapertura manual del pedido o realizar el reembolso correspondiente.</p>
            `)
        };
        await enviarOConsola(mailOptions);
    }
};

module.exports = emailService;
