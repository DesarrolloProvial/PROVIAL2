const { Pool } = require('pg');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida');
    console.error('💡 Asegúrate de tener el archivo .env configurado');
    process.exit(1);
}

console.log('🔗 Conectando a la base de datos...');

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('✅ Conexión establecida');
        console.log('🔄 Iniciando migración: Add estado_nomina to asignacion_unidad\n');

        // Verificar si la columna ya existe
        const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'asignacion_unidad' 
        AND column_name = 'estado_nomina'
    `);

        if (checkColumn.rows.length > 0) {
            console.log('⚠️  La columna estado_nomina ya existe en asignacion_unidad');
            console.log('✅ No se requiere migración\n');
            return;
        }

        console.log('📝 Agregando columna estado_nomina...');

        // Iniciar transacción
        await client.query('BEGIN');

        // 1. Agregar columna con constraint
        await client.query(`
      ALTER TABLE asignacion_unidad 
      ADD COLUMN estado_nomina VARCHAR(20) DEFAULT 'LIBERADA' 
      CHECK (estado_nomina IN ('BORRADOR', 'LIBERADA'))
    `);
        console.log('   ✅ Columna agregada');

        // 2. Actualizar registros existentes
        const updateResult = await client.query(`
      UPDATE asignacion_unidad 
      SET estado_nomina = 'LIBERADA' 
      WHERE estado_nomina IS NULL
    `);
        console.log(`   ✅ ${updateResult.rowCount} registros actualizados`);

        // 3. Crear índice
        await client.query(`
      CREATE INDEX idx_asignacion_unidad_estado_nomina 
      ON asignacion_unidad(estado_nomina)
    `);
        console.log('   ✅ Índice creado');

        // 4. Agregar comentario
        await client.query(`
      COMMENT ON COLUMN asignacion_unidad.estado_nomina IS 
      'Estado de la nómina: BORRADOR (no visible en app móvil) o LIBERADA (visible y notificada)'
    `);
        console.log('   ✅ Comentario agregado');

        // Confirmar transacción
        await client.query('COMMIT');

        console.log('\n🎉 Migración completada exitosamente\n');

        // Verificar resultado
        const verify = await client.query(`
      SELECT 
        estado_nomina,
        COUNT(*) as total
      FROM asignacion_unidad
      GROUP BY estado_nomina
      ORDER BY estado_nomina
    `);

        console.log('📊 Estado actual de asignaciones:');
        if (verify.rows.length === 0) {
            console.log('   (No hay asignaciones en la tabla)');
        } else {
            verify.rows.forEach(row => {
                console.log(`   ${row.estado_nomina}: ${row.total}`);
            });
        }
        console.log('');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error durante la migración:', error.message);
        console.error('\n📋 Detalles del error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar migración
console.log('🚀 Iniciando script de migración...\n');

runMigration()
    .then(() => {
        console.log('✅ Script finalizado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script falló');
        process.exit(1);
    });
