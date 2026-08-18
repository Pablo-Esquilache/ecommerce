const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

const regex = /<div class="form-group" style="flex:1"><label>Categor[í\xC3\xAD\xED\u00EDa]a<\/label>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/;

const newHtml = 
                        <div class="form-group" style="flex:1"><label>Categoría</label>
                            <input type="text" id="prod-cat" list="categorias-list" placeholder="Elige o escribe nueva..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;" required autocomplete="off">
                            <datalist id="categorias-list"></datalist>
                        </div>
                        <div class="form-group" style="flex:1"><label>Subcategoría</label>
                            <input type="text" id="prod-subcat" list="subcategorias-list" placeholder="Opcional..." style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;" autocomplete="off">
                            <datalist id="subcategorias-list"></datalist>
                        </div>
                    </div>
;

if (html.match(regex)) {
    html = html.replace(regex, newHtml);
    fs.writeFileSync('frontend/public/admin/index.html', html);
    console.log('Replaced successfully.');
} else {
    console.log('Regex did not match!');
}
