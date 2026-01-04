const pgp = require('pg-promise')();
const db = pgp('postgresql://postgres:postgres@127.0.0.1:5432/provial_db');
const fs = require('fs');

async function fetchData() {
    try {
        const sedes = await db.any('SELECT id, nombre, codigo FROM sede');
        const roles = await db.any('SELECT id, nombre FROM rol');

        fs.writeFileSync('sedes_roles.json', JSON.stringify({ sedes, roles }, null, 2));
        console.log('Saved to sedes_roles.json');
        process.exit(0);
    } catch (error) {
        console.error('ERROR:', error);
        process.exit(1);
    }
}

fetchData();
