const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');
js = js.replace("await fetch('/api/admin/upload', {", "await fetch(API_URL + '/categorias/upload', {");
fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
