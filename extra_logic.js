// Extra logic
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
    
    subcatSelect.innerHTML = '<option value=\"\">Seleccione...</option>';
    if (!catNombre) return;
    
    const catObj = currentCategorias.find(c => c.nombre === catNombre);
    if (catObj && catObj.subcategorias) {
        catObj.subcategorias.forEach(sub => {
            subcatSelect.innerHTML += '<option value=\"' + sub + '\">' + sub + '</option>';
        });
    }
    
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
            await loadCategorias();
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
            await loadCategorias();
            document.getElementById('prod-cat').value = catNombre;
            updateSubcategoriesSelect();
            document.getElementById('prod-subcat').value = nombre;
            input.value = '';
        } else alert('Error al crear subcategoría');
    } catch(e) { alert('Error de conexión'); }
}
