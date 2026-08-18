const fs = require('fs');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Fix common UTF-8 double-encoding issues
    content = content.replace(/ðŸ’»/g, '💻');
    content = content.replace(/ðŸ“¦/g, '📦');
    content = content.replace(/Â¿EstÃ¡s/g, '¿Estás');
    content = content.replace(/Ã¡/g, 'á');
    content = content.replace(/Ã©/g, 'é');
    content = content.replace(/Ã­/g, 'í');
    content = content.replace(/Ã³/g, 'ó');
    content = content.replace(/Ãº/g, 'ú');
    content = content.replace(/Ã±/g, 'ñ');
    content = content.replace(/Ã‘/g, 'Ñ');
    content = content.replace(/Â¡/g, '¡');

    fs.writeFileSync(filePath, content, 'utf8');
}

fixFile('frontend/public/admin/index.html');
fixFile('frontend/public/admin/js/admin.js');
