const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

const target = \                        <div class="form-group" style="flex:1"><label>Categoría</label>
                            <input type="text" id="prod-cat" list="categorias-list" placeholder="Elige o escribe nueva..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;" required autocomplete="off">
                            <datalist id="categorias-list"></datalist>
                        </div>
                        <div class="form-group" style="flex:1"><label>Subcategoría</label>
                            <input type="text" id="prod-subcat" list="subcategorias-list" placeholder="Opcional..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;" autocomplete="off">
                            <datalist id="subcategorias-list"></datalist>
                        </div>\;

const replacement = \                        <div class="form-group" style="flex:1"><label>Categoría</label>
                            <select id="prod-cat" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:5px;" required>
                                <option value="">Seleccione...</option>
                            </select>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="quick-cat" placeholder="Nueva categoría..." style="flex:1; padding:5px; border:1px solid #ddd; border-radius:4px;">
                                <button type="button" class="btn btn-primary" style="padding:5px 10px;" onclick="quickAddCategoria()"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                        <div class="form-group" style="flex:1"><label>Subcategoría</label>
                            <select id="prod-subcat" style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; margin-bottom:5px;">
                                <option value="">Seleccione...</option>
                            </select>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="quick-subcat" placeholder="Nueva subcategoría..." style="flex:1; padding:5px; border:1px solid #ddd; border-radius:4px;">
                                <button type="button" class="btn btn-primary" style="padding:5px 10px;" onclick="quickAddSubcategoria()"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>\;

// Try an approximate match if exact fails
if (!html.includes('id="prod-cat" list="categorias-list"')) {
    console.log("Could not find the target HTML");
} else {
    // using regex for more flexible match
    html = html.replace(/<div class="form-group" style="flex:1"><label>Categoría<\/label>[\s\S]*?<datalist id="subcategorias-list"><\/datalist>\s*<\/div>/, replacement);
    fs.writeFileSync('frontend/public/admin/index.html', html, 'utf8');
    console.log("HTML updated");
}
