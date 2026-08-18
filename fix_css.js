const fs = require('fs');
let css = fs.readFileSync('frontend/public/css/style.css', 'utf8');

css = css.replace(/\.hero\s*\{\s*height:\s*100vh;/g, '.hero {\n    height: 60vh;');
css = css.replace(/\.hero\s*\{\s*height:\s*100vh;\s*min-height:\s*400px;\s*\}/g, '.hero { height: 60vh; min-height: 400px; }');
css = css.replace(/\.carousel-bg\.hero-carousel-short\s*\{\s*height:\s*55vh\s*!important;\s*\}/g, '.carousel-bg.hero-carousel-short {\n    height: 100% !important;\n}');

fs.writeFileSync('frontend/public/css/style.css', css, 'utf8');
