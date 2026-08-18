
const fs = require("fs");
let code = fs.readFileSync("backend/controllers/categoriaController.js", "utf8");

const newFunc = `
exports.deleteSubcategoriaByName = async (req, res) => {
    try {
        const { nombre } = req.params;
        await db.query("DELETE FROM subcategorias WHERE nombre = \\$1", [nombre]);
        res.json({ message: "Subcategoría eliminada" });
    } catch (error) {
        res.status(500).json({ error: "Error interno" });
    }
};
`;

code = code.replace(/\\$1/g, "$1");

if(!code.includes("deleteSubcategoriaByName")) {
    code += newFunc.replace(/\\$1/, "$1");
    fs.writeFileSync("backend/controllers/categoriaController.js", code, "utf8");
}

