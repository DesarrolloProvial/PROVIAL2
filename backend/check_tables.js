require('dotenv').config();
const pgp = require('pg-promise')();

const dbConfig = {
    connectionString: process.env.DATABASE_URL
};

// Handle SSL for Railway/Production if needed
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('railway.app')) {
    dbConfig.ssl = { rejectUnauthorized: false };
}

const db = pgp(dbConfig);

async function checkTables() {
    try {
        if (!process.env.DATABASE_URL) {
            console.error("❌ ERROR: DATABASE_URL environment variable is missing.");
            console.error("Please run this script with your connection string: 'DATABASE_URL=... node check_tables.js'");
            process.exit(1);
        }

        console.log("Connecting to Database...");
        const version = await db.oneOrNone('SELECT version()');
        console.log(`✅ Connected! Version: ${version ? version.version : 'Unknown'}`);

        console.log("\n🔍 Checking for tables: 'asignaciones_programadas', 'tripulacion_turno'...");

        const tables = await db.any(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('asignaciones_programadas', 'tripulacion_turno')
        `);

        const foundTableNames = tables.map(t => t.table_name);

        console.log("---------------------------------------------------");

        if (foundTableNames.includes('asignaciones_programadas')) {
            console.log("✅ 'asignaciones_programadas' EXISTS.");
        } else {
            console.error("❌ 'asignaciones_programadas' DOES NOT EXIST.");
        }

        if (foundTableNames.includes('tripulacion_turno')) {
            console.log("✅ 'tripulacion_turno' EXISTS.");
        } else {
            console.error("❌ 'tripulacion_turno' DOES NOT EXIST.");
        }

        console.log("---------------------------------------------------");

    } catch (err) {
        console.error("🚨 ERROR:", err.message || err);
    } finally {
        pgp.end();
    }
}

checkTables();
