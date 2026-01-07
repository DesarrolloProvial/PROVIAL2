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

async function resetOperationalData() {
    const client = await pool.connect();

    try {
        console.log('✅ Conexión establecida');
        console.log('🔄 Iniciando reset de datos operacionales...\n');

        // Iniciar transacción
        await client.query('BEGIN');

        // Mostrar conteo ANTES
        console.log('📊 === CONTEO ANTES DEL RESET ===');
        const beforeCount = await client.query(`
      SELECT 
        'Turnos' as tabla,
        COUNT(*) as registros
      FROM turno
      UNION ALL
      SELECT 'Asignaciones', COUNT(*) FROM asignacion_unidad
      UNION ALL
      SELECT 'Tripulaciones', COUNT(*) FROM tripulacion_turno
      UNION ALL
      SELECT 'Salidas', COUNT(*) FROM salida_unidad
      UNION ALL
      SELECT 'Situaciones', COUNT(*) FROM situacion
      UNION ALL
      SELECT 'Eventos Persistentes', COUNT(*) FROM evento_persistente
      UNION ALL
      SELECT 'Movimientos', COUNT(*) FROM movimiento_unidad
      UNION ALL
      SELECT 'Registros Combustible', COUNT(*) FROM registro_combustible
      UNION ALL
      SELECT 'Avisos', COUNT(*) FROM aviso
      ORDER BY tabla
    `);

        console.table(beforeCount.rows);

        // Eliminar datos operacionales
        console.log('\n🗑️  Eliminando datos operacionales...');

        await client.query('DELETE FROM aviso');
        console.log('   ✅ Avisos eliminados');

        await client.query('DELETE FROM registro_combustible');
        console.log('   ✅ Registros de combustible eliminados');

        await client.query('DELETE FROM movimiento_unidad');
        console.log('   ✅ Movimientos eliminados');

        await client.query('DELETE FROM evento_persistente');
        console.log('   ✅ Eventos persistentes eliminados');

        await client.query('DELETE FROM situacion');
        console.log('   ✅ Situaciones eliminadas');

        await client.query('DELETE FROM salida_unidad');
        console.log('   ✅ Salidas eliminadas');

        await client.query('DELETE FROM tripulacion_turno');
        console.log('   ✅ Tripulaciones eliminadas');

        await client.query('DELETE FROM asignacion_unidad');
        console.log('   ✅ Asignaciones eliminadas');

        await client.query('DELETE FROM turno');
        console.log('   ✅ Turnos eliminados');

        // Limpiar estado de unidades
        const updateResult = await client.query(`
      UPDATE unidad SET
        ultima_ubicacion = NULL,
        ultima_actualizacion_gps = NULL,
        odometro_actual = odometro_inicial,
        combustible_actual = NULL,
        en_servicio = false
      WHERE en_servicio = true OR ultima_ubicacion IS NOT NULL
    `);
        console.log(`   ✅ ${updateResult.rowCount} unidades reseteadas`);

        // Confirmar transacción
        await client.query('COMMIT');

        // Mostrar conteo DESPUÉS
        console.log('\n📊 === CONTEO DESPUÉS DEL RESET ===');
        const afterCount = await client.query(`
      SELECT 
        'Turnos' as tabla,
        COUNT(*) as registros
      FROM turno
      UNION ALL
      SELECT 'Asignaciones', COUNT(*) FROM asignacion_unidad
      UNION ALL
      SELECT 'Tripulaciones', COUNT(*) FROM tripulacion_turno
      UNION ALL
      SELECT 'Salidas', COUNT(*) FROM salida_unidad
      UNION ALL
      SELECT 'Situaciones', COUNT(*) FROM situacion
      UNION ALL
      SELECT 'Eventos Persistentes', COUNT(*) FROM evento_persistente
      UNION ALL
      SELECT 'Movimientos', COUNT(*) FROM movimiento_unidad
      UNION ALL
      SELECT 'Registros Combustible', COUNT(*) FROM registro_combustible
      UNION ALL
      SELECT 'Avisos', COUNT(*) FROM aviso
      ORDER BY tabla
    `);

        console.table(afterCount.rows);

        // Verificar datos maestros
        console.log('\n📊 === DATOS MAESTROS PRESERVADOS ===');
        const masterData = await client.query(`
      SELECT 
        'Usuarios' as tabla,
        COUNT(*) as registros
      FROM usuario
      UNION ALL
      SELECT 'Unidades', COUNT(*) FROM unidad
      UNION ALL
      SELECT 'Rutas', COUNT(*) FROM ruta
      UNION ALL
      SELECT 'Sedes', COUNT(*) FROM sede
      UNION ALL
      SELECT 'Departamentos', COUNT(*) FROM departamento
      ORDER BY tabla
    `);

        console.table(masterData.rows);

        console.log('\n🎉 Reset completado exitosamente');
        console.log('✅ Datos operacionales eliminados');
        console.log('✅ Datos maestros preservados');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('\n❌ Error durante el reset:', error.message);
        console.error('\n📋 Detalles del error:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Ejecutar reset
console.log('🚀 Iniciando script de reset...\n');

resetOperationalData()
    .then(() => {
        console.log('\n✅ Script finalizado exitosamente');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Script falló');
        process.exit(1);
    });
