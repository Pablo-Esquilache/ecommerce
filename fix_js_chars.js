const fs = require('fs');
let js = fs.readFileSync('frontend/public/admin/js/admin.js', 'utf8');

js = js.replace(/Gestiǟn/g, 'Gestión');
js = js.replace(/Configuraciǟn/g, 'Configuración');
js = js.replace(/Envǟos/g, 'Envíos');
js = js.replace(/podǟs/g, 'podés');
js = js.replace(/Categorǟas/g, 'Categorías');
js = js.replace(/Subcategorǟas/g, 'Subcategorías');
js = js.replace(/Subcategorǟa/g, 'Subcategoría');
js = js.replace(/Aǟadir/g, 'Añadir');
js = js.replace(/Y"/g, '📦');
js = js.replace(/Y'/g, '💻');
js = js.replace(/Gestin/g, 'Gestión');
js = js.replace(/Gestin/g, 'Gestión');
js = js.replace(/Configuracin/g, 'Configuración');
js = js.replace(/Envos/g, 'Envíos');
js = js.replace(/Categoras/g, 'Categorías');
js = js.replace(/Categora/g, 'Categoría');
js = js.replace(/Subcategoras/g, 'Subcategorías');

fs.writeFileSync('frontend/public/admin/js/admin.js', js, 'utf8');
