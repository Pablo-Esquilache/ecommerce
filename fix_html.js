const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

// Replace corrupted characters
html = html.replace(/Categoras/g, 'Categorías');
html = html.replace(/Categora/g, 'Categoría');
html = html.replace(/subcategoras/g, 'subcategorías');
html = html.replace(/Subcategoras/g, 'Subcategorías');
html = html.replace(/subcategora/g, 'subcategoría');
html = html.replace(/Subcategora/g, 'Subcategoría');
html = html.replace(/Aadir/g, 'Añadir');
html = html.replace(/aadir/g, 'añadir');
html = html.replace(/dlares/g, 'dólares');
html = html.replace(/Fsico/g, 'Físico');
html = html.replace(/fsico/g, 'físico');
html = html.replace(/Y" Producto Fsico/g, '📦 Producto Físico');
html = html.replace(/Y' Producto Digital/g, '💻 Producto Digital');
html = html.replace(/ðŸ’»/g, '💻');
html = html.replace(/ðŸ“¦/g, '📦');
// Any other common ones?
html = html.replace(/Mdulo/g, 'Módulo');
html = html.replace(/ltima/g, 'Última');
html = html.replace(/pestaa/g, 'pestaña');

fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
