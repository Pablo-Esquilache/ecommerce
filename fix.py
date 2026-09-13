import os

path = r'C:\Users\pablo\.gemini\antigravity\brain\b82eb01a-92d0-4a4b-a364-ef4ebb0ae351\manual_despliegue_clientes.md'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix subcategorias drop
content = content.replace('DROP TABLE IF EXISTS "categorias";', 'DROP TABLE IF EXISTS "subcategorias";\nDROP TABLE IF EXISTS "categorias";')

# Fix warning
content = content.replace('-- Eliminamos tablas si existen para poder recrearlas', '-- 🚨 ¡ATENCIÓN! ESTE BLOQUE BORRA TODAS LAS TABLAS Y SUS DATOS.\n-- SOLO EJECUTAR EN BASES DE DATOS NUEVAS/VACÍAS.\n-- Eliminamos tablas si existen para poder recrearlas')

# Re-add CREATE TABLE categorias
create_cat = '''-- Tabla de Categorias
CREATE TABLE "categorias" (
  "id" SERIAL PRIMARY KEY,
  "nombre" VARCHAR(100) UNIQUE NOT NULL,
  "imagen_url" VARCHAR(255)
);

'''
content = content.replace('-- Tabla de Subcategorias', create_cat + '-- Tabla de Subcategorias')

# Fix typos
content = content.replace('el rol  non o public', 'el rol anon o public')
content = content.replace('```sql\\n', '```sql\n')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed via python')
