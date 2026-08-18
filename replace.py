import re

with open('frontend/public/admin/js/admin.js', 'r', encoding='utf-8') as f:
    js = f.read()

pattern = r"// Update datalists.*?if \(catList && subcatList\) \{.*?\}\);\s*\}\);\s*\}"

replacement = """        // Update selects
        const catSelect = document.getElementById('prod-cat');
        const subcatSelect = document.getElementById('prod-subcat');
        if (catSelect && subcatSelect) {
            const currentCatVal = catSelect.value;
            const currentSubVal = subcatSelect.value;
            catSelect.innerHTML = '<option value=\"\">Seleccione...</option>';
            currentCategorias.forEach(cat => {
                catSelect.innerHTML += '<option value=\"' + cat.nombre + '\">' + cat.nombre + '</option>';
            });
            catSelect.value = currentCatVal;
            if (typeof updateSubcategoriesSelect === 'function') {
                updateSubcategoriesSelect();
            }
        }"""

js = re.sub(pattern, replacement, js, flags=re.DOTALL)

with open('frontend/public/admin/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(js)
