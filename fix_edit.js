const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(
    /const catSelect = document\.getElementById\('prod-cat'\);\s*\/\/.*?\n\s*if \(Array\.from\(catSelect\.options\)[\s\S]*?catSelect\.value = '';\n\s*\}/,
    "document.getElementById('prod-cat').value = p.categoria || '';\n        document.getElementById('prod-subcat').value = p.subcategoria || '';"
);

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
