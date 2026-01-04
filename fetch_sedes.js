const pgp = require('pg-promise')();
const db = pgp('postgresql://postgres:postgres@127.0.0.1:5432/provial_db');

db.any('SELECT id, nombre, codigo FROM sede')
    .then(data => {
        console.log(JSON.stringify(data));
        process.exit(0);
    })
    .catch(error => {
        console.error('ERROR:', error);
        process.exit(1);
    });
