const fs = require('fs');
const path = require('path');
const pgp = require('pg-promise')();

const db = pgp({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'provial_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function runMigration() {
  try {
    console.log('📦 Aplicando migración 029: Arquitectura Offline-First...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '029_offline_first_architecture.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Execute migration
    await db.none(sql);

    console.log('✅ Migración 029 aplicada exitosamente\n');

    // Show summary
    console.log('📊 Resumen de cambios:');

    // Verificar tablas creadas
    const tablesCreadas = [
      'incidente_draft',
      'emergencia_draft',
      'asistencia_draft',
      'idempotency_keys'
    ];

    console.log('\n📋 Tablas nuevas:');
    for (const table of tablesCreadas) {
      const count = await db.one(`SELECT COUNT(*) FROM ${table}`, [], r => +r.count);
      console.log(`  ✓ ${table}: ${count} registros`);
    }

    // Verificar modificaciones en situacion_multimedia
    console.log('\n🔧 Columnas agregadas a situacion_multimedia:');
    const columnas = await db.any(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'situacion_multimedia'
        AND column_name IN ('draft_uuid', 'cloudinary_public_id', 'estado', 'upload_attempts', 'last_error', 'uploaded_at')
      ORDER BY column_name
    `);

    for (const col of columnas) {
      console.log(`  ✓ ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    }

    // Verificar vista creada
    console.log('\n👁️  Vistas creadas:');
    const vistasExisten = await db.oneOrNone(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_name = 'v_drafts_pendientes'
    `);
    console.log(`  ✓ v_drafts_pendientes: ${vistasExisten.count > 0 ? 'Creada' : 'Error'}`);

    // Verificar función creada
    console.log('\n⚙️  Funciones creadas:');
    const funcionExiste = await db.oneOrNone(`
      SELECT COUNT(*) as count
      FROM pg_proc
      WHERE proname = 'cleanup_expired_idempotency_keys'
    `);
    console.log(`  ✓ cleanup_expired_idempotency_keys(): ${funcionExiste.count > 0 ? 'Creada' : 'Error'}`);

    console.log('\n✨ Migración completada. Sistema listo para offline-first.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    process.exit(1);
  }
}

runMigration();
