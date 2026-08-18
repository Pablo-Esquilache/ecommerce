const db = require('./backend/config/database');
async function run() {
    await db.query("UPDATE categorias SET imagen_url = '/img/categorias/cat_ecommerce_1787004707826.jpg' WHERE nombre = 'Ecommerce'");
    await db.query("UPDATE categorias SET imagen_url = '/img/categorias/cat_patrones_1787004895025.jpg' WHERE nombre = 'Patrones'");
    console.log('DB updated');
    process.exit(0);
}
run();
