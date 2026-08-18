const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

const startIdx = js.indexOf('const url = id ? \\/api/categorias/\\\\ :');
if (startIdx !== -1) {
    js = js.substring(0, startIdx) + const url = id ? '/api/categorias/' + id : '/api/categorias';
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nombre, imagen_url })
        });
        
        if (res.ok) {
            closeCategoriaModal();
            loadCategorias();
        } else {
            const data = await res.json();
            alert(data.error || 'Error al guardar categoría');
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function deleteCategoria(nombre) {
    if (!confirm('¿Seguro que deseas eliminar la categoría \"' + nombre + '\"? Se perderá la relación con los productos.')) return;
    
    try {
        const res = await fetch('/api/categorias/' + encodeURIComponent(nombre), {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer ' + token }
        });
        if (res.ok) loadCategorias();
        else alert('Error al eliminar');
    } catch (error) {
        alert('Error de red');
    }
}

// Subcategorias Modals
function openSubcategoriaModal(categoria_id) {
    document.getElementById('subcategoria_categoria_id').value = categoria_id;
    document.getElementById('subcategoria_nombre').value = '';
    document.getElementById('subcategoriaModal').style.display = 'block';
}

function closeSubcategoriaModal() {
    document.getElementById('subcategoriaModal').style.display = 'none';
}

async function saveSubcategoria() {
    const categoria_id = document.getElementById('subcategoria_categoria_id').value;
    const nombre = document.getElementById('subcategoria_nombre').value;
    if (!nombre) return alert('El nombre es requerido');
    
    try {
        const res = await fetch('/api/categorias/subcategorias', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ nombre, categoria_id })
        });
        
        if (res.ok) {
            closeSubcategoriaModal();
            loadCategorias();
        } else {
            const data = await res.json();
            alert(data.error || 'Error al guardar subcategoría');
        }
    } catch (error) {
        alert('Error de conexión');
    }
}

async function deleteSubcategoria(catNombre, subNombre) {
    alert('Esta función requiere que se obtenga el ID de la subcategoría desde el backend.');
}
;
    fs.writeFileSync('frontend/public/admin/js/admin.js', js);
} else {
    console.log("Could not find start index");
}
