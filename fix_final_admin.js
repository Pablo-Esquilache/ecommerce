const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

// The problematic string is Y" Producto Fsico, but in JS string literals we can match with regex safely
html = html.replace(/<option value="fisico">.*?Producto.*?<\/option>/g, '<option value="fisico">📦 Producto Físico</option>');
html = html.replace(/<option value="digital">.*?Producto.*?<\/option>/g, '<option value="digital">💻 Producto Digital (PDF/Video)</option>');
html = html.replace(/<h3.*?>Gesti.*?n de Pedidos<\/h3>/g, '<h3 style="margin:0;">Gestión de Pedidos</h3>');

fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
