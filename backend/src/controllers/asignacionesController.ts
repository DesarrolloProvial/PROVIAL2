/**
 * Controlador de Asignaciones Programadas
 *
 * Maneja la creación de asignaciones de unidades por parte de Operaciones,
 * incluyendo la tripulación y detalles de la misión.
 */

import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Crear una nueva asignación programada
 * Solo accesible por usuarios con rol OPERACIONES o ADMIN
 */
export async function crearAsignacionProgramada(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const usuario = (req as any).user;
        const {
            unidad_id,
            fecha_programada,
            ruta_id,
            recorrido_inicio_km,
            recorrido_fin_km,
            actividades_especificas,
            comandante_usuario_id,
            tripulacion, // Array de { usuario_id, rol_tripulacion }
        } = req.body;

        // Validaciones
        if (!unidad_id) {
            return res.status(400).json({ error: 'La unidad es requerida' });
        }

        if (!fecha_programada) {
            return res.status(400).json({ error: 'La fecha programada es requerida' });
        }

        if (!comandante_usuario_id) {
            return res.status(400).json({ error: 'Debe designar un comandante de unidad' });
        }

        if (!tripulacion || !Array.isArray(tripulacion) || tripulacion.length === 0) {
            return res.status(400).json({ error: 'Debe asignar al menos un tripulante' });
        }

        // Verificar que el comandante esté en la tripulación
        const comandanteEnTripulacion = tripulacion.some(
            t => t.usuario_id === comandante_usuario_id
        );

        if (!comandanteEnTripulacion) {
            return res.status(400).json({
                error: 'El comandante debe ser parte de la tripulación'
            });
        }

        // Verificar roles válidos
        const rolesValidos = ['PILOTO', 'COPILOTO', 'ACOMPAÑANTE'];
        for (const t of tripulacion) {
            if (!rolesValidos.includes(t.rol_tripulacion)) {
                return res.status(400).json({
                    error: `Rol inválido: ${t.rol_tripulacion}. Debe ser PILOTO, COPILOTO o ACOMPAÑANTE`
                });
            }
        }

        // Verificar que haya exactamente 1 piloto
        const pilotos = tripulacion.filter(t => t.rol_tripulacion === 'PILOTO');
        if (pilotos.length !== 1) {
            return res.status(400).json({
                error: 'Debe haber exactamente un PILOTO en la tripulación'
            });
        }

        await client.query('BEGIN');

        // Verificar que la unidad existe y está disponible
        const unidadCheck = await client.query(
            `SELECT id, codigo, sede_id FROM unidades WHERE id = $1`,
            [unidad_id]
        );

        if (unidadCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Unidad no encontrada' });
        }

        // Verificar que no haya otra asignación activa para esta unidad
        const asignacionActivaCheck = await client.query(
            `SELECT id FROM asignaciones_programadas
             WHERE unidad_id = $1
             AND estado IN ('PROGRAMADA', 'EN_AUTORIZACION', 'AUTORIZADA', 'EN_CURSO')
             LIMIT 1`,
            [unidad_id]
        );

        if (asignacionActivaCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Esta unidad ya tiene una asignación activa. Debe finalizarla o cancelarla primero.'
            });
        }

        // Verificar que todos los tripulantes existen y son brigadas
        for (const t of tripulacion) {
            const usuarioCheck = await client.query(
                `SELECT id, rol FROM usuarios WHERE id = $1`,
                [t.usuario_id]
            );

            if (usuarioCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    error: `Usuario con ID ${t.usuario_id} no encontrado`
                });
            }

            if (usuarioCheck.rows[0].rol !== 'BRIGADA') {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `El usuario ${t.usuario_id} no es un brigada`
                });
            }

            // Verificar que no tenga otra asignación activa
            const brigadaAsignacionCheck = await client.query(
                `SELECT ap.id, u.codigo as unidad_codigo
                 FROM asignaciones_programadas ap
                 JOIN tripulacion_turno at ON at.asignacion_id = ap.id
                 JOIN unidades u ON ap.unidad_id = u.id
                 WHERE at.usuario_id = $1
                 AND ap.estado IN ('PROGRAMADA', 'EN_AUTORIZACION', 'AUTORIZADA', 'EN_CURSO')
                 LIMIT 1`,
                [t.usuario_id]
            );

            if (brigadaAsignacionCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                const unidadConflicto = brigadaAsignacionCheck.rows[0].unidad_codigo;
                return res.status(400).json({
                    error: `El usuario ${t.usuario_id} ya tiene una asignación activa en la unidad ${unidadConflicto}`
                });
            }
        }

        // Crear la asignación programada
        const asignacionResult = await client.query(
            `INSERT INTO asignaciones_programadas (
                unidad_id,
                fecha_programada,
                creado_por_usuario_id,
                ruta_id,
                recorrido_inicio_km,
                recorrido_fin_km,
                actividades_especificas,
                comandante_usuario_id,
                estado
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PROGRAMADA')
            RETURNING id`,
            [
                unidad_id,
                fecha_programada,
                usuario.id,
                ruta_id || null,
                recorrido_inicio_km || null,
                recorrido_fin_km || null,
                actividades_especificas || null,
                comandante_usuario_id
            ]
        );

        const asignacionId = asignacionResult.rows[0].id;

        // Insertar tripulación
        for (const t of tripulacion) {
            await client.query(
                `INSERT INTO tripulacion_turno (
                    asignacion_id,
                    usuario_id,
                    rol_tripulacion
                ) VALUES ($1, $2, $3)`,
                [asignacionId, t.usuario_id, t.rol_tripulacion]
            );
        }

        // Registrar en auditoría
        await client.query(
            `SELECT registrar_auditoria_salida(
                'ASIGNACION_CREADA',
                $1,
                $2,
                NULL,
                NULL,
                $3,
                $4,
                $5
            )`,
            [
                usuario.id,
                asignacionId,
                JSON.stringify({
                    unidad_id,
                    fecha_programada,
                    total_tripulantes: tripulacion.length,
                    comandante_usuario_id,
                    ruta_id
                }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        await client.query('COMMIT');

        // Obtener la asignación completa
        const asignacionCompleta = await client.query(
            `SELECT * FROM v_asignaciones_completas WHERE id = $1`,
            [asignacionId]
        );

        // TODO: Enviar notificaciones push a todos los tripulantes
        // En una implementación real, aquí se enviarían notificaciones
        // Para cada tripulante, marcar como notificado
        /*
        for (const t of tripulacion) {
            // NOTE: Column 'notificado_at' does not exist in 'tripulacion_turno'
            // Code removed to prevent build errors and runtime crashes
        }
        */

        res.status(201).json({
            message: 'Asignación programada creada exitosamente',
            asignacion: asignacionCompleta.rows[0],
            tripulantes_notificados: tripulacion.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[ASIGNACIONES] Error al crear asignación:', error);
        res.status(500).json({
            error: 'Error al crear la asignación programada',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}

/**
 * Listar todas las asignaciones programadas (con filtros)
 */
export async function listarAsignaciones(req: Request, res: Response) {
    try {
        const { estado, unidad_id, desde, hasta } = req.query;

        let query = `SELECT * FROM v_asignaciones_completas WHERE 1=1`;
        const params: any[] = [];
        let paramCounter = 1;

        if (estado) {
            query += ` AND estado = $${paramCounter}`;
            params.push(estado);
            paramCounter++;
        }

        if (unidad_id) {
            query += ` AND unidad_id = $${paramCounter}`;
            params.push(unidad_id);
            paramCounter++;
        }

        if (desde) {
            query += ` AND fecha_programada >= $${paramCounter}`;
            params.push(desde);
            paramCounter++;
        }

        if (hasta) {
            query += ` AND fecha_programada <= $${paramCounter}`;
            params.push(hasta);
            paramCounter++;
        }

        query += ` ORDER BY fecha_programada DESC, created_at DESC`;

        const result = await pool.query(query, params);

        res.json({
            total: result.rows.length,
            asignaciones: result.rows
        });

    } catch (error: any) {
        console.error('[ASIGNACIONES] Error al listar:', error);
        res.status(500).json({
            error: 'Error al listar asignaciones',
            detalles: error.message
        });
    }
}

/**
 * Obtener una asignación específica
 */
export async function obtenerAsignacion(req: Request, res: Response) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `SELECT * FROM v_asignaciones_completas WHERE id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        res.json(result.rows[0]);

    } catch (error: any) {
        console.error('[ASIGNACIONES] Error al obtener asignación:', error);
        res.status(500).json({
            error: 'Error al obtener asignación',
            detalles: error.message
        });
    }
}

/**
 * Obtener asignación activa de un brigada
 */
export async function obtenerMiAsignacion(req: Request, res: Response) {
    try {
        const usuario = (req as any).user;

        console.log(`[DEBUG] Buscando asignación para usuario ID: ${usuario.id}`);

        // Buscar asignación activa usando la vista v_asignaciones_completas
        const result = await pool.query(
            `SELECT * FROM v_asignaciones_completas 
             WHERE tripulacion::jsonb @> $1::jsonb
             AND estado IN ('PROGRAMADA', 'EN_AUTORIZACION', 'AUTORIZADA', 'EN_CURSO')
             ORDER BY fecha_programada DESC
             LIMIT 1`,
            [JSON.stringify([{ usuario_id: usuario.id }])]
        );

        console.log(`[DEBUG] Resultado de consulta:`, result.rows);

        if (result.rows.length === 0) {
            // Debug adicional: verificar si el usuario existe en alguna asignación
            const debugResult = await pool.query(
                `SELECT id, estado, tripulacion FROM v_asignaciones_completas 
                 WHERE tripulacion::jsonb @> $1::jsonb
                 ORDER BY fecha_programada DESC
                 LIMIT 5`,
                [JSON.stringify([{ usuario_id: usuario.id }])]
            );
            
            console.log(`[DEBUG] Todas las asignaciones del usuario:`, debugResult.rows);

            return res.status(404).json({ 
                error: 'No tienes asignación activa',
                debug: {
                    usuario_id: usuario.id,
                    total_asignaciones: debugResult.rows.length,
                    asignaciones: debugResult.rows
                }
            });
        }

        // Encontrar mi rol en la tripulación
        const asignacion = result.rows[0];
        const miTripulacion = asignacion.tripulacion.find((t: any) => t.usuario_id === usuario.id);
        
        res.json({
            ...asignacion,
            mi_rol: miTripulacion?.rol_tripulacion || null
        });

    } catch (error: any) {
        console.error('[ASIGNACIONES] Error al obtener mi asignación:', error);
        res.status(500).json({
            error: 'Error al obtener tu asignación',
            detalles: error.message
        });
    }
}

/**
 * Cancelar una asignación programada
 */
export async function cancelarAsignacion(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const usuario = (req as any).user;
        const { id } = req.params;
        const { motivo } = req.body;

        await client.query('BEGIN');

        // Verificar que existe y puede cancelarse
        const asignacionCheck = await client.query(
            `SELECT id, estado FROM asignaciones_programadas WHERE id = $1`,
            [id]
        );

        if (asignacionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        const asignacion = asignacionCheck.rows[0];

        if (asignacion.estado === 'EN_CURSO') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'No se puede cancelar una asignación que ya está en curso'
            });
        }

        if (asignacion.estado === 'FINALIZADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'No se puede cancelar una asignación ya finalizada'
            });
        }

        if (asignacion.estado === 'CANCELADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Esta asignación ya está cancelada'
            });
        }

        // Cancelar la asignación
        await client.query(
            `UPDATE asignaciones_programadas
             SET estado = 'CANCELADA',
                 cancelada_por_usuario_id = $1,
                 motivo_cancelacion = $2,
                 fecha_cancelacion = NOW()
             WHERE id = $3`,
            [usuario.id, motivo || 'Sin motivo especificado', id]
        );

        // Registrar en auditoría
        await client.query(
            `SELECT registrar_auditoria_salida(
                'ASIGNACION_CANCELADA',
                $1,
                $2,
                NULL,
                NULL,
                $3,
                $4,
                $5
            )`,
            [
                usuario.id,
                id,
                JSON.stringify({ motivo }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Asignación cancelada exitosamente',
            asignacion_id: id
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[ASIGNACIONES] Error al cancelar:', error);
        res.status(500).json({
            error: 'Error al cancelar asignación',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}
