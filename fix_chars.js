const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(/fetchCategorias\(\);/g, "loadCategorias();");
js = js.replace(/categorǟa/g, "categoría");
js = js.replace(/Categorǟa/g, "Categoría");
js = js.replace(/categorǟas/g, "categorías");
js = js.replace(/Categorǟas/g, "Categorías");

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
