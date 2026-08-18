const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(/Categorï¿½a/g, "Categoría");
js = js.replace(/categorï¿½a/g, "categoría");
js = js.replace(/conexiï¿½n/g, "conexión");
js = js.replace(/aï¿½adir/g, "añadir");
js = js.replace(/Aï¿½adir/g, "Añadir");
js = js.replace(/categorǟa/g, "categoría");
js = js.replace(/Categorǟa/g, "Categoría");

// Fix Bearer tokens
js = js.replace(/Authorization': Bearer\s*\n/g, "Authorization': Bearer  + token\n");

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
