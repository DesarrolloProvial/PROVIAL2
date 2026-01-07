import { Request, Response } from 'express';
import { db } from '../config/database';

/**
 * ENDPOINT TEMPORAL PARA MIGRACIÓN
 * DELETE DESPUÉS DE USAR
 * 
 * POST /api/admin/migrate-estado-nomina
 */
export async function migrateEstadoNomina(req: Request, res: Response) {
    try {
        // Solo permitir en producción con una clave secreta
        const secret = req.headers['x-migration-secret'];
        if (secret !== process.env.MIGRATION_SECRET && secret !== 'temp-migration-2026') {
            return res.status(403).json({ error: 'Forbidden' });
        }

        const results: any[] = [];

        // 1. Verificar si la columna ya existe
        const checkColumn = await db.oneOrNone(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'asignacion_unidad' 
        AND column_name = 'estado_nomina'
    `);

        if (checkColumn) {
            return res.json({
                message: 'La columna estado_nomina ya existe',
                status: 'already_exists',
                column: checkColumn
            });
        }

        results.push({ step: 1, message: 'Columna no existe, procediendo con migración' });

        // 2. Agregar columna con constraint
        await db.none(`
      ALTER TABLE asignacion_unidad 
      ADD COLUMN estado_nomina VARCHAR(20) DEFAULT 'LIBERADA' 
      CHECK (estado_nomina IN ('BORRADOR', 'LIBERADA'))
    `);
        results.push({ step: 2, message: 'Columna agregada exitosamente' });

        // 3. Actualizar registros existentes
        const updateResult = await db.result(`
      UPDATE asignacion_unidad 
      SET estado_nomina = 'LIBERADA' 
      WHERE estado_nomina IS NULL
    `);
        results.push({
            step: 3,
            message: `${updateResult.rowCount} registros actualizados`
        });

        // 4. Crear índice
        await db.none(`
      CREATE INDEX IF NOT EXISTS idx_asignacion_unidad_estado_nomina 
      ON asignacion_unidad(estado_nomina)
    `);
        results.push({ step: 4, message: 'Índice creado' });

        // 5. Agregar comentario
        await db.none(`
      COMMENT ON COLUMN asignacion_unidad.estado_nomina IS 
      'Estado de la nómina: BORRADOR (no visible en app móvil) o LIBERADA (visible y notificada)'
    `);
        results.push({ step: 5, message: 'Comentario agregado' });

        // 6. Verificar resultado
        const verify = await db.manyOrNone(`
      SELECT 
        estado_nomina,
        COUNT(*) as total
      FROM asignacion_unidad
      GROUP BY estado_nomina
    `);

        return res.json({
            message: 'Migración completada exitosamente',
            status: 'success',
            results,
            distribution: verify
        });

    } catch (error: any) {
        console.error('Error en migración:', error);
        return res.status(500).json({
            error: 'Error al ejecutar migración',
            message: error.message,
            detail: error.detail
        });
    }
}
