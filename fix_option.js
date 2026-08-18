const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');
js = js.replace(/<\/\ufffdption>/g, '</option>');
fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
