const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace('headers: { \'Authorization\': \Bearer \\ }', "headers: { 'Authorization': \Bearer \\ }");
js = js.replace('const res = await fetch(\/api/categorias/\\', "const res = await fetch(\\/categorias/\\");

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
