const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

html = html.replace(/Y" Producto Fsico/g, '📦 Producto Físico');
html = html.replace(/Y' Producto Digital \(PDF\/Video\)/g, '💻 Producto Digital (PDF/Video)');
html = html.replace(/Gestin de Pedidos/g, 'Gestión de Pedidos');
html = html.replace(/Categoras/g, 'Categorías');
html = html.replace(/Categora/g, 'Categoría');
html = html.replace(/Subcategoras/g, 'Subcategorías');
html = html.replace(/Subcategora/g, 'Subcategoría');
html = html.replace(/Aadir/g, 'Añadir');
html = html.replace(/Configuracin/g, 'Configuración');
html = html.replace(/Atencin!/g, '¡Atención!');

fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
