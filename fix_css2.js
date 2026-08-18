const fs = require('fs');
let css = fs.readFileSync('frontend/public/css/style.css', 'utf8');

css = css.replace(/\.hero\s*\{\s*height:\s*60vh;/g, '.hero {\n    height: 50vh;');
css = css.replace(/\.hero\s*\{\s*height:\s*60vh;\s*min-height:\s*400px;\s*\}/g, '.hero {\n    height: 50vh; min-height: 400px; }');
css = css.replace(/margin-top:\s*-60px;\s*\/\*\s*Para que suba un poco sobre el hero\s*\*\//g, 'margin-top: -30px; /* Para que suba un poco sobre el hero */');
css = css.replace(/\.cat-card-img\s*\{\s*width:\s*100%;\s*height:\s*180px;/g, '.cat-card-img {\n    width: 100%;\n    height: 140px;');

fs.writeFileSync('frontend/public/css/style.css', css, 'utf8');
