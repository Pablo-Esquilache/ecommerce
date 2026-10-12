const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Pedido = require('../models/Pedido');

// Validar el retorno de MP (el cliente vuelve de pagar a nuestra tienda)
// NOTA DE SEGURIDAD: Esta ruta pública sólo redirige al usuario a la vista frontend correspondiente.
// NUNCA debe marcar el pedido como pagado ni enviar correos de confirmación / descargas;
// esa responsabilidad pertenece exclusivamente al webhook oficial verificado (POST /mercadopago).
router.get('/mercadopago/return', async (req, res) => {
    try {
        const rawStatus = req.query.status;
        const collectionStatus = req.query.collection_status;
        const externalRef = req.query.external_reference; 
        
        const isApproved = (
            rawStatus === 'success' ||
            rawStatus === 'approved' ||
            collectionStatus === 'approved' ||
            (Array.isArray(rawStatus) && rawStatus.some(s => s === 'success' || s === 'approved'))
        );

        if (isApproved) {
            return res.redirect(`/?pago=exitoso&pedido=${externalRef || ''}`);
        }
        
        const isPending = (
            rawStatus === 'pending' ||
            collectionStatus === 'pending' ||
            collectionStatus === 'in_process'
        );
        if (isPending) {
            return res.redirect(`/?pago=pendiente&pedido=${externalRef || ''}`);
        }

        // Redirigir al Frontend indicando fallo
        return res.redirect(`/?pago=fallido&pedido=${externalRef || ''}`);
    } catch (error) {
        console.error("Error procesando retorno de Mercado Pago:", error);
        res.redirect('/?pago=error');
    }
});

// Endpoint Oficial de Webhooks (POST) - Seguridad Criptográfica y Fulfilling Atómico
router.post('/mercadopago', async (req, res) => {
    try {
        const queryType = req.query.type || req.query.topic;
        const bodyType = req.body.type || req.body.action;
        const topic = queryType || bodyType;
        const dataId = req.query['data.id'] || (req.body.data && req.body.data.id);

        if (topic === 'payment' && dataId) {
            // --- 1. SEGURIDAD HMAC-SHA256 ---
            const xSignature = req.headers['x-signature'];
            const xRequestId = req.headers['x-request-id'];

            const secret = process.env.MP_WEBHOOK_SECRET;
            if (secret) {
                if (!xSignature || !xRequestId) {
                    console.error('🚨 [Webhooks] ¡ALERTA! Request sin cabeceras de firma de MP.');
                    return res.status(401).send('Firma faltante');
                }
                const tsPart = xSignature.split(',').find(p => p.trim().startsWith('ts='));
                const v1Part = xSignature.split(',').find(p => p.trim().startsWith('v1='));
                if (!tsPart || !v1Part) {
                    console.error('🚨 [Webhooks] ¡ALERTA! Formato de firma inválido.');
                    return res.status(401).send('Formato de firma inválido');
                }
                const ts = tsPart.split('=')[1];
                const v1 = v1Part.split('=')[1];
                const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
                const hmac = crypto.createHmac('sha256', secret);
                const digest = hmac.update(manifest).digest('hex');

                if (digest !== v1) {
                    console.error('🚨 [Webhooks] ¡ALERTA! Firma de MercadoPago inválida. Posible ataque evadido.');
                    return res.status(401).send('Firma inválida');
                }
            } else {
                console.warn('⚠️ [Webhooks] MP_WEBHOOK_SECRET no configurado. Validando el pago sin verificación criptográfica.');
            }

            // --- 2. CONSULTA Y FULFILLMENT ---
            console.log(`[Webhooks] Verificando pago original ID: ${dataId} en Mercado Pago...`);
            const axios = require('axios');

            try {
                const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || process.env.MERCADOPAGO_ACCESS_TOKEN;
                const response = await axios.get(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
                });

                const paymentInfo = response.data;
                console.log(`[Webhooks] Status Real: ${paymentInfo.status} para la referencia (Pedido ID) ${paymentInfo.external_reference}`);

                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const pedidoDetails = await Pedido.getById(paymentInfo.external_reference);
                    if (!pedidoDetails) {
                        console.error(`🚨 [Webhooks] Pedido no encontrado para referencia: ${paymentInfo.external_reference}`);
                        return res.status(404).send('Pedido no encontrado');
                    }

                    // Validar que el monto cobrado coincida con el total del pedido
                    const montoCobrado = Number(paymentInfo.transaction_amount);
                    const totalEsperado = Number(pedidoDetails.total);

                    if (isNaN(montoCobrado) || montoCobrado < (totalEsperado - 0.01)) {
                        console.error(`🚨 [Webhooks] ALERTA DE SEGURIDAD: Discrepancia de monto en Pedido #${pedidoDetails.id}. Esperado: ${totalEsperado}, Cobrado: ${montoCobrado}`);
                        return res.status(400).send('Monto abonado inconsistente con el total del pedido');
                    }

                    // Actualización atómica condicional: sólo cambia a 'pagado' si NO estaba ya pagado
                    const pedidoActualizado = await Pedido.marcarComoPagado(paymentInfo.external_reference);

                    // Despachar correos únicamente si esta llamada realizó la transición a pagado (previene duplicados y condiciones de carrera)
                    if (pedidoActualizado) {
                        console.log(`✅ [Webhooks] Orden #${paymentInfo.external_reference} marcada exitosamente como PAGADO.`);
                        
                        const emailService = require('../services/emailService');
                        const emailPromises = [
                            emailService.enviarCorreoNuevaVentaAdmin(pedidoDetails)
                        ];
                        if (pedidoDetails.email) {
                            emailPromises.push(emailService.enviarCorreoPago(pedidoDetails.email, pedidoDetails));
                        }
                        await Promise.race([
                            Promise.allSettled(emailPromises),
                            new Promise(r => setTimeout(() => { console.warn('⚠️ [Webhooks POST] Emails excedieron 4500ms'); r(); }, 4500))
                        ]);
                    } else {
                        console.log(`ℹ️ [Webhooks] Orden #${paymentInfo.external_reference} ya se encontraba pagada previamente. Se omiten emails duplicados.`);
                    }
                }
            } catch(apiError) {
               console.error('Error al chequear status en la API de Mercado Pago:', apiError.message);
            }
        } else {
             console.log("Notificación MP ignorada o no es un pago. Type:", topic);
        }

        // Respondemos 200 OK a Mercado Pago DESPUÉS de haber procesado y enviado los correos
        res.status(200).send('Webhook recibido');

    } catch (error) {
        console.error("Error crítico en el receptor POST de Webhooks MP:", error);
        res.status(500).send('Error interno');
    }
});

module.exports = router;
