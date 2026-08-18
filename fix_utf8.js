const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix common UTF-8 double-encoding issues
    content = content.replace(/AÃ±adir/g, 'Añadir');
    content = content.replace(/aÃ±adir/g, 'añadir');
    content = content.replace(/CategorÃ­a/g, 'Categoría');
    content = content.replace(/categorÃ­a/g, 'categoría');
    content = content.replace(/CategorÃ­as/g, 'Categorías');
    content = content.replace(/categorÃ­as/g, 'categorías');
    content = content.replace(/SubcategorÃ­a/g, 'Subcategoría');
    content = content.replace(/subcategorÃ­a/g, 'subcategoría');
    content = content.replace(/SubcategorÃ­as/g, 'Subcategorías');
    content = content.replace(/subcategorÃ­as/g, 'subcategorías');
    content = content.replace(/GestiÃ³n/g, 'Gestión');
    content = content.replace(/gestiÃ³n/g, 'gestión');
    content = content.replace(/ConfiguraciÃ³n/g, 'Configuración');
    content = content.replace(/EnvÃ­os/g, 'Envíos');
    content = content.replace(/podÃ©s/g, 'podés');
    content = content.replace(/AtenciÃ³n/g, 'Atención');
    content = content.replace(/FÃ­sico/g, 'Físico');
    content = content.replace(/fÃ­sico/g, 'físico');
    content = content.replace(/automÃ¡ticamente/g, 'automáticamente');
    content = content.replace(/generarÃ¡/g, 'generará');
    content = content.replace(/imÃ¡genes/g, 'imágenes');
    content = content.replace(/podrÃ¡n/g, 'podrán');
    content = content.replace(/serÃ¡/g, 'será');
    content = content.replace(/acciÃ³n/g, 'acción');
    
    // Also the unknown characters if present
    content = content.replace(/A\ufffdadir/g, 'Añadir');
    content = content.replace(/Categor\ufffda/g, 'Categoría');
    content = content.replace(/Categor\ufffdas/g, 'Categorías');
    content = content.replace(/Subcategor\ufffda/g, 'Subcategoría');
    content = content.replace(/Subcategor\ufffdas/g, 'Subcategorías');

    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('frontend/public/admin/index.html');
fixFile('frontend/public/admin/js/admin.js');
