const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

const replacement = "async function fetchCategorias() {\n" +
    "    try {\n" +
    "        const res = await fetch(${API_URL}/categorias);\n" +
    "        const categorias = await res.json();\n" +
    "        \n" +
    "        const datalist = document.getElementById('categorias-list');\n" +
    "        if (datalist) {\n" +
    "            datalist.innerHTML = '';\n" +
    "            categorias.forEach(cat => {\n" +
    "                const opt = document.createElement('option');\n" +
    "                opt.value = cat.nombre;\n" +
    "                datalist.appendChild(opt);\n" +
    "            });\n" +
    "        }\n" +
    "    } catch(e) { console.error('Error cargando categorias', e); }\n" +
    "}";

js = js.replace(
    /async function fetchCategorias\(\) \{[\s\S]*?\} catch\(e\) \{ console\.error\('Error cargando categorias', e\); \}\n\}/,
    replacement
);

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
