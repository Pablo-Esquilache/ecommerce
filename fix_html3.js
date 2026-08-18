const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

html = html.replace(/Categora/g, 'Categoría');
html = html.replace(/categora/g, 'categoría');
html = html.replace(/Subcategora/g, 'Subcategoría');
html = html.replace(/subcategora/g, 'subcategoría');
html = html.replace(/Aadir/g, 'Añadir');
html = html.replace(/aadir/g, 'añadir');
html = html.replace(/dlares/g, 'dólares');
html = html.replace(/Y" Producto Fsico/g, '📦 Producto Físico');
html = html.replace(/Y' Producto Digital/g, '💻 Producto Digital');
html = html.replace(//g, ''); // strip any remaining

fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
