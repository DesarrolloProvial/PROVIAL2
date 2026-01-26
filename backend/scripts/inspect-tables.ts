
import { db } from '../src/config/database';

async function inspect() {
    try {
        console.log('--- Inspecting Tables ---');
        const tables = await db.any(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name ILIKE '%asistencia%' OR table_name ILIKE '%tipo%')
            ORDER BY table_name
        `);

        if (tables.length === 0) {
            console.log('No tables found matching "asistencia" or "tipo".');
        } else {
            console.log('Found tables:', tables.map(t => t.table_name));

            for (const t of tables) {
                const count = await db.one(`SELECT count(*) FROM "${t.table_name}"`);
                console.log(`Table: ${t.table_name} - Rows: ${count.count}`);

                // Show first row to see structure
                if (parseInt(count.count) > 0) {
                    const first = await db.oneOrNone(`SELECT * FROM "${t.table_name}" LIMIT 1`);
                    console.log(`Structure (${t.table_name}):`, Object.keys(first || {}));
                }
            }
        }

    } catch (error) {
        console.error('Error inspecting:', error);
    } finally {
        process.exit();
    }
}

inspect();
