const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
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

const getHtmlTemplate = (titulo, contenido) => {
    const publicUrl = process.env.PUBLIC_URL || 'https://tumarca.com';
    return `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #2C3E50;">
            <h1 style="color: #2C3E50; margin: 0; font-size: 24px;">E-Shopper</h1>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; margin-top: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <h2 style="color: #2C3E50; margin-top: 0;">${titulo}</h2>
            <div style="color: #555555; font-size: 16px; line-height: 1.5;">
                ${contenido}
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; color: #999999; font-size: 12px;">
            <p>© ${new Date().getFullYear()} E-Shopper. Todos los derechos reservados.</p>
            <p><a href="${publicUrl}" style="color: #3498db; text-decoration: none;">Visitar Tienda</a></p>
        </div>
    </div>
    `;
};

const emailService = {
    enviarCorreoContacto: async (nombre, email, asunto, mensaje) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: process.env.EMAIL_CONTACTO || process.env.EMAIL_FROM || 'admin@tienda.com',
            subject: `Nuevo mensaje de contacto: ${asunto}`,
            html: getHtmlTemplate('Nuevo Mensaje de Contacto', `
                <p><strong>Nombre:</strong> ${nombre}</p>
                <p><strong>Email:</strong> ${email}</p>
                <div style="padding: 15px; background-color: #f1f2f6; border-left: 4px solid #3498db; margin-top: 15px;">
                    ${mensaje.replace(/\n/g, '<br>')}
                </div>
            `)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    },

    enviarCorreoPago: async (clienteMail, detallesPedido) => {
        let digitalContent = '';
        if (detallesPedido.detalles && detallesPedido.detalles.length > 0) {
            const digitalItems = detallesPedido.detalles.filter(d => d.tipo_producto === 'digital');
            if (digitalItems.length > 0) {
                digitalContent = '<h3 style="color:#2C3E50; margin-top:25px; border-top: 1px solid #eee; padding-top: 15px;">Tus Productos Digitales</h3><ul style="list-style-type:none; padding:0;">';
                for (const item of digitalItems) {
                    digitalContent += `<li style="background:#f8f9fa; padding:15px; border-radius:6px; margin-bottom:10px;"><strong>${item.producto_nombre}</strong>`;
                    let archivoUrl = item.archivo_digital;
                    if (archivoUrl && !archivoUrl.startsWith('http')) {
                        const { data } = await supabase.storage.from('digitales').createSignedUrl(archivoUrl, 7 * 24 * 60 * 60);
                        if (data) archivoUrl = data.signedUrl;
                    }
                    if (archivoUrl) {
                        digitalContent += `<br><a href="${archivoUrl}" target="_blank" style="display:inline-block; margin-top:10px; padding:10px 20px; background-color:#3498db; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">📥 Descargar Archivo</a>`;
                    }
                    if (item.video_url) {
                        digitalContent += `<br><a href="${item.video_url}" target="_blank" style="display:inline-block; margin-top:10px; margin-left: 5px; padding:10px 20px; background-color:#e74c3c; color:#fff; text-decoration:none; border-radius:6px; font-weight:bold;">▶ Ver Video</a>`;
                    }
                    digitalContent += `</li>`;
                }
                digitalContent += '</ul>';
            }
        }

        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteMail,
            subject: `¡Pago confirmado! Pedido #${detallesPedido.id}`,
            html: getHtmlTemplate('¡Gracias por tu compra!', `
                <p>Hemos recibido el pago exitoso de tu pedido <strong>#${detallesPedido.id}</strong>.</p>
                <div style="background-color: #f1f2f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
                    <p style="margin:0; font-size: 18px;">Total pagado: <strong>$${detallesPedido.total}</strong></p>
                </div>
                ${digitalContent}
                <p style="margin-top:20px;">Pronto comenzaremos a prepararlo para su envío (si contiene productos físicos). Te notificaremos cuando esté en camino.</p>
            `)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    },

    enviarCorreoEnvio: async (cliente_email, pedidoData) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `Tu pedido #${pedidoData.id} está en camino 🚚`,
            html: getHtmlTemplate('¡Tu pedido ha sido despachado!', `
                <p>El pedido <strong>#${pedidoData.id}</strong> ya se encuentra en camino hacia tu domicilio o sucursal seleccionada.</p>
                <p>¡Esperamos que lo disfrutes!</p>
            `)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    },

    enviarCorreoHtml: async (toEmail, subject, htmlContent) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: toEmail,
            subject: subject,
            html: getHtmlTemplate(subject, htmlContent)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    },

    enviarCorreoNuevoPedidoCliente: async (clienteEmail, pedidoData) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteEmail,
            subject: `¡Hemos recibido tu pedido #${pedidoData.id}!`,
            html: getHtmlTemplate('¡Gracias por tu compra!', `
                <p>Hemos registrado correctamente tu pedido <strong>#${pedidoData.id}</strong> por un total de <strong>$${pedidoData.total}</strong>.</p>
                <p>Si elegiste abonar mediante Transferencia Bancaria, recuerda enviar el comprobante de pago. Si elegiste Mercado Pago, verificaremos la transacción en breve.</p>
                <p>El estado actual de tu pedido es: <strong>Pendiente</strong>.</p>
                <p>Te avisaremos por esta vía apenas el pago sea confirmado y tu pedido comience a prepararse.</p>
            `)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    },

    notificarAdminNuevoPedido: async (pedidoData) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `[NUEVO PEDIDO] #${pedidoData.id} Creado en estado Pendiente`,
            html: getHtmlTemplate('Nuevo Pedido Registrado', `
                <p>El cliente ha finalizado el carrito y se generó el pedido <strong>#${pedidoData.id}</strong> por <strong>$${pedidoData.total}</strong>.</p>
                <p>El estado actual es <strong>Pendiente</strong>.</p>
                <p>Método de pago seleccionado: ${pedidoData.metodo_pago}</p>
            `)
        };
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
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
        if (useRealEmail) { try { await transporter.sendMail(mailOptions); } catch (e) { simularEnvio(mailOptions); } } else { simularEnvio(mailOptions); }
    }
};

module.exports = emailService;
