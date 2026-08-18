const fs = require('fs');
let content = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

content = content.replace(
    "const url = id ? \\/api/categorias/\\\\ : '/api/categorias';",
    "const url = id ? '/api/categorias/' + id : '/api/categorias';"
);

content = content.replace(/\\Bearer \\\\/g, "Bearer ");

content = content.replace(
    /if \(!confirm\(\\[^)]+\)\) return;/,
    "if (!confirm(¿Seguro que deseas eliminar la categoría \"\"? Se perderá la relación con los productos.)) return;"
);

content = content.replace(
    "const res = await fetch(\\/api/categorias/\\\\, {",
    "const res = await fetch(/api/categorias/, {"
);

fs.writeFileSync('frontend/public/admin/js/admin.js', content, 'utf8');
