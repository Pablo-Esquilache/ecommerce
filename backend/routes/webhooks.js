const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Pedido = require('../models/Pedido');

// Validar el retorno de MP (el cliente vuelve de pagar a nuestra tienda)
router.get('/mercadopago/return', async (req, res) => {
    try {
        const status = req.query.status;
        const externalRef = req.query.external_reference; 
        
        if (status === 'success' && externalRef) {
            const pedidoDetails = await Pedido.getById(externalRef);
            // Solo mandamos el email si el Webhook no llegó a procesarlo todavía
            if (pedidoDetails && pedidoDetails.estado !== 'pagado') {
                await Pedido.updateStatus(externalRef, 'pagado');
                const emailService = require('../services/emailService');
                if (pedidoDetails.email) {
                    emailService.enviarCorreoPago(pedidoDetails.email, pedidoDetails).catch(e => console.error('Error email webhook return:', e));
                }
                emailService.enviarCorreoNuevaVentaAdmin(pedidoDetails).catch(e => console.error('Error admin email return:', e));
            }
            // Redirigimos al Frontend limpecito
            return res.redirect('/?pago=exitoso');
        }
        
        // Redirigir al Frontend indicando fallo
        return res.redirect('/?pago=fallido');
    } catch (error) {
        console.error("Error procesando retorno de Mercado Pago:", error);
        res.redirect('/?pago=error');
    }
});

// Endpoint Oficial de Webhooks (POST) - Seguridad Criptográfica
router.post('/mercadopago', async (req, res) => {
    try {
        // En primer lugar, MP exige que respondamos 200 OK inmediatamente
        res.status(200).send('Webhook recibido');

        const queryType = req.query.type || req.query.topic;
        const bodyType = req.body.type || req.body.action;
        const topic = queryType || bodyType;
        const dataId = req.query['data.id'] || (req.body.data && req.body.data.id);

        if (topic === 'payment' && dataId) {
            // --- 1. SEGURIDAD HMAC-SHA256 ---
            const xSignature = req.headers['x-signature'];
            const xRequestId = req.headers['x-request-id'];

            if (xSignature && xRequestId) {
                const tsPart = xSignature.split(',').find(p => p.trim().startsWith('ts='));
                const v1Part = xSignature.split(',').find(p => p.trim().startsWith('v1='));

                if (tsPart && v1Part) {
                    const ts = tsPart.split('=')[1];
                    const v1 = v1Part.split('=')[1];
                    const secret = process.env.MP_WEBHOOK_SECRET;

                    if (secret) {
                        const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
                        const hmac = crypto.createHmac('sha256', secret);
                        const digest = hmac.update(manifest).digest('hex');

                        if (digest !== v1) {
                            console.error('🚨 [Webhooks] ¡ALERTA! Firma de MercadoPago inválida. Posible ataque evadido.');
                            return; // Terminamos la validación sin hacer updates ni emitir correos.
                        }
                    } else {
                        console.warn('⚠️ [Webhooks] MP_WEBHOOK_SECRET no configurado. Validando el pago bajo tu propio riesgo.');
                    }
                }
            }

            // --- 2. CONSULTA Y FULFILLMENT ---
            console.log(`[Webhooks] Verificando pago original ID: ${dataId} en Mercado Pago...`);
            const axios = require('axios');

            try {
                const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
                const response = await axios.get(`https://api.mercadopago.com/v1/payments/${dataId}`, {
                    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
                });

                const paymentInfo = response.data;
                console.log(`[Webhooks] Status Real: ${paymentInfo.status} para la referencia (Pedido ID) ${paymentInfo.external_reference}`);

                if (paymentInfo.status === 'approved' && paymentInfo.external_reference) {
                    const pedidoDetails = await Pedido.getById(paymentInfo.external_reference);
                    // Solo actualizamos y despachamos email si no estaba pagado ya (anti spam return)
                    if (pedidoDetails && pedidoDetails.estado !== 'pagado') {
                        await Pedido.updateStatus(paymentInfo.external_reference, 'pagado');
                        console.log(`[Webhooks] Orden ${paymentInfo.external_reference} marcada como PAGADO.`);
                        
                        const emailService = require('../services/emailService');
                        if (pedidoDetails.email) {
                            emailService.enviarCorreoPago(pedidoDetails.email, pedidoDetails).catch(e => console.error('Error email webhook POST:', e));
                        }
                        emailService.enviarCorreoNuevaVentaAdmin(pedidoDetails).catch(e => console.error('Error admin email POST:', e));
                    }
                }
            } catch(apiError) {
               console.error('Error al chequear status en la API de Mercado Pago:', apiError.message);
            }
        } else {
             console.log("Notificación MP ignorada o no es un pago. Type:", topic);
        }

    } catch (error) {
        console.error("Error crítico en el receptor POST de Webhooks MP:", error);
    }
});

module.exports = router;
