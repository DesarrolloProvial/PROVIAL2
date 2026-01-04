import { db } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
    try {
        const sqlPath = path.join('C:', 'Users', 'chris', '.gemini', 'antigravity', 'brain', '4b770e58-e2d0-475c-b1f7-0ddc8e809a81', '034_rbac_tables.sql');
        console.log(`Reading migration file from: ${sqlPath}`);

        if (!fs.existsSync(sqlPath)) {
            console.error('Migration file not found!');
            process.exit(1);
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Executing SQL...');

        await db.none(sql);

        console.log('✅ Migration executed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error executing migration:', error);
        process.exit(1);
    }
}

runMigration();
