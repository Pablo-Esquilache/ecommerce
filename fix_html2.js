const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

html = html.replace(/Categora/g, 'Categoría');
html = html.replace(/categora/g, 'categoría');
html = html.replace(/Categoras/g, 'Categorías');
html = html.replace(/categoras/g, 'categorías');
html = html.replace(/Subcategora/g, 'Subcategoría');
html = html.replace(/subcategora/g, 'subcategoría');
html = html.replace(/Subcategoras/g, 'Subcategorías');
html = html.replace(/subcategoras/g, 'subcategorías');
html = html.replace(/Aadir/g, 'Añadir');
html = html.replace(/aadir/g, 'añadir');
html = html.replace(/dlares/g, 'dólares');
html = html.replace(/Fsico/g, 'Físico');
html = html.replace(/fsico/g, 'físico');
html = html.replace(/Y" Producto/g, '📦 Producto');
html = html.replace(/Y' Producto/g, '💻 Producto');

// Some weird strings from user report:
html = html.replace(/Categorï¿½as/g, 'Categorías');
html = html.replace(/ðŸ’»/g, '💻');
html = html.replace(/ðŸ“¦/g, '📦');

fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
