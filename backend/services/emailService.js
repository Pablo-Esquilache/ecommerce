const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');
const dns = require('dns');
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === '465', // true si usarán el 465 de Brevo
    connectionTimeout: 8000, // Limite de 8 seg para evitar colapso de "Enviando..."
    socketTimeout: 10000,
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASS || ''
    }
});

// Forzamos el uso de SMTP independientemente del tiempo de arranque del servidor.
// Esto evita falsos negativos (bloqueos permanentes) de red al reiniciar Render.
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
    console.log(`Contenido:\n${opciones.text || opciones.html}`);
    console.log('----------------------------------------\n');
};

const emailService = {
    enviarCorreoContacto: async (nombre, email, asunto, mensaje) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: process.env.EMAIL_CONTACTO || process.env.EMAIL_FROM || 'admin@tienda.com',
            subject: `Nuevo mensaje de contacto: ${asunto}`,
            text: `Has recibido un nuevo mensaje de contacto.\n\nNombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${mensaje}`
        };

        if (useRealEmail) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Correo de contacto enviado exitosamente de ${email}.`);
            } catch (error) {
                console.error('Error al enviar correo de contacto (real):', error);
                simularEnvio(mailOptions);
            }
        } else {
            simularEnvio(mailOptions);
        }
    },

    enviarCorreoPago: async (clienteMail, detallesPedido) => {
        let digitalContent = '';
        if (detallesPedido.detalles && detallesPedido.detalles.length > 0) {
            const digitalItems = detallesPedido.detalles.filter(d => d.tipo_producto === 'digital');
            if (digitalItems.length > 0) {
                digitalContent = '<h2>Tus Productos Digitales</h2><ul>';
                for (const item of digitalItems) {
                    digitalContent += `<li><strong>${item.producto_nombre}</strong>: `;
                    
                    let archivoUrl = item.archivo_digital;
                    if (archivoUrl && !archivoUrl.startsWith('http')) {
                        const { data } = await supabase.storage.from('digitales').createSignedUrl(archivoUrl, 7 * 24 * 60 * 60);
                        if (data) archivoUrl = data.signedUrl;
                    }

                    if (archivoUrl) {
                        digitalContent += `<br><a href="${archivoUrl}" target="_blank" style="display:inline-block; margin-top:5px; padding:8px 15px; background-color:#3498db; color:#fff; text-decoration:none; border-radius:4px;">Descargar Archivo</a>`;
                    }
                    if (item.video_url) {
                        digitalContent += `<br><a href="${item.video_url}" target="_blank" style="display:inline-block; margin-top:5px; padding:8px 15px; background-color:#e74c3c; color:#fff; text-decoration:none; border-radius:4px;">Ver Video</a>`;
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
            html: `<h1>¡Gracias por tu compra!</h1>
                   <p>Hemos recibido el pago de tu pedido #${detallesPedido.id}.</p>
                   <p>Total pagado: $${detallesPedido.total}</p>
                   ${digitalContent}
                   <p>Pronto comenzaremos a prepararlo para su envío (si contiene productos físicos). Te notificaremos cuando esté en camino.</p>`
        };

        if (useRealEmail) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Correo de pago confirmado enviado a ${clienteMail}.`);
            } catch (error) {
                console.error('Error al enviar correo de pago (real):', error);
                simularEnvio(mailOptions);
            }
        } else {
            simularEnvio(mailOptions);
        }
    },

    enviarCorreoPreparandoEnvio: async (cliente_email, pedidoData) => {
        const pId = pedidoData.id;
        const nombreCliente = pedidoData.nombre || 'Cliente';
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `Tu pedido #${pId} está siendo preparado 📦`,
            html: `<h1>¡Manos a la obra con tu pedido!</h1>
                   <p>Hola ${nombreCliente}, te confirmamos que tu orden #${pId} ya se encuentra registrada en la etapa de empaquetado y muy pronto será despachada.</p>
                   <p>Si compraste con retiro en sucursal, te avisaremos cuando esté listo. Si es con envío, pronto saldrá en camino.</p>
                   <p>¡Gracias por tu paciencia!</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`Correo preparando envio enviado a ${cliente_email}.`); }
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    enviarCorreoEnvio: async (cliente_email, pedidoData) => {
        const pId = pedidoData.id;
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `Tu pedido #${pId} está en camino 🚚`,
            html: `<h1>¡Tu pedido ha sido despachado!</h1>
                   <p>El pedido #${pId} ya se encuentra en camino hacia tu domicilio o sucursal seleccionada.</p>
                   <p>¡Esperamos que lo disfrutes!</p>`
        };

        if (useRealEmail) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Correo de orden enviada notificado a ${cliente_email}.`);
            } catch (error) {
                console.error('Error al enviar correo de despacho (real):', error);
                simularEnvio(mailOptions);
            }
        } else {
            console.log('\n=======================================');
            console.log(`[MOCK EMAIL] "Orden Enviada" => Para el Cliente: ${cliente_email}`);
            console.log(`Orden #${pId} en camino.`);
            console.log('=======================================\n');
        }
    },

    enviarCorreoEntregado: async (cliente_email, pedidoData) => {
        const pId = pedidoData.id;
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: cliente_email,
            subject: `¡Tu pedido #${pId} ha sido Entregado! 🎉`,
            html: `<h1>¡Pedido Entregado!</h1>
                   <p>Hola, queríamos confirmarte que tu pedido #${pId} figura como entregado.</p>
                   <p>Esperamos que lo disfrutes mucho. ¡Gracias por confiar en nosotros!</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`Correo de entrega enviado a ${cliente_email}.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    enviarCorreoCancelado: async (clienteMail, detallesPedido) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteMail,
            subject: `Pedido #${detallesPedido.id} Cancelado`,
            html: `<h1>Pedido Cancelado</h1>
                   <p>Hola, te informamos que tu pedido #${detallesPedido.id} ha sido cancelado.</p>
                   <p>Si tienes alguna duda o consideras que se trata de un error, por favor contáctanos respondiendo a este correo.</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`Correo de cancelación enviado a ${clienteMail}.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    enviarCorreoHtml: async (toEmail, subject, htmlContent) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: toEmail,
            subject: subject,
            html: htmlContent
        };

        if (useRealEmail) {
            try {
                await transporter.sendMail(mailOptions);
                console.log(`Correo HTML enviado exitosamente a ${toEmail}.`);
            } catch (error) {
                console.error('Error al enviar correo HTML (real):', error);
                simularEnvio(mailOptions);
            }
        } else {
            simularEnvio(mailOptions);
        }
    },

    enviarCorreoNuevaVentaAdmin: async (detallesPedido) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online Venta" <noreply@tienda.com>',
            to: adminEmail,
            subject: `💰 ¡Nueva Venta! Pedido #${detallesPedido.id}`,
            html: `<h1>¡Felicitaciones, ingresó una nueva venta!</h1>
                   <p>El sistema acaba de procesar el pago del <strong>Pedido #${detallesPedido.id}</strong>.</p>
                   <p>Monto total cobrado: <strong>$${detallesPedido.total}</strong></p>
                   <p>Email del cliente: ${detallesPedido.email || 'No registrado'}</p>
                   <p>Por favor, revisa tu Panel de Administrador para prepararlo.</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`[Admin] Correo de nueva venta enviado al administrador.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    enviarCorreoNuevoPedidoCliente: async (clienteEmail, pedidoData) => {
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Tienda Online" <noreply@tienda.com>',
            to: clienteEmail,
            subject: `¡Hemos recibido tu pedido #${pedidoData.id}!`,
            html: `<h1>¡Gracias por tu compra!</h1>
                   <p>Hemos registrado correctamente tu pedido <strong>#${pedidoData.id}</strong> por un total de $${pedidoData.total}.</p>
                   <p>Si elegiste abonar mediante Transferencia Bancaria, recuerda enviar el comprobante de pago. Si elegiste Mercado Pago, verificaremos la transacción en breve.</p>
                   <p>El estado actual de tu pedido es: <strong>Pendiente</strong>.</p>
                   <p>Te avisaremos por esta vía apenas el pago sea confirmado y tu pedido comience a prepararse.</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`Correo de nuevo pedido enviado al cliente ${clienteEmail}.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    notificarAdminNuevoPedido: async (pedidoData) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `[NUEVO PEDIDO] #${pedidoData.id} Creado en estado Pendiente`,
            html: `<h3>Se ha creado un nuevo pedido en el sistema.</h3>
                   <p>El cliente ha finalizado el carrito y se generó el pedido <strong>#${pedidoData.id}</strong> por $${pedidoData.total}.</p>
                   <p>El estado actual es <strong>Pendiente</strong>.</p>
                   <p>Método de pago seleccionado: ${pedidoData.metodo_pago}</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`[Admin] Aviso de nuevo pedido enviado al admin.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    },

    notificarAdminCambioEstado: async (pedidoData, nuevoEstado) => {
        const adminEmail = await getAdminEmail();
        const mailOptions = {
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER || '"Sistema Tienda" <noreply@tienda.com>',
            to: adminEmail,
            subject: `[CAMBIO DE ESTADO] Pedido #${pedidoData.id} -> ${nuevoEstado.toUpperCase()}`,
            html: `<h3>Actualización de Pedido</h3>
                   <p>El pedido <strong>#${pedidoData.id}</strong> ha cambiado su estado a: <strong>${nuevoEstado.toUpperCase()}</strong>.</p>
                   <p>Total del pedido: $${pedidoData.total}</p>`
        };

        if (useRealEmail) {
            try { await transporter.sendMail(mailOptions); console.log(`[Admin] Aviso de cambio de estado a ${nuevoEstado} enviado.`); } 
            catch (error) { simularEnvio(mailOptions); }
        } else { simularEnvio(mailOptions); }
    }
};

module.exports = emailService;
