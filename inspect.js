const fs = require('fs');
let html = fs.readFileSync('frontend/public/admin/index.html', 'utf8');

const lines = html.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Gesti')) {
        console.log('Gesti on line ' + i + ': ' + lines[i]);
    }
    if (lines[i].includes('fisico">')) {
        console.log('fisico on line ' + i + ': ' + lines[i]);
    }
    if (lines[i].includes('digital">')) {
        console.log('digital on line ' + i + ': ' + lines[i]);
    }
}
