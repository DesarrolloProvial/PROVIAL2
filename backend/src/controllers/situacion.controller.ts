import { Request, Response } from 'express';
import { SituacionModel, DetalleSituacionModel } from '../models/situacion.model';
import { TurnoModel } from '../models/turno.model';
import { UsuarioModel } from '../models/usuario.model';
import { SalidaModel } from '../models/salida.model';
import { UbicacionBrigadaModel } from '../models/ubicacionBrigada.model';
import { db } from '../config/database';
import {
  emitSituacionNueva,
  emitSituacionActualizada,
  emitSituacionCerrada,
  SituacionEvent,
} from '../services/socket.service';

// ========================================
// HELPERS
// ========================================

/**
 * Obtener IDs de unidades que el usuario puede ver según su sede
 */
async function getUnidadesPermitidas(userId: number, rol: string): Promise<number[] | null> {
  // COP, ADMIN y OPERACIONES pueden ver todas las unidades
  if (rol === 'COP' || rol === 'ADMIN' || rol === 'OPERACIONES') {
    return null; // null = todas las unidades
  }

  // Obtener usuario con su sede
  const usuario = await UsuarioModel.findById(userId);

  if (!usuario || !usuario.sede_id) {
    return []; // Sin sede = no puede ver ninguna unidad
  }

  // Obtener unidades de la misma sede
  const result = await db.manyOrNone(
    'SELECT id FROM unidad WHERE sede_id = $1 AND activa = true',
    [usuario.sede_id]
  );

  return result.map((r: any) => r.id);
}

// ========================================
// CREAR SITUACIÓN
// ========================================

export async function createSituacion(req: Request, res: Response) {
  try {
    console.log('📥 [CONTROLLER] Recibiendo solicitud de creación de situación');
    console.log('📥 [CONTROLLER] Body completo:', JSON.stringify(req.body, null, 2));
    console.log('📥 [CONTROLLER] Usuario:', req.user?.userId, req.user?.rol);

    const {
      tipo_situacion,
      unidad_id,
      salida_unidad_id,
      turno_id,
      asignacion_id,
      ruta_id,
      km,
      sentido,
      latitud,
      longitud,
      ubicacion_manual,
      combustible,
      combustible_fraccion,
      kilometraje_unidad,
      tripulacion_confirmada,
      descripcion,
      observaciones,
      incidente_id,
      detalles, // Array opcional de detalles
      // Nuevos campos
      tipo_situacion_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
    } = req.body;

    const userId = req.user!.userId;
    console.log('📥 [CONTROLLER] Campos extraídos correctamente');

    // Si es un brigada, siempre buscar su asignación
    let unidadFinal = unidad_id;
    let turnoFinal = turno_id;
    let asignacionFinal = asignacion_id;
    let rutaFinal = ruta_id;

    if (req.user!.rol === 'BRIGADA') {
      // Primero verificar si tiene una ubicación activa (préstamo, división, etc.)
      const ubicacionActual = await UbicacionBrigadaModel.getUbicacionActual(userId);

      if (ubicacionActual) {
        // El brigada tiene un registro de ubicación activo
        switch (ubicacionActual.estado) {
          case 'EN_PUNTO_FIJO':
            // No puede crear situaciones normales desde punto fijo
            return res.status(403).json({
              error: 'No puedes crear situaciones desde un punto fijo',
              message: 'Estás en un punto fijo sin unidad. Solo puedes agregar información a situaciones persistentes.',
              estado: ubicacionActual.estado,
              situacion_persistente_id: ubicacionActual.situacion_persistente_id
            });

          case 'PRESTADO':
            // Usar la unidad donde está prestado, no la original
            unidadFinal = ubicacionActual.unidad_actual_id;
            // Obtener datos de la asignación de la unidad destino
            const asignacionDestino = await db.oneOrNone(`
              SELECT a.id, a.turno_id, a.ruta_id, a.ruta_activa_id
              FROM asignacion_unidad a
              JOIN turno t ON a.turno_id = t.id
              WHERE a.unidad_id = $1
                AND t.fecha = CURRENT_DATE
                AND a.estado IN ('INICIADA', 'LISTA')
              LIMIT 1
            `, [ubicacionActual.unidad_actual_id]);
            if (asignacionDestino) {
              turnoFinal = asignacionDestino.turno_id;
              asignacionFinal = asignacionDestino.id;
              if (!rutaFinal) {
                rutaFinal = asignacionDestino.ruta_activa_id || asignacionDestino.ruta_id;
              }
            }
            break;

          case 'CON_UNIDAD':
          default:
            // Usar la asignación normal
            const miAsignacionUbicacion = await TurnoModel.getMiAsignacionHoy(userId);
            if (miAsignacionUbicacion) {
              unidadFinal = miAsignacionUbicacion.unidad_id;
              turnoFinal = miAsignacionUbicacion.turno_id;
              asignacionFinal = miAsignacionUbicacion.asignacion_id;
              if (!rutaFinal && miAsignacionUbicacion.ruta_id) {
                rutaFinal = miAsignacionUbicacion.ruta_id;
              }
            }
            break;
        }
      } else {
        // Sin registro de ubicación, usar flujo normal de asignación
        const miAsignacion = await TurnoModel.getMiAsignacionHoy(userId);
        if (miAsignacion) {
          // Si el brigada proporciona unidad_id, validar que sea su unidad asignada
          if (unidad_id && unidad_id !== miAsignacion.unidad_id) {
            return res.status(403).json({
              error: 'No tienes autorización para crear situaciones en esta unidad',
              tu_unidad: miAsignacion.unidad_codigo
            });
          }
          unidadFinal = miAsignacion.unidad_id;
          turnoFinal = miAsignacion.turno_id;
          asignacionFinal = miAsignacion.asignacion_id;
          // Usar ruta asignada si no se proporciona ruta_id
          if (!rutaFinal && miAsignacion.ruta_id) {
            rutaFinal = miAsignacion.ruta_id;
          }
        } else if (!unidad_id) {
          return res.status(400).json({
            error: 'No tienes asignación para hoy',
            message: 'Contacta a Operaciones para que te asignen a una unidad.'
          });
        }
      }
    }

    // Validar que tengamos unidad_id
    if (!unidadFinal) {
      return res.status(400).json({ error: 'unidad_id es requerido' });
    }

    // VALIDACIÓN OBLIGATORIA: ruta_id es requerido para todas las situaciones
    // Si no se proporcionó ruta, intentar obtenerla de la asignación
    if (!rutaFinal && asignacionFinal) {
      const asignacion = await db.oneOrNone(
        'SELECT ruta_activa_id, ruta_id FROM asignacion_unidad WHERE id = $1',
        [asignacionFinal]
      );
      if (asignacion) {
        rutaFinal = asignacion.ruta_activa_id || asignacion.ruta_id;
      }
    }

    if (!rutaFinal) {
      return res.status(400).json({
        error: 'ruta_id es requerido',
        message: 'No se puede crear una situación sin una ruta asignada. Verifica tu asignación o solicita que te asignen una ruta.'
      });
    }

    // IMPORTANTE: Cerrar situación activa anterior de esta unidad
    // Solo puede haber UNA situación activa por unidad a la vez
    const situacionAnterior = await db.oneOrNone(
      `SELECT id, uuid, tipo_situacion, unidad_id, ruta_id, km, latitud, longitud, estado
       FROM situacion
       WHERE unidad_id = $1 AND estado = 'ACTIVA'
       ORDER BY created_at DESC LIMIT 1`,
      [unidadFinal]
    );

    if (situacionAnterior) {
      // Cerrar la situación anterior
      await SituacionModel.cerrar(
        situacionAnterior.id,
        userId,
        `Cerrada automáticamente al iniciar ${tipo_situacion}`
      );

      // Emitir evento de cierre por WebSocket
      const unidadInfo = await db.oneOrNone(
        'SELECT codigo FROM unidad WHERE id = $1',
        [unidadFinal]
      );

      const eventoCierre: SituacionEvent = {
        id: situacionAnterior.id,
        uuid: situacionAnterior.uuid,
        tipo_situacion: situacionAnterior.tipo_situacion,
        unidad_id: situacionAnterior.unidad_id,
        unidad_codigo: unidadInfo?.codigo || `U-${unidadFinal}`,
        ruta_codigo: null,
        km: situacionAnterior.km,
        latitud: situacionAnterior.latitud,
        longitud: situacionAnterior.longitud,
        estado: 'CERRADA',
        sede_id: null,
      };
      emitSituacionCerrada(eventoCierre);

      console.log(`📍 Situación anterior ${situacionAnterior.tipo_situacion} (ID: ${situacionAnterior.id}) cerrada automáticamente`);
    }

    // IMPORTANTE: Buscar salida activa de la unidad si no se proporciona
    let salidaFinal = salida_unidad_id;
    if (!salidaFinal && unidadFinal) {
      const salidaActiva = await db.oneOrNone(
        `SELECT id FROM salida_unidad WHERE unidad_id = $1 AND estado = 'EN_SALIDA' LIMIT 1`,
        [unidadFinal]
      );
      if (salidaActiva) {
        salidaFinal = salidaActiva.id;
        console.log(`📍 Vinculando situación a salida activa ID: ${salidaFinal}`);
      }
    }

    // Crear la situación
    const dataToCreate = {
      tipo_situacion,
      unidad_id: unidadFinal,
      salida_unidad_id: salidaFinal,
      turno_id: turnoFinal,
      asignacion_id: asignacionFinal,
      ruta_id: rutaFinal,
      km,
      sentido,
      latitud,
      longitud,
      ubicacion_manual,
      combustible,
      combustible_fraccion,
      kilometraje_unidad,
      tripulacion_confirmada,
      descripcion,
      observaciones,
      incidente_id,
      creado_por: userId,
      // Nuevos campos
      tipo_situacion_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
    };

    console.log('💾 [CONTROLLER] Datos para crear situación:', JSON.stringify(dataToCreate, null, 2));
    const situacion = await SituacionModel.create(dataToCreate);
    console.log('✅ [CONTROLLER] Situación creada exitosamente:', situacion.id);

    // Agregar detalles si fueron proporcionados
    if (detalles && Array.isArray(detalles)) {
      for (const detalle of detalles) {
        await DetalleSituacionModel.create({
          situacion_id: situacion.id,
          tipo_detalle: detalle.tipo_detalle,
          datos: detalle.datos,
          creado_por: userId,
        });
      }
    }

    // Obtener la situación completa para devolver
    const situacionCompleta = await SituacionModel.getById(situacion.id);

    // Emitir evento WebSocket para tiempo real
    if (situacionCompleta) {
      const sc = situacionCompleta as any;
      const evento: SituacionEvent = {
        id: sc.id,
        uuid: sc.uuid,
        tipo_situacion: sc.tipo_situacion,
        unidad_id: sc.unidad_id,
        unidad_codigo: sc.unidad_codigo || `U-${sc.unidad_id}`,
        ruta_codigo: sc.ruta_codigo,
        km: sc.km,
        latitud: sc.latitud,
        longitud: sc.longitud,
        estado: sc.estado,
        sede_id: sc.sede_id,
      };
      emitSituacionNueva(evento);
    }

    return res.status(201).json({
      message: 'Situación creada exitosamente',
      situacion: situacionCompleta,
    });
  } catch (error: any) {
    console.error('❌ [CONTROLLER] Error en createSituacion:', error);
    console.error('❌ [CONTROLLER] Error stack:', error.stack);
    console.error('❌ [CONTROLLER] Error message:', error.message);
    console.error('❌ [CONTROLLER] Error detail:', error.detail);
    console.error('❌ [CONTROLLER] Error code:', error.code);
    return res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      detail: error.detail || error.toString(),
      code: error.code
    });
  }
}

// ========================================
// OBTENER SITUACIÓN POR ID/UUID
// ========================================

export async function getSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let situacion;
    let situacionId: number;

    // Intentar obtener por UUID primero, luego por ID
    if (id.includes('-')) {
      situacion = await SituacionModel.getByUuid(id);
      if (!situacion) {
        return res.status(404).json({ error: 'Situación no encontrada' });
      }
      situacionId = situacion.id;
    } else {
      situacionId = parseInt(id, 10);
      situacion = await SituacionModel.getById(situacionId);
    }

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    // Obtener detalles adicionales (vehículos, grúas, ajustadores, etc.)
    const detalles = await DetalleSituacionModel.getBySituacionId(situacionId);

    // Organizar detalles por tipo
    const detallesOrganizados = {
      vehiculos: detalles.filter(d => d.tipo_detalle === 'VEHICULO').map(d => d.datos),
      gruas: detalles.filter(d => d.tipo_detalle === 'GRUA').map(d => d.datos),
      ajustadores: detalles.filter(d => d.tipo_detalle === 'AJUSTADOR').map(d => d.datos),
      autoridades_socorro: detalles.find(d => d.tipo_detalle === 'AUTORIDADES_SOCORRO')?.datos,
      danios: detalles.find(d => d.tipo_detalle === 'DANIOS')?.datos,
      subtipo: detalles.find(d => d.tipo_detalle === 'SUBTIPO')?.datos,
    };

    return res.json({
      situacion: { ...situacion, detalles: detallesOrganizados },
    });
  } catch (error) {
    console.error('Error en getSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// LISTAR SITUACIONES
// ========================================

export async function listSituaciones(req: Request, res: Response) {
  try {
    const {
      unidad_id,
      turno_id,
      tipo_situacion,
      estado,
      fecha_desde,
      fecha_hasta,
      activas_solo,
      limit,
      offset,
    } = req.query;

    const filters: any = {};

    if (unidad_id) filters.unidad_id = parseInt(unidad_id as string, 10);
    if (turno_id) filters.turno_id = parseInt(turno_id as string, 10);
    if (tipo_situacion) filters.tipo_situacion = tipo_situacion as string;
    if (estado) filters.estado = estado as string;
    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    // Aplicar filtro de sede para usuarios que no sean COP/ADMIN
    const unidadesPermitidas = await getUnidadesPermitidas(req.user!.userId, req.user!.rol);

    let situaciones;

    if (activas_solo === 'true') {
      situaciones = await SituacionModel.getActivas(filters);
    } else {
      situaciones = await SituacionModel.list(filters);
    }

    // Filtrar situaciones por unidades permitidas
    if (unidadesPermitidas !== null) {
      situaciones = situaciones.filter((s: any) => unidadesPermitidas.includes(s.unidad_id));
    }

    return res.json({ situaciones, count: situaciones.length });
  } catch (error) {
    console.error('Error en listSituaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// SITUACIONES DE MI UNIDAD HOY (APP MÓVIL)
// ========================================

export async function getMiUnidadHoy(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    // Obtener asignación del usuario
    const miAsignacion = await TurnoModel.getMiAsignacionHoy(userId);

    if (!miAsignacion) {
      return res.json({
        message: 'No tienes asignación para hoy',
        situaciones: [],
      });
    }

    // Obtener salida activa para filtrar situaciones
    const miSalida = await SalidaModel.getMiSalidaActiva(userId);

    // Obtener situaciones de la unidad (filtrando por salida si existe)
    const situaciones = await SituacionModel.getMiUnidadHoy(
      miAsignacion.unidad_id,
      miSalida?.salida_id
    );

    return res.json({ situaciones, asignacion: miAsignacion });
  } catch (error) {
    console.error('Error en getMiUnidadHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// BITÁCORA DE UNIDAD
// ========================================

export async function getBitacoraUnidad(req: Request, res: Response) {
  try {
    const { unidad_id } = req.params;
    const { fecha_desde, fecha_hasta, limit } = req.query;

    const filters: any = {};

    if (fecha_desde) filters.fecha_desde = new Date(fecha_desde as string);
    if (fecha_hasta) filters.fecha_hasta = new Date(fecha_hasta as string);
    if (limit) filters.limit = parseInt(limit as string, 10);

    const bitacora = await SituacionModel.getBitacoraUnidad(parseInt(unidad_id, 10), filters);

    return res.json({ bitacora, count: bitacora.length });
  } catch (error) {
    console.error('Error en getBitacoraUnidad:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MAPA - ÚLTIMA SITUACIÓN POR UNIDAD
// ========================================

export async function getMapaSituaciones(req: Request, res: Response) {
  try {
    // Aplicar filtro de sede para usuarios que no sean COP/ADMIN
    const unidadesPermitidas = await getUnidadesPermitidas(req.user!.userId, req.user!.rol);

    let unidades = await SituacionModel.getUltimaSituacionPorUnidad();

    // Filtrar unidades por sede si es necesario
    if (unidadesPermitidas !== null) {
      unidades = unidades.filter((u: any) => unidadesPermitidas.includes(u.unidad_id));
    }

    return res.json({ unidades, count: unidades.length });
  } catch (error) {
    console.error('Error en getMapaSituaciones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR SITUACIÓN
// ========================================

export async function updateSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const situacionId = parseInt(id, 10);

    const {
      tipo_situacion,
      estado,
      ruta_id,
      km,
      sentido,
      latitud,
      longitud,
      combustible,
      combustible_fraccion,
      kilometraje_unidad,
      descripcion,
      observaciones,
      // Datos adicionales
      vehiculos,
      gruas,
      ajustadores,
      // Estructura legacy (campos planos)
      autoridadesSeleccionadas: autoridadesLegacy,
      detallesAutoridades: detallesAutoridadesLegacy,
      socorroSeleccionados: socorroLegacy,
      detallesSocorro: detallesSocorroLegacy,
      danios_materiales: daniosMaterialesLegacy,
      danios_infraestructura: daniosInfraLegacy,
      descripcion_danios_infra: descripcionDaniosLegacy,
      // Nueva estructura (objetos anidados)
      autoridades_socorro,
      danios,
      tipoIncidente,
      subtipo_situacion,
      // Nuevos campos
      tipo_situacion_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
    } = req.body;

    // Normalizar datos: soportar estructura nueva y legacy
    const autoridadesSeleccionadas = autoridades_socorro?.autoridades || autoridadesLegacy;
    const detallesAutoridades = autoridades_socorro?.detalles_autoridades || detallesAutoridadesLegacy;
    const socorroSeleccionados = autoridades_socorro?.socorro || socorroLegacy;
    const detallesSocorro = autoridades_socorro?.detalles_socorro || detallesSocorroLegacy;

    const danios_materiales = danios?.materiales ?? daniosMaterialesLegacy;
    const danios_infraestructura = danios?.infraestructura ?? daniosInfraLegacy;
    const descripcion_danios_infra = danios?.descripcion_infra || descripcionDaniosLegacy;

    const situacion = await SituacionModel.update(situacionId, {
      tipo_situacion,
      estado,
      ruta_id,
      km,
      sentido,
      latitud,
      longitud,
      combustible,
      combustible_fraccion,
      kilometraje_unidad,
      descripcion,
      observaciones,
      actualizado_por: userId,
      // Nuevos campos
      tipo_situacion_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
    });

    // Guardar detalles adicionales
    // Función helper para guardar/actualizar detalles por tipo
    const guardarDetalles = async (tipoDetalle: string, datos: any[]) => {
      if (!datos || !Array.isArray(datos)) return;

      // Eliminar detalles existentes de este tipo
      await db.none(
        'DELETE FROM detalle_situacion WHERE situacion_id = $1 AND tipo_detalle = $2',
        [situacionId, tipoDetalle]
      );

      // Insertar nuevos detalles
      for (const item of datos) {
        await DetalleSituacionModel.create({
          situacion_id: situacionId,
          tipo_detalle: tipoDetalle as any,
          datos: item,
          creado_por: userId,
        });
      }
    };

    // Guardar vehículos
    if (vehiculos) {
      await guardarDetalles('VEHICULO', vehiculos);
    }

    // Guardar grúas
    if (gruas) {
      await guardarDetalles('GRUA', gruas);
    }

    // Guardar ajustadores
    if (ajustadores) {
      await guardarDetalles('AJUSTADOR', ajustadores);
    }

    // Guardar autoridades y socorro como un detalle especial
    if (autoridadesSeleccionadas || socorroSeleccionados) {
      await db.none(
        'DELETE FROM detalle_situacion WHERE situacion_id = $1 AND tipo_detalle = $2',
        [situacionId, 'AUTORIDADES_SOCORRO']
      );

      await DetalleSituacionModel.create({
        situacion_id: situacionId,
        tipo_detalle: 'AUTORIDADES_SOCORRO' as any,
        datos: {
          autoridades: autoridadesSeleccionadas || [],
          detallesAutoridades: detallesAutoridades || {},
          socorro: socorroSeleccionados || [],
          detallesSocorro: detallesSocorro || {},
        },
        creado_por: userId,
      });
    }

    // Guardar daños como detalle
    if (danios_materiales !== undefined || danios_infraestructura !== undefined) {
      await db.none(
        'DELETE FROM detalle_situacion WHERE situacion_id = $1 AND tipo_detalle = $2',
        [situacionId, 'DANIOS']
      );

      await DetalleSituacionModel.create({
        situacion_id: situacionId,
        tipo_detalle: 'DANIOS' as any,
        datos: {
          materiales: danios_materiales || false,
          infraestructura: danios_infraestructura || false,
          descripcion_infra: descripcion_danios_infra || '',
        },
        creado_por: userId,
      });
    }

    // Guardar subtipo/tipo de incidente
    if (tipoIncidente || subtipo_situacion) {
      await db.none(
        'DELETE FROM detalle_situacion WHERE situacion_id = $1 AND tipo_detalle = $2',
        [situacionId, 'SUBTIPO']
      );

      await DetalleSituacionModel.create({
        situacion_id: situacionId,
        tipo_detalle: 'SUBTIPO' as any,
        datos: {
          subtipo: tipoIncidente || subtipo_situacion,
        },
        creado_por: userId,
      });
    }

    // Obtener situación completa
    const situacionCompleta = await SituacionModel.getById(situacion.id);

    // Obtener detalles para la respuesta
    const detalles = await DetalleSituacionModel.getBySituacionId(situacionId);

    // Organizar detalles por tipo
    const detallesOrganizados = {
      vehiculos: detalles.filter(d => d.tipo_detalle === 'VEHICULO').map(d => d.datos),
      gruas: detalles.filter(d => d.tipo_detalle === 'GRUA').map(d => d.datos),
      ajustadores: detalles.filter(d => d.tipo_detalle === 'AJUSTADOR').map(d => d.datos),
      autoridades_socorro: detalles.find(d => d.tipo_detalle === 'AUTORIDADES_SOCORRO')?.datos,
      danios: detalles.find(d => d.tipo_detalle === 'DANIOS')?.datos,
      subtipo: detalles.find(d => d.tipo_detalle === 'SUBTIPO')?.datos,
    };

    // Emitir evento WebSocket
    if (situacionCompleta) {
      const sc = situacionCompleta as any;
      const evento: SituacionEvent = {
        id: sc.id,
        uuid: sc.uuid,
        tipo_situacion: sc.tipo_situacion,
        unidad_id: sc.unidad_id,
        unidad_codigo: sc.unidad_codigo || `U-${sc.unidad_id}`,
        ruta_codigo: sc.ruta_codigo,
        km: sc.km,
        latitud: sc.latitud,
        longitud: sc.longitud,
        estado: sc.estado,
        sede_id: sc.sede_id,
      };
      emitSituacionActualizada(evento);
    }

    return res.json({
      message: 'Situación actualizada exitosamente',
      situacion: { ...situacionCompleta, detalles: detallesOrganizados },
    });
  } catch (error) {
    console.error('Error en updateSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CERRAR SITUACIÓN
// ========================================

export async function cerrarSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones_finales } = req.body;
    const userId = req.user!.userId;

    const situacion = await SituacionModel.cerrar(parseInt(id, 10), userId, observaciones_finales);

    // Obtener situación completa
    const situacionCompleta = await SituacionModel.getById(situacion.id);

    // Emitir evento WebSocket
    if (situacionCompleta) {
      const sc = situacionCompleta as any;
      const evento: SituacionEvent = {
        id: sc.id,
        uuid: sc.uuid,
        tipo_situacion: sc.tipo_situacion,
        unidad_id: sc.unidad_id,
        unidad_codigo: sc.unidad_codigo || `U-${sc.unidad_id}`,
        ruta_codigo: sc.ruta_codigo,
        km: sc.km,
        latitud: sc.latitud,
        longitud: sc.longitud,
        estado: 'CERRADA',
        sede_id: sc.sede_id,
      };
      emitSituacionCerrada(evento);
    }

    return res.json({
      message: 'Situación cerrada exitosamente',
      situacion: situacionCompleta,
    });
  } catch (error) {
    console.error('Error en cerrarSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ELIMINAR SITUACIÓN (ADMIN)
// ========================================

export async function deleteSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await SituacionModel.delete(parseInt(id, 10));

    return res.json({ message: 'Situación eliminada exitosamente' });
  } catch (error) {
    console.error('Error en deleteSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// DETALLES DE SITUACIÓN
// ========================================

/**
 * Crear detalle de situación
 */
export async function createDetalle(req: Request, res: Response) {
  try {
    const { id: situacion_id } = req.params;
    const { tipo_detalle, datos } = req.body;
    const userId = req.user!.userId;

    const detalle = await DetalleSituacionModel.create({
      situacion_id: parseInt(situacion_id, 10),
      tipo_detalle,
      datos,
      creado_por: userId,
    });

    return res.status(201).json({
      message: 'Detalle creado exitosamente',
      detalle,
    });
  } catch (error) {
    console.error('Error en createDetalle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Listar detalles de una situación
 */
export async function getDetalles(req: Request, res: Response) {
  try {
    const { id: situacion_id } = req.params;

    const detalles = await DetalleSituacionModel.getBySituacionId(parseInt(situacion_id, 10));

    return res.json({ detalles, count: detalles.length });
  } catch (error) {
    console.error('Error en getDetalles:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Actualizar detalle
 */
export async function updateDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { datos } = req.body;

    const detalle = await DetalleSituacionModel.update(parseInt(id, 10), datos);

    return res.json({
      message: 'Detalle actualizado exitosamente',
      detalle,
    });
  } catch (error) {
    console.error('Error en updateDetalle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * Eliminar detalle
 */
export async function deleteDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await DetalleSituacionModel.delete(parseInt(id, 10));

    return res.json({ message: 'Detalle eliminado exitosamente' });
  } catch (error) {
    console.error('Error en deleteDetalle:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CAMBIAR TIPO DE SITUACIÓN
// ========================================

/**
 * Cambiar el tipo de una situación (INCIDENTE <-> ASISTENCIA_VEHICULAR)
 * Solo permite cambios entre tipos relacionados y registra auditoría
 */
export async function cambiarTipoSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_tipo, motivo } = req.body;
    const userId = req.user!.userId;

    // Validar que se proporcione el nuevo tipo
    if (!nuevo_tipo) {
      return res.status(400).json({ error: 'El nuevo tipo de situación es requerido' });
    }

    // Tipos permitidos para cambio
    const tiposPermitidos = ['INCIDENTE', 'ASISTENCIA_VEHICULAR'];
    if (!tiposPermitidos.includes(nuevo_tipo)) {
      return res.status(400).json({
        error: 'Solo se permite cambiar entre INCIDENTE y ASISTENCIA_VEHICULAR'
      });
    }

    // Obtener la situación actual
    const situacionActual = await SituacionModel.getById(parseInt(id, 10));
    if (!situacionActual) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    // Validar que el tipo actual sea uno de los permitidos
    if (!tiposPermitidos.includes(situacionActual.tipo_situacion)) {
      return res.status(400).json({
        error: `No se puede cambiar el tipo de una situación ${situacionActual.tipo_situacion}. Solo INCIDENTE y ASISTENCIA_VEHICULAR.`
      });
    }

    // Validar que no sea el mismo tipo
    if (situacionActual.tipo_situacion === nuevo_tipo) {
      return res.status(400).json({
        error: `La situación ya es de tipo ${nuevo_tipo}`
      });
    }

    // Guardar tipo anterior para auditoría
    const tipoAnterior = situacionActual.tipo_situacion;

    // Actualizar el tipo
    const situacionActualizada = await SituacionModel.update(parseInt(id, 10), {
      tipo_situacion: nuevo_tipo,
      actualizado_por: userId,
    });

    // Registrar en auditoría (si existe la tabla)
    try {
      await db.none(`
        INSERT INTO auditoria_cambios (
          tabla, registro_id, campo, valor_anterior, valor_nuevo,
          motivo, usuario_id, created_at
        ) VALUES (
          'situacion', $1, 'tipo_situacion', $2, $3, $4, $5, NOW()
        )
      `, [id, tipoAnterior, nuevo_tipo, motivo || 'Cambio de tipo de situación', userId]);
    } catch (auditError) {
      // Si la tabla de auditoría no existe, solo loguear
      console.log('[AUDITORIA] Tabla auditoria_cambios no existe, cambio no registrado en auditoría');
    }

    // Obtener situación completa para devolver
    const situacionCompleta = await SituacionModel.getById(situacionActualizada.id);

    console.log(`[SITUACION] Tipo cambiado: ${tipoAnterior} -> ${nuevo_tipo} (ID: ${id}, Usuario: ${userId})`);

    return res.json({
      message: `Tipo de situación cambiado de ${tipoAnterior} a ${nuevo_tipo}`,
      situacion: situacionCompleta,
      cambio: {
        tipo_anterior: tipoAnterior,
        tipo_nuevo: nuevo_tipo,
        motivo: motivo || null,
        cambiado_por: userId,
        fecha: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error en cambiarTipoSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// RESUMEN DE UNIDADES (DASHBOARD)
// ========================================

/**
 * Obtener resumen de todas las unidades con su estado actual
 * Incluye: última situación, km, ruta activa, combustible, sentido, hora de reporte
 */
export async function getResumenUnidades(req: Request, res: Response) {
  try {
    // Aplicar filtro de sede para usuarios que no sean COP/ADMIN
    const unidadesPermitidas = await getUnidadesPermitidas(req.user!.userId, req.user!.rol);

    const query = `
      WITH tripulacion_data AS (
        SELECT
          tt.asignacion_id,
          json_agg(
            json_build_object(
              'usuario_id', u_trip.id,
              'nombre_completo', u_trip.nombre_completo,
              'rol_tripulacion', tt.rol_tripulacion
            ) ORDER BY tt.rol_tripulacion
          ) as tripulacion
        FROM tripulacion_turno tt
        JOIN usuario u_trip ON tt.usuario_id = u_trip.id
        JOIN asignacion_unidad au_trip ON tt.asignacion_id = au_trip.id
        WHERE au_trip.turno_id IN (SELECT id FROM turno WHERE fecha = CURRENT_DATE)
        GROUP BY tt.asignacion_id
      )
      SELECT
        u.id as unidad_id,
        u.codigo as unidad_codigo,
        u.tipo_unidad,
        u.placa,
        u.sede_id,
        s.nombre as sede_nombre,

        -- Última situación
        us.situacion_id,
        us.situacion_uuid,
        us.tipo_situacion,
        us.estado as situacion_estado,
        us.km,
        us.sentido,
        us.ruta_codigo,
        us.ruta_nombre,
        us.latitud,
        us.longitud,
        us.combustible,
        us.combustible_fraccion,
        us.kilometraje_unidad,
        us.descripcion as situacion_descripcion,
        us.situacion_fecha,

        -- Ruta activa
        au.ruta_activa_id,
        ra.codigo as ruta_activa_codigo,
        ra.nombre as ruta_activa_nombre,
        au.hora_ultima_actualizacion_ruta,

        -- Información de turno
        t.id as turno_id,
        t.fecha as turno_fecha,
        t.estado as turno_estado,
        au.hora_salida_real,
        au.hora_entrada_real,

        -- Tripulación desde CTE
        COALESCE(td.tripulacion, '[]'::json) as tripulacion

      FROM unidad u
      JOIN salida_unidad sal ON u.id = sal.unidad_id AND sal.estado = 'EN_SALIDA'
      LEFT JOIN sede s ON u.sede_id = s.id
      LEFT JOIN v_ultima_situacion_unidad us ON u.id = us.unidad_id
      LEFT JOIN asignacion_unidad au ON u.id = au.unidad_id
        AND au.turno_id IN (SELECT id FROM turno WHERE fecha = CURRENT_DATE)
      LEFT JOIN turno t ON au.turno_id = t.id
      LEFT JOIN ruta ra ON au.ruta_activa_id = ra.id
      LEFT JOIN tripulacion_data td ON au.id = td.asignacion_id
      WHERE u.activa = true
        ${unidadesPermitidas !== null ? 'AND u.id = ANY($1::int[])' : ''}
      ORDER BY u.codigo
    `;

    const params = unidadesPermitidas !== null ? [unidadesPermitidas] : [];
    const resumen = await db.manyOrNone(query, params);

    return res.json({
      resumen,
      count: resumen.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en getResumenUnidades:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER TIPOS DE SITUACIÓN
// ========================================

export async function getTiposSituacion(_req: Request, res: Response) {
  try {
    const tipos = [
      { codigo: 'INCIDENTE', nombre: 'Incidente', color: '#ef4444', icono: 'alert-triangle' },
      { codigo: 'ASISTENCIA', nombre: 'Asistencia Vehicular', color: '#3b82f6', icono: 'car' },
      { codigo: 'EMERGENCIA', nombre: 'Emergencia', color: '#f59e0b', icono: 'alert-octagon' },
      { codigo: 'PREVENTIVO', nombre: 'Preventivo', color: '#22c55e', icono: 'shield' },
      { codigo: 'OTRO', nombre: 'Otro', color: '#6b7280', icono: 'help-circle' },
    ];
    return res.json({ tipos });
  } catch (error) {
    console.error('Error en getTiposSituacion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// LISTAR SITUACIONES ACTIVAS
// ========================================

export async function listSituacionesActivas(req: Request, res: Response) {
  try {
    const { unidad_id, tipo_situacion, limit, offset } = req.query;

    const filters: any = { activas_solo: true };

    if (unidad_id) filters.unidad_id = parseInt(unidad_id as string, 10);
    if (tipo_situacion) filters.tipo_situacion = tipo_situacion as string;
    if (limit) filters.limit = parseInt(limit as string, 10);
    if (offset) filters.offset = parseInt(offset as string, 10);

    // Aplicar filtro de sede para usuarios que no sean COP/ADMIN
    const unidadesPermitidas = await getUnidadesPermitidas(req.user!.userId, req.user!.rol);

    let situaciones = await SituacionModel.getActivas(filters);

    // Filtrar situaciones por unidades permitidas
    if (unidadesPermitidas !== null) {
      situaciones = situaciones.filter((s: any) => unidadesPermitidas.includes(s.unidad_id));
    }

    return res.json({ situaciones, count: situaciones.length });
  } catch (error) {
    console.error('Error en listSituacionesActivas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
// ========================================
// CATALOGO
// ========================================

export async function getCatalogo(_req: Request, res: Response) {
  try {
    const catalogo = await db.any(`
      SELECT 
        ts.id, 
        ts.nombre, 
        ts.descripcion, 
        ts.icono, 
        ts.formulario_tipo,
        ts.requiere_formulario,
        ts.orden as tipo_orden,
        cs.id as categoria_id,
        cs.nombre as categoria_nombre,
        cs.codigo as categoria_codigo,
        cs.icono as categoria_icono,
        cs.orden as categoria_orden
      FROM catalogo_tipo_situacion ts
      JOIN catalogo_categoria_situacion cs ON ts.categoria_id = cs.id
      WHERE ts.activo = true
      ORDER BY cs.orden, ts.orden, ts.nombre
    `);

    // Agrupar por categoría
    const categoriasMap = new Map();

    catalogo.forEach(item => {
      if (!categoriasMap.has(item.categoria_id)) {
        categoriasMap.set(item.categoria_id, {
          id: item.categoria_id,
          nombre: item.categoria_nombre,
          codigo: item.categoria_codigo,
          icono: item.categoria_icono,
          orden: item.categoria_orden,
          tipos: []
        });
      }
      categoriasMap.get(item.categoria_id).tipos.push({
        id: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion,
        icono: item.icono,
        formulario_tipo: item.formulario_tipo,
        requiere_formulario: item.requiere_formulario
      });
    });

    const resultado = Array.from(categoriasMap.values());
    res.json(resultado);
  } catch (error) {
    console.error('Error al obtener catálogo de situaciones:', error);
    res.status(500).json({ message: 'Error al obtener catálogo' });
  }
}

export async function getCatalogosAuxiliares(_req: Request, res: Response) {
  try {
    const tipos_hecho = await db.any('SELECT id, nombre FROM tipo_hecho WHERE activo = true ORDER BY nombre');

    let tipos_asistencia: any[] = [];
    try {
      // Usamos nombre exacto de la tabla creada en migración 098
      tipos_asistencia = await db.any('SELECT id, nombre FROM tipo_asistencia_vial WHERE activo = true ORDER BY nombre');
    } catch (e) {
      console.warn('Tabla tipo_asistencia_vial aun no existe o error', e);
    }

    let tipos_emergencia: any[] = [];
    try {
      tipos_emergencia = await db.any('SELECT id, codigo, nombre FROM tipo_emergencia_vial WHERE activo = true ORDER BY nombre');
    } catch (e) {
      console.warn('Tabla tipo_emergencia_vial aun no existe o error', e);
    }

    return res.json({
      tipos_hecho,
      tipos_asistencia,
      tipos_emergencia
    });
  } catch (error) {
    console.error('Error al obtener catalogos auxiliares:', error);
    return res.status(500).json({ msg: 'Error al obtener catálogos auxiliares' });
  }
}
