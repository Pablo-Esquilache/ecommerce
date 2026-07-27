const db = require('./config/database');

async function migrateSync() {
    try {
        console.log('Iniciando migración Omnicanal...');
        
        // 1. Columnas en configuración
        await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS sync_activo BOOLEAN DEFAULT FALSE;`);
        await db.query(`ALTER TABLE configuracion ADD COLUMN IF NOT EXISTS sync_api_key VARCHAR(255) DEFAULT '';`);
        
        // 2. Rastreo de estado (si algo se modificó en la web y falta mandarlo al local)
        await db.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS sincronizado_local BOOLEAN DEFAULT FALSE;`);
        await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS sincronizado_local BOOLEAN DEFAULT TRUE;`); 
        // Por defecto TRUE, solo lo pasamos a FALSE si lo editan desde la WEB.

        console.log('✅ Migración DB Exitosa. La nube está lista para conectarse al mundo físico.');
    } catch (e) {
        console.error('❌ Error migrando DB:', e);
    } finally {
        process.exit();
    }
}

migrateSync();
