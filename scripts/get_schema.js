const db = require('./config/database');
async function get() {
    try {
        const res = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'productos';");
        console.log("--- PRODUCTOS ---");
        res.rows.forEach(r => console.log(r.column_name + ": " + r.data_type));
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
get();
