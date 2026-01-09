/**
 * Controlador de Asignaciones
 *
 * Maneja la creación de asignaciones de unidades por parte de Operaciones,
 * incluyendo la tripulación y detalles de la misión.
 * 
 * TABLAS UTILIZADAS:
 * - turno: Un registro por día/sede
 * - asignacion_unidad: Unidad asignada a un turno
 * - tripulacion_turno: Brigadas asignadas a una asignacion_unidad
 */

import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Crear una nueva asignación
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
            sede_id,
            hora_salida,
            hora_entrada_estimada,
            sentido
        } = req.body;

        // Validaciones básicas
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
            (t: any) => t.usuario_id === comandante_usuario_id
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
        const pilotos = tripulacion.filter((t: any) => t.rol_tripulacion === 'PILOTO');
        if (pilotos.length !== 1) {
            return res.status(400).json({
                error: 'Debe haber exactamente un PILOTO en la tripulación'
            });
        }

        await client.query('BEGIN');

        // Verificar que la unidad existe
        const unidadCheck = await client.query(
            `SELECT id, codigo, sede_id FROM unidad WHERE id = $1`,
            [unidad_id]
        );

        if (unidadCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Unidad no encontrada' });
        }

        const sedeIdFinal = sede_id || unidadCheck.rows[0].sede_id;

        // Verificar que no haya otra asignación activa para esta unidad en la misma fecha
        const asignacionActivaCheck = await client.query(
            `SELECT au.id 
             FROM asignacion_unidad au
             JOIN turno t ON au.turno_id = t.id
             WHERE au.unidad_id = $1
             AND t.fecha = $2
             AND t.estado IN ('PLANIFICADO', 'ACTIVO')
             LIMIT 1`,
            [unidad_id, fecha_programada]
        );

        if (asignacionActivaCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Esta unidad ya tiene una asignación para esta fecha.'
            });
        }

        // Verificar que todos los tripulantes existen y son BRIGADA
        for (const t of tripulacion) {
            const usuarioCheck = await client.query(
                `SELECT id, rol_id, nombre_completo FROM usuario WHERE id = $1`,
                [t.usuario_id]
            );

            if (usuarioCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    error: `Usuario con ID ${t.usuario_id} no encontrado`
                });
            }

            // Verificar que el usuario es BRIGADA (rol_id = 3)
            if (usuarioCheck.rows[0].rol_id !== 3) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    error: `El usuario ${usuarioCheck.rows[0].nombre_completo} no es un brigada`
                });
            }

            // Verificar que no tenga otra asignación activa en la misma fecha
            const brigadaAsignacionCheck = await client.query(
                `SELECT au.id, u.codigo as unidad_codigo
                 FROM asignacion_unidad au
                 JOIN tripulacion_turno tt ON tt.asignacion_id = au.id
                 JOIN turno tur ON au.turno_id = tur.id
                 JOIN unidad u ON au.unidad_id = u.id
                 WHERE tt.usuario_id = $1
                 AND tur.fecha = $2
                 AND tur.estado IN ('PLANIFICADO', 'ACTIVO')
                 LIMIT 1`,
                [t.usuario_id, fecha_programada]
            );

            if (brigadaAsignacionCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                const unidadConflicto = brigadaAsignacionCheck.rows[0].unidad_codigo;
                return res.status(400).json({
                    error: `El usuario ${t.usuario_id} ya tiene una asignación en la unidad ${unidadConflicto} para esta fecha`
                });
            }
        }

        // PASO 1: Buscar o crear el TURNO para esta fecha y sede
        let turnoId: number;
        const turnoExistente = await client.query(
            `SELECT id FROM turno WHERE fecha = $1 AND sede_id = $2 LIMIT 1`,
            [fecha_programada, sedeIdFinal]
        );

        if (turnoExistente.rows.length > 0) {
            turnoId = turnoExistente.rows[0].id;
        } else {
            // Verificar que tenemos usuario.userId antes de crear turno
            if (!usuario || !usuario.userId) {
                await client.query('ROLLBACK');
                return res.status(401).json({
                    error: 'No se pudo identificar el usuario autenticado'
                });
            }

            // Crear nuevo turno
            const nuevoTurno = await client.query(
                `INSERT INTO turno (fecha, estado, creado_por, sede_id)
                 VALUES ($1, 'PLANIFICADO', $2, $3)
                 RETURNING id`,
                [fecha_programada, usuario.userId, sedeIdFinal]
            );
            turnoId = nuevoTurno.rows[0].id;
        }

        // PASO 2: Crear la ASIGNACION_UNIDAD
        const asignacionResult = await client.query(
            `INSERT INTO asignacion_unidad (
                turno_id,
                unidad_id,
                ruta_id,
                km_inicio,
                km_final,
                sentido,
                acciones,
                hora_salida,
                hora_entrada_estimada,
                estado_nomina
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'BORRADOR')
            RETURNING id`,
            [
                turnoId,
                unidad_id,
                ruta_id || null,
                recorrido_inicio_km || null,
                recorrido_fin_km || null,
                sentido || null,
                actividades_especificas || null,
                hora_salida || null,
                hora_entrada_estimada || null
            ]
        );

        const asignacionId = asignacionResult.rows[0].id;

        // PASO 3: Insertar TRIPULACION_TURNO
        for (const t of tripulacion) {
            const esComandante = t.usuario_id === comandante_usuario_id;
            await client.query(
                `INSERT INTO tripulacion_turno (
                    asignacion_id,
                    usuario_id,
                    rol_tripulacion,
                    es_comandante
                ) VALUES ($1, $2, $3, $4)`,
                [asignacionId, t.usuario_id, t.rol_tripulacion, esComandante]
            );
        }

        await client.query('COMMIT');

        // Obtener la asignación completa para respuesta
        const asignacionCompleta = await pool.query(
            `SELECT * FROM v_asignaciones_completas WHERE id = $1`,
            [asignacionId]
        );

        res.status(201).json({
            message: 'Asignación creada exitosamente',
            asignacion: asignacionCompleta.rows[0],
            turno_id: turnoId,
            tripulantes_asignados: tripulacion.length
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[ASIGNACIONES] Error al crear asignación:', error);
        res.status(500).json({
            error: 'Error al crear la asignación',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}

/**
 * Listar todas las asignaciones (con filtros)
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
 * Obtener asignación activa de un brigada (para app móvil)
 * Busca en turno + asignacion_unidad + tripulacion_turno
 */
export async function obtenerMiAsignacion(req: Request, res: Response) {
    try {
        const usuario = (req as any).user;

        // Buscar asignación activa del usuario en tripulacion_turno
        // vinculada a un turno activo (PLANIFICADO o ACTIVO)
        const result = await pool.query(
            `SELECT 
                au.id,
                au.id as asignacion_id,
                au.turno_id,
                au.unidad_id,
                u.codigo as unidad_codigo,
                u.tipo_unidad,
                u.marca,
                u.modelo,
                u.placa,
                au.ruta_id,
                r.codigo as ruta_codigo,
                r.nombre as ruta_nombre,
                au.km_inicio,
                au.km_final,
                au.sentido,
                au.acciones as actividades_especificas,
                au.hora_salida,
                au.hora_entrada_estimada,
                au.es_reaccion,
                au.estado_nomina,
                t.fecha as fecha_programada,
                t.estado as turno_estado,
                t.sede_id,
                s.codigo as sede_codigo,
                s.nombre as sede_nombre,
                tt.rol_tripulacion as mi_rol,
                tt.es_comandante,
                CASE
                    WHEN au.hora_entrada_real IS NOT NULL THEN 'FINALIZADA'
                    WHEN au.hora_salida_real IS NOT NULL THEN 'EN_CURSO'
                    ELSE 'PROGRAMADA'
                END AS estado
             FROM tripulacion_turno tt
             JOIN asignacion_unidad au ON tt.asignacion_id = au.id
             JOIN turno t ON au.turno_id = t.id
             JOIN unidad u ON au.unidad_id = u.id
             LEFT JOIN ruta r ON au.ruta_id = r.id
             LEFT JOIN sede s ON t.sede_id = s.id
             WHERE tt.usuario_id = $1
             AND t.estado IN ('PLANIFICADO', 'ACTIVO')
             AND au.hora_entrada_real IS NULL
             ORDER BY t.fecha DESC
             LIMIT 1`,
            [usuario.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: 'No tienes asignación activa'
            });
        }

        const asignacionBase = result.rows[0];

        // Obtener tripulación completa
        const tripulacionQuery = await pool.query(
            `SELECT 
                tt.usuario_id, 
                tt.rol_tripulacion as rol, 
                tt.es_comandante,
                tt.presente,
                usr.nombre_completo as nombre,
                usr.chapa as placa,
                usr.telefono
             FROM tripulacion_turno tt
             JOIN usuario usr ON tt.usuario_id = usr.id
             WHERE tt.asignacion_id = $1`,
            [asignacionBase.id]
        );

        // Encontrar comandante
        const comandante = tripulacionQuery.rows.find((t: any) => t.es_comandante);

        // Construir respuesta que coincida con la interfaz Asignacion del mobile
        const asignacionResponse = {
            // IDs
            id: asignacionBase.id,
            unidad_id: asignacionBase.unidad_id,

            // Unidad - IMPORTANTE: mobile espera 'unidad_tipo' no 'tipo_unidad'
            unidad_codigo: asignacionBase.unidad_codigo,
            unidad_tipo: asignacionBase.tipo_unidad, // Mapear correctamente

            // Fechas
            fecha_programada: asignacionBase.fecha_programada,
            fecha_creacion: asignacionBase.fecha_programada, // Usar fecha programada como creación
            estado: asignacionBase.estado,

            // Ruta
            ruta_id: asignacionBase.ruta_id,
            ruta_nombre: asignacionBase.ruta_nombre,
            ruta_codigo: asignacionBase.ruta_codigo,
            recorrido_inicio_km: asignacionBase.km_inicio,
            recorrido_fin_km: asignacionBase.km_final,

            // Actividades
            actividades_especificas: asignacionBase.actividades_especificas,

            // Comandante
            comandante_usuario_id: comandante?.usuario_id,
            comandante_nombre: comandante?.nombre,
            comandante_placa: comandante?.placa,

            // Tripulación (formato que espera mobile)
            tripulacion: tripulacionQuery.rows.map((t: any) => ({
                usuario_id: t.usuario_id,
                nombre: t.nombre,
                placa: t.placa,
                rol: t.rol,
                notificado: true,  // Asumimos notificado
                vio_notificacion: true,
                acepto: true
            }))
        };

        // IMPORTANTE: Mobile espera { asignacion: ... }
        res.json({ asignacion: asignacionResponse });

    } catch (error: any) {
        console.error('[ASIGNACIONES] Error al obtener mi asignación:', error);
        res.status(500).json({
            error: 'Error al obtener tu asignación',
            detalles: error.message
        });
    }
}

/**
 * Cancelar una asignación
 */
export async function cancelarAsignacion(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const { id } = req.params;
        const { motivo } = req.body;

        await client.query('BEGIN');

        // Verificar que existe la asignación
        const asignacionCheck = await client.query(
            `SELECT au.id, au.turno_id, au.hora_salida_real, au.hora_entrada_real
             FROM asignacion_unidad au
             WHERE au.id = $1`,
            [id]
        );

        if (asignacionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        const asignacion = asignacionCheck.rows[0];

        if (asignacion.hora_salida_real) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'No se puede cancelar una asignación que ya inició'
            });
        }

        // Eliminar tripulación
        await client.query(
            `DELETE FROM tripulacion_turno WHERE asignacion_id = $1`,
            [id]
        );

        // Eliminar asignación
        await client.query(
            `DELETE FROM asignacion_unidad WHERE id = $1`,
            [id]
        );

        // Si el turno quedó sin asignaciones, eliminarlo también
        const turnoVacio = await client.query(
            `SELECT COUNT(*) as count FROM asignacion_unidad WHERE turno_id = $1`,
            [asignacion.turno_id]
        );

        if (parseInt(turnoVacio.rows[0].count) === 0) {
            await client.query(
                `DELETE FROM turno WHERE id = $1`,
                [asignacion.turno_id]
            );
        }

        await client.query('COMMIT');

        res.json({
            message: 'Asignación cancelada exitosamente',
            asignacion_id: id,
            motivo: motivo || 'Sin motivo especificado'
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
