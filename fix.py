import sys

with open('frontend/public/admin/js/admin.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix url assignment
content = content.replace(
    r"const url = id ? \/api/categorias/\\ : '/api/categorias';",
    "const url = id ? '/api/categorias/' + id : '/api/categorias';"
)

# Fix bearer token
content = content.replace(r"\Bearer \\", "Bearer ")

# Fix confirm delete categoria
content = content.replace(
    r'if (!confirm(\¿Seguro que deseas eliminar la categoría "\"? Se perderá la relación con los productos.\)) return;',
    "if (!confirm(¿Seguro que deseas eliminar la categoría \"\"? Se perderá la relación con los productos.)) return;"
)

# Fix fetch url delete categoria
content = content.replace(
    r"const res = await fetch(\/api/categorias/\\, {",
    "const res = await fetch(/api/categorias/, {"
)

with open('frontend/public/admin/js/admin.js', 'w', encoding='utf-8') as f:
    f.write(content)
