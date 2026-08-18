
const fs = require("fs");
let code = fs.readFileSync("backend/controllers/categoriaController.js", "utf8");
code = code.replace("WHERE nombre = \\$1", "WHERE nombre = $1");
fs.writeFileSync("backend/controllers/categoriaController.js", code, "utf8");

