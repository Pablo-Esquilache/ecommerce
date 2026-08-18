const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

const pattern = //// Update datalists[\s\S]*?if \(catList && subcatList\) \{[\s\S]*?\});\s*});\s*}/;

const replacement = `
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
            if (typeof updateSubcategoriesSelect === 'function') {
                updateSubcategoriesSelect();
            }
        }`;
	js = js.replace(pattern, replacement);

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');

