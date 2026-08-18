const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

// Fix editarProducto
let startEdit = js.indexOf('if (Array.from(catSelect.options).some(opt => opt.value === p.categoria)) {');
if (startEdit !== -1) {
    let before = js.substring(0, startEdit);
    let after = js.substring(startEdit);
    after = after.replace(/if \(Array\.from\(catSelect\.options\)[\s\S]*?\}\s*else\s*\{\s*catSelect\.value = '';\n\s*\}/, "catSelect.value = p.categoria || '';\n        document.getElementById('prod-subcat').value = p.subcategoria || '';");
    js = before + after;
}

// Fix fetchCategorias completely
let startFetch = js.indexOf('async function fetchCategorias() {');
if (startFetch !== -1) {
    let before = js.substring(0, startFetch);
    let after = js.substring(startFetch);
    after = after.replace(/async function fetchCategorias\(\) \{[\s\S]*?\} catch\(e\) \{ console\.error\('Error cargando categorias', e\); \}\n\}/, 
sync function fetchCategorias() {
    try {
        const res = await fetch(\\/categorias\);
        const categorias = await res.json();
        const datalist = document.getElementById('categorias-list');
        if (datalist) {
            datalist.innerHTML = '';
            categorias.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat.nombre;
                datalist.appendChild(opt);
            });
        }
    } catch(e) { console.error('Error cargando categorias', e); }
});
    js = before + after;
}

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
