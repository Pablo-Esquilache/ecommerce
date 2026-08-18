const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(/fetch\('\/api\/categorias\/sub'/g, "fetch(API_URL + '/categorias/sub'");
js = js.replace(/Bearer '\s*\+\s*token/g, "Bearer ' + localStorage.getItem('admin_token')");
js = js.replace(/Bearer \s*\+\s*token\s*\+\s*/g, "Bearer  + localStorage.getItem('admin_token') + ");

const target = "const res = await fetch(/api/categorias/, {";
const replacement = "const res = await fetch(API_URL + /categorias/, {";
js = js.replace(target, replacement);

js = js.replace("headers: { 'Authorization': Bearer  }", "headers: { 'Authorization': Bearer  }");

const delSub = 
async function deleteSubcategoria(catNombre, subNombre) {
    if (!confirm('¿Seguro que deseas eliminar la subcategoría "' + subNombre + '"?')) return;
    try {
        const res = await fetch(API_URL + '/categorias/sub/' + encodeURIComponent(subNombre), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('admin_token') }
        });
        if (res.ok) loadCategorias();
        else alert('Error al eliminar subcategoría');
    } catch (e) {
        alert('Error de conexión');
    }
}
;

if (!js.includes('function deleteSubcategoria')) {
    js += delSub;
}

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
