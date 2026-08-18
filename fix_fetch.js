const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(
    /async function fetchCategorias\(\) \{[\s\S]*?\} catch\(e\) \{ console\.error\('Error cargando categorias', e\); \}\n\}/,
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
}
);

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
