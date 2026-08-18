
const fs = require("fs");
let js = fs.readFileSync("frontend/public/admin/js/admin.js", "utf8");

js = js.replace(/fetch\(`\/api\/categorias\/\$\{encodeURIComponent\(nombre\)\}`/, "fetch(`${API_URL}/categorias/${encodeURIComponent(nombre)}`");
js = js.replace(/Bearer \$\{token\}/, "Bearer ${localStorage.getItem(\"admin_token\")}");

fs.writeFileSync("frontend/public/admin/js/admin.js", js, "utf8");

