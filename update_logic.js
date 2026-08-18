const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

// Replace the datalists update block inside loadCategorias()
const target = \
        // Update datalists
        const catList = document.getElementById('categorias-list');
        const subcatList = document.getElementById('subcategorias-list');
        if (catList && subcatList) {
            catList.innerHTML = '';
            subcatList.innerHTML = '';
            currentCategorias.forEach(cat => {
                catList.innerHTML += '<option value="' + cat.nombre + '">';
                cat.subcategorias.forEach(sub => {
                    subcatList.innerHTML += '<option value="' + sub + '">';
                });
            });
        }
\;

const replacement = \
        // Update selects
        const catSelect = document.getElementById('prod-cat');
        const subcatSelect = document.getElementById('prod-subcat');
        if (catSelect && subcatSelect) {
            const currentCatVal = catSelect.value;
            const currentSubVal = subcatSelect.value;
            
            catSelect.innerHTML = '<option value="">Seleccione...</option>';
            currentCategorias.forEach(cat => {
                catSelect.innerHTML += '<option value="' + cat.nombre + '">' + cat.nombre + '</option>';
            });
            catSelect.value = currentCatVal;
            
            // Subcategories are filled when category changes, or we can just fill all for simplicity?
            // Since it's a select, it's better to filter by selected category
            updateSubcategoriesSelect();
        }
\;

js = js.replace(target, replacement);

const extraLogic = \
// Add event listener to prod-cat to update prod-subcat
document.addEventListener('DOMContentLoaded', () => {
    const catSelect = document.getElementById('prod-cat');
    if (catSelect) {
        catSelect.addEventListener('change', updateSubcategoriesSelect);
    }
});

function updateSubcategoriesSelect() {
    const catSelect = document.getElementById('prod-cat');
    const subcatSelect = document.getElementById('prod-subcat');
    if (!catSelect || !subcatSelect) return;
    
    const catNombre = catSelect.value;
    const currentSubVal = subcatSelect.value;
    
    subcatSelect.innerHTML = '<option value="">Seleccione...</option>';
    if (!catNombre) return;
    
    const catObj = currentCategorias.find(c => c.nombre === catNombre);
    if (catObj && catObj.subcategorias) {
        catObj.subcategorias.forEach(sub => {
            subcatSelect.innerHTML += '<option value="' + sub + '">' + sub + '</option>';
        });
    }
    
    // try to restore value
    if (Array.from(subcatSelect.options).some(o => o.value === currentSubVal)) {
        subcatSelect.value = currentSubVal;
    }
}

async function quickAddCategoria() {
    const input = document.getElementById('quick-cat');
    const nombre = input.value.trim();
    if (!nombre) return alert('Escribe el nombre de la categoría');
    try {
        const res = await fetch(API_URL + '/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('admin_token') },
            body: JSON.stringify({ nombre })
        });
        if (res.ok) {
            await loadCategorias(); // this updates currentCategorias and selects
            document.getElementById('prod-cat').value = nombre;
            updateSubcategoriesSelect();
            input.value = '';
        } else alert('Error al crear categoría');
    } catch(e) { alert('Error de conexión'); }
}

async function quickAddSubcategoria() {
    const catSelect = document.getElementById('prod-cat');
    const catNombre = catSelect.value;
    if (!catNombre) return alert('Primero selecciona una categoría padre');
    
    const catObj = currentCategorias.find(c => c.nombre === catNombre);
    if (!catObj) return;

    const input = document.getElementById('quick-subcat');
    const nombre = input.value.trim();
    if (!nombre) return alert('Escribe el nombre de la subcategoría');
    
    try {
        const res = await fetch(API_URL + '/categorias/sub', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('admin_token') },
            body: JSON.stringify({ nombre, categoria_id: catObj.id })
        });
        if (res.ok) {
            await loadCategorias(); // refreshes tree
            document.getElementById('prod-cat').value = catNombre;
            updateSubcategoriesSelect();
            document.getElementById('prod-subcat').value = nombre;
            input.value = '';
        } else alert('Error al crear subcategoría');
    } catch(e) { alert('Error de conexión'); }
}
\;

if (!js.includes('function quickAddCategoria')) {
    js += extraLogic;
}

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
console.log("Updated admin.js with select logic");
