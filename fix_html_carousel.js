const fs = require('fs');
let html = fs.readFileSync('frontend/public/index.html', 'utf8');

// remove inline script for carousel
html = html.replace(/<script>\s*\/\/\s*L[i]gica del Carrusel[\s\S]*?<\/script>/g, '');

fs.writeFileSync('frontend/public/index.html', html, 'utf8');
