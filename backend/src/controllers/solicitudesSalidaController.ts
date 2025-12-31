/**
 * Controlador de Solicitudes de Salida y Autorizaciones
 *
 * Maneja el flujo completo de solicitud de salida con consenso de tripulación
 * y aprobaciones manuales por COP u Operaciones
 */

import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Crear solicitud de salida
 * Un brigada solicita sacar la unidad, requiere autorización de toda la tripulación
 */
export async function crearSolicitudSalida(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const usuario = (req as any).user;
        const {
            asignacion_programada_id,
            km_salida,
            combustible_salida,
            combustible_fraccion,
            observaciones
        } = req.body;

        // Validaciones
        if (!asignacion_programada_id) {
            return res.status(400).json({ error: 'El ID de asignación es requerido' });
        }

        if (km_salida === undefined || km_salida === null) {
            return res.status(400).json({ error: 'El kilometraje de salida es requerido' });
        }

        if (combustible_salida === undefined || combustible_salida === null) {
            return res.status(400).json({ error: 'El nivel de combustible es requerido' });
        }

        await client.query('BEGIN');

        // Verificar que la asignación existe y está en estado correcto
        const asignacionCheck = await client.query(
            `SELECT id, estado, unidad_id FROM asignaciones_programadas WHERE id = $1`,
            [asignacion_programada_id]
        );

        if (asignacionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Asignación no encontrada' });
        }

        const asignacion = asignacionCheck.rows[0];

        if (asignacion.estado !== 'PROGRAMADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Esta asignación está en estado ${asignacion.estado}. Solo se pueden crear solicitudes para asignaciones PROGRAMADAS.`
            });
        }

        // Verificar que el usuario es parte de la tripulación
        const tripulacionCheck = await client.query(
            `SELECT id, rol_tripulacion FROM asignaciones_tripulacion
             WHERE asignacion_programada_id = $1 AND usuario_id = $2`,
            [asignacion_programada_id, usuario.id]
        );

        if (tripulacionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No eres parte de la tripulación de esta asignación'
            });
        }

        // Verificar que no haya otra solicitud pendiente
        const solicitudPendienteCheck = await client.query(
            `SELECT id FROM solicitudes_salida
             WHERE asignacion_programada_id = $1
             AND estado = 'PENDIENTE_AUTORIZACION'
             LIMIT 1`,
            [asignacion_programada_id]
        );

        if (solicitudPendienteCheck.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Ya existe una solicitud de salida pendiente de autorización para esta asignación'
            });
        }

        // Crear la solicitud con expiración de 5 minutos
        const solicitudResult = await client.query(
            `INSERT INTO solicitudes_salida (
                asignacion_programada_id,
                solicitante_usuario_id,
                km_salida,
                combustible_salida,
                combustible_fraccion,
                observaciones,
                estado,
                fecha_expiracion
            ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDIENTE_AUTORIZACION', NOW() + INTERVAL '5 minutes')
            RETURNING id, fecha_expiracion`,
            [
                asignacion_programada_id,
                usuario.id,
                km_salida,
                combustible_salida,
                combustible_fraccion || null,
                observaciones || null
            ]
        );

        const solicitudId = solicitudResult.rows[0].id;
        const fechaExpiracion = solicitudResult.rows[0].fecha_expiracion;

        // Actualizar estado de asignación a EN_AUTORIZACION
        await client.query(
            `UPDATE asignaciones_programadas
             SET estado = 'EN_AUTORIZACION'
             WHERE id = $1`,
            [asignacion_programada_id]
        );

        // Registrar en auditoría
        await client.query(
            `SELECT registrar_auditoria_salida(
                'SOLICITUD_INICIADA',
                $1,
                $2,
                $3,
                NULL,
                $4,
                $5,
                $6
            )`,
            [
                usuario.id,
                asignacion_programada_id,
                solicitudId,
                JSON.stringify({ km_salida, combustible_salida }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        await client.query('COMMIT');

        // Obtener tripulación para notificar
        const tripulacion = await client.query(
            `SELECT at.usuario_id, u.nombre, u.apellido, u.placa
             FROM asignaciones_tripulacion at
             JOIN usuarios u ON at.usuario_id = u.id
             WHERE at.asignacion_programada_id = $1`,
            [asignacion_programada_id]
        );

        // TODO: Enviar notificaciones push a todos los tripulantes
        // excepto al solicitante
        const tripulantesANotificar = tripulacion.rows.filter(
            (t: any) => t.usuario_id !== usuario.id
        );

        res.status(201).json({
            message: 'Solicitud de salida creada. Esperando autorización de la tripulación.',
            solicitud_id: solicitudId,
            fecha_expiracion: fechaExpiracion,
            tripulantes_a_autorizar: tripulantesANotificar.length,
            tiempo_limite_minutos: 5
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[SOLICITUDES] Error al crear solicitud:', error);
        res.status(500).json({
            error: 'Error al crear solicitud de salida',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}

/**
 * Autorizar o rechazar una solicitud de salida
 * Cada tripulante debe responder
 */
export async function autorizarSolicitud(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const usuario = (req as any).user;
        const { id } = req.params; // ID de la solicitud
        const { autoriza, observaciones } = req.body;

        if (autoriza === undefined || autoriza === null) {
            return res.status(400).json({
                error: 'Debes indicar si autorizas (true) o rechazas (false) la solicitud'
            });
        }

        await client.query('BEGIN');

        // Verificar que la solicitud existe y está pendiente
        const solicitudCheck = await client.query(
            `SELECT ss.id, ss.asignacion_programada_id, ss.estado, ss.fecha_expiracion,
                    ap.unidad_id
             FROM solicitudes_salida ss
             JOIN asignaciones_programadas ap ON ss.asignacion_programada_id = ap.id
             WHERE ss.id = $1`,
            [id]
        );

        if (solicitudCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const solicitud = solicitudCheck.rows[0];

        if (solicitud.estado !== 'PENDIENTE_AUTORIZACION') {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Esta solicitud ya fue ${solicitud.estado.toLowerCase()}`
            });
        }

        // Verificar si expiró
        if (new Date() > new Date(solicitud.fecha_expiracion)) {
            // Marcar como expirada
            await client.query(
                `UPDATE solicitudes_salida
                 SET estado = 'EXPIRADA', fecha_resolucion = NOW()
                 WHERE id = $1`,
                [id]
            );

            await client.query(
                `UPDATE asignaciones_programadas
                 SET estado = 'PROGRAMADA'
                 WHERE id = $1`,
                [solicitud.asignacion_programada_id]
            );

            await client.query('COMMIT');

            return res.status(400).json({
                error: 'Esta solicitud ya expiró. Deben crear una nueva.'
            });
        }

        // Verificar que el usuario es parte de la tripulación
        const tripulacionCheck = await client.query(
            `SELECT id FROM asignaciones_tripulacion
             WHERE asignacion_programada_id = $1 AND usuario_id = $2`,
            [solicitud.asignacion_programada_id, usuario.id]
        );

        if (tripulacionCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                error: 'No eres parte de la tripulación de esta asignación'
            });
        }

        // Verificar que no haya respondido ya
        const autorizacionExistente = await client.query(
            `SELECT id FROM autorizaciones_tripulacion
             WHERE solicitud_salida_id = $1 AND usuario_id = $2`,
            [id, usuario.id]
        );

        if (autorizacionExistente.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Ya has respondido a esta solicitud'
            });
        }

        // Registrar la autorización
        await client.query(
            `INSERT INTO autorizaciones_tripulacion (
                solicitud_salida_id,
                usuario_id,
                autoriza,
                observaciones,
                ip_address,
                user_agent
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, usuario.id, autoriza, observaciones || null, req.ip, req.headers['user-agent']]
        );

        // Registrar en auditoría
        await client.query(
            `SELECT registrar_auditoria_salida(
                $1,
                $2,
                $3,
                $4,
                NULL,
                $5,
                $6,
                $7
            )`,
            [
                autoriza ? 'AUTORIZACION_RECIBIDA' : 'AUTORIZACION_RECHAZADA',
                usuario.id,
                solicitud.asignacion_programada_id,
                id,
                JSON.stringify({ autoriza, observaciones }),
                req.ip,
                req.headers['user-agent']
            ]
        );

        // Si rechazó, marcar solicitud como rechazada inmediatamente
        if (!autoriza) {
            await client.query(
                `UPDATE solicitudes_salida
                 SET estado = 'RECHAZADA', fecha_resolucion = NOW()
                 WHERE id = $1`,
                [id]
            );

            await client.query(
                `UPDATE asignaciones_programadas
                 SET estado = 'PROGRAMADA'
                 WHERE id = $1`,
                [solicitud.asignacion_programada_id]
            );

            await client.query(
                `SELECT registrar_auditoria_salida(
                    'SALIDA_RECHAZADA',
                    $1,
                    $2,
                    $3,
                    NULL,
                    $4,
                    NULL,
                    NULL
                )`,
                [usuario.id, solicitud.asignacion_programada_id, id, JSON.stringify({ rechazado_por: usuario.id })]
            );

            await client.query('COMMIT');

            return res.json({
                message: 'Solicitud rechazada. La unidad no saldrá.',
                estado: 'RECHAZADA'
            });
        }

        // Si autorizó, verificar si ya todos autorizaron
        const aprobacionAutomatica = await client.query(
            `SELECT verificar_aprobacion_automatica_solicitud($1) as puede_aprobar`,
            [id]
        );

        if (aprobacionAutomatica.rows[0].puede_aprobar) {
            // ¡Todos autorizaron! Crear la salida real
            await aprobarSalidaAutomaticamente(client, parseInt(id), solicitud, req);
        }

        await client.query('COMMIT');

        res.json({
            message: autoriza ? 'Autorización registrada' : 'Rechazo registrado',
            todos_autorizaron: aprobacionAutomatica.rows[0].puede_aprobar,
            estado: aprobacionAutomatica.rows[0].puede_aprobar ? 'APROBADA' : 'PENDIENTE_AUTORIZACION'
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[SOLICITUDES] Error al autorizar:', error);
        res.status(500).json({
            error: 'Error al procesar autorización',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}

/**
 * Aprobar salida manualmente (COP u Operaciones)
 */
export async function aprobarSalidaManualmente(req: Request, res: Response) {
    const client = await pool.connect();

    try {
        const usuario = (req as any).user;
        const { id } = req.params; // ID de la solicitud
        const { tipo_aprobacion } = req.body; // 'COP' o 'OPERACIONES'

        // Verificar permisos
        if (!['COP', 'ADMIN', 'OPERACIONES'].includes(usuario.rol)) {
            return res.status(403).json({
                error: 'No tienes permisos para aprobar salidas manualmente'
            });
        }

        await client.query('BEGIN');

        // Verificar solicitud
        const solicitudCheck = await client.query(
            `SELECT ss.*, ap.unidad_id
             FROM solicitudes_salida ss
             JOIN asignaciones_programadas ap ON ss.asignacion_programada_id = ap.id
             WHERE ss.id = $1`,
            [id]
        );

        if (solicitudCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Solicitud no encontrada' });
        }

        const solicitud = solicitudCheck.rows[0];

        if (solicitud.estado === 'APROBADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Esta solicitud ya fue aprobada' });
        }

        if (solicitud.estado === 'RECHAZADA') {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Esta solicitud fue rechazada' });
        }

        // Aprobar manualmente
        await aprobarSalidaAutomaticamente(client, parseInt(id), solicitud, req, true, usuario.id, tipo_aprobacion || usuario.rol);

        await client.query('COMMIT');

        res.json({
            message: `Salida aprobada manualmente por ${tipo_aprobacion || usuario.rol}`,
            aprobada_por: usuario.nombre + ' ' + usuario.apellido
        });

    } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('[SOLICITUDES] Error al aprobar manualmente:', error);
        res.status(500).json({
            error: 'Error al aprobar salida',
            detalles: error.message
        });
    } finally {
        client.release();
    }
}

/**
 * Función auxiliar para aprobar una salida y crear el registro real
 */
async function aprobarSalidaAutomaticamente(
    client: any,
    solicitudId: number,
    solicitud: any,
    req: Request,
    esManual: boolean = false,
    aprobadorId?: number,
    tipoAprobacion?: string
) {
    // Obtener datos de la asignación y unidad
    const asignacionData = await client.query(
        `SELECT ap.*, u.sede_id
         FROM asignaciones_programadas ap
         JOIN unidades u ON ap.unidad_id = u.id
         WHERE ap.id = $1`,
        [solicitud.asignacion_programada_id]
    );

    const asignacion = asignacionData.rows[0];

    // Crear la salida real
    const salidaResult = await client.query(
        `INSERT INTO salidas (
            unidad_id,
            sede_id,
            fecha_hora_salida,
            km_salida,
            combustible_salida,
            combustible_fraccion,
            observaciones,
            estado,
            ruta_id
        ) VALUES ($1, $2, NOW(), $3, $4, $5, $6, 'ACTIVA', $7)
        RETURNING id`,
        [
            asignacion.unidad_id,
            asignacion.sede_id,
            solicitud.km_salida,
            solicitud.combustible_salida,
            solicitud.combustible_fraccion,
            solicitud.observaciones,
            asignacion.ruta_id
        ]
    );

    const salidaId = salidaResult.rows[0].id;

    // Asociar tripulación a la salida
    await client.query(
        `INSERT INTO salidas_tripulacion (salida_id, usuario_id, rol_tripulacion)
         SELECT $1, usuario_id, rol_tripulacion
         FROM asignaciones_tripulacion
         WHERE asignacion_programada_id = $2`,
        [salidaId, solicitud.asignacion_programada_id]
    );

    // Actualizar solicitud
    await client.query(
        `UPDATE solicitudes_salida
         SET estado = 'APROBADA',
             fecha_resolucion = NOW(),
             salida_id = $1,
             aprobada_manualmente = $2,
             aprobada_por_usuario_id = $3,
             tipo_aprobacion_manual = $4
         WHERE id = $5`,
        [salidaId, esManual, aprobadorId || null, tipoAprobacion || null, solicitudId]
    );

    // Actualizar asignación
    await client.query(
        `UPDATE asignaciones_programadas
         SET estado = 'EN_CURSO',
             salida_id = $1
         WHERE id = $2`,
        [salidaId, solicitud.asignacion_programada_id]
    );

    // Registrar en auditoría
    const eventoAuditoria = esManual
        ? (tipoAprobacion === 'COP' ? 'SALIDA_MANUAL_COP' : 'SALIDA_MANUAL_OPERACIONES')
        : 'SALIDA_APROBADA';

    await client.query(
        `SELECT registrar_auditoria_salida(
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            $8
        )`,
        [
            eventoAuditoria,
            aprobadorId || solicitud.solicitante_usuario_id,
            solicitud.asignacion_programada_id,
            solicitudId,
            salidaId,
            JSON.stringify({ manual: esManual, tipo_aprobacion: tipoAprobacion }),
            req.ip,
            req.headers['user-agent']
        ]
    );
}

/**
 * Listar solicitudes de salida
 */
export async function listarSolicitudes(req: Request, res: Response) {
    try {
        const { estado, asignacion_id } = req.query;

        let query = `SELECT * FROM v_solicitudes_salida_completas WHERE 1=1`;
        const params: any[] = [];
        let paramCounter = 1;

        if (estado) {
            query += ` AND estado = $${paramCounter}`;
            params.push(estado);
            paramCounter++;
        }

        if (asignacion_id) {
            query += ` AND asignacion_programada_id = $${paramCounter}`;
            params.push(asignacion_id);
            paramCounter++;
        }

        query += ` ORDER BY fecha_hora_solicitud DESC`;

        const result = await pool.query(query, params);

        res.json({
            total: result.rows.length,
            solicitudes: result.rows
        });

    } catch (error: any) {
        console.error('[SOLICITUDES] Error al listar:', error);
        res.status(500).json({
            error: 'Error al listar solicitudes',
            detalles: error.message
        });
    }
}

/**
 * Obtener solicitud pendiente para un brigada
 */
export async function obtenerSolicitudPendiente(req: Request, res: Response) {
    try {
        const usuario = (req as any).user;

        const result = await pool.query(
            `SELECT sc.*
             FROM v_solicitudes_salida_completas sc
             JOIN asignaciones_tripulacion at ON at.asignacion_programada_id = sc.asignacion_programada_id
             WHERE at.usuario_id = $1
             AND sc.estado = 'PENDIENTE_AUTORIZACION'
             AND sc.fecha_expiracion > NOW()
             ORDER BY sc.fecha_hora_solicitud DESC
             LIMIT 1`,
            [usuario.id]
        );

        if (result.rows.length === 0) {
            return res.json({ solicitud: null });
        }

        // Verificar si ya respondió
        const miRespuesta = await pool.query(
            `SELECT autoriza, fecha_hora_respuesta
             FROM autorizaciones_tripulacion
             WHERE solicitud_salida_id = $1 AND usuario_id = $2`,
            [result.rows[0].id, usuario.id]
        );

        res.json({
            solicitud: result.rows[0],
            mi_respuesta: miRespuesta.rows.length > 0 ? miRespuesta.rows[0] : null
        });

    } catch (error: any) {
        console.error('[SOLICITUDES] Error al obtener pendiente:', error);
        res.status(500).json({
            error: 'Error al obtener solicitud pendiente',
            detalles: error.message
        });
    }
}
