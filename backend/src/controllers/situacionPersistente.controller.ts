import { Request, Response } from 'express';
import { SituacionPersistenteModel } from '../models/situacionPersistente.model';

// ========================================
// CRUD DE SITUACIONES PERSISTENTES
// ========================================

/**
 * Crear nueva situación persistente
 * Solo COP puede crear
 */
export const crear = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede crear situaciones persistentes'
      });
    }

    const {
      titulo,
      tipo,
      subtipo,
      importancia,
      ruta_id,
      km_inicio,
      km_fin,
      sentido,
      latitud,
      longitud,
      direccion_referencia,
      descripcion,
      fecha_fin_estimada
    } = req.body;

    if (!titulo || !tipo) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: titulo, tipo'
      });
    }

    const situacion = await SituacionPersistenteModel.create({
      titulo,
      tipo,
      subtipo,
      importancia,
      ruta_id,
      km_inicio,
      km_fin,
      sentido,
      latitud,
      longitud,
      direccion_referencia,
      descripcion,
      fecha_fin_estimada: fecha_fin_estimada ? new Date(fecha_fin_estimada) : undefined,
      creado_por: userId
    });

    res.status(201).json({
      message: 'Situación persistente creada',
      situacion
    });
  } catch (error: any) {
    console.error('Error creando situación persistente:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener situación por ID
 */
export const getById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const situacion = await SituacionPersistenteModel.getById(id);

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    res.json(situacion);
  } catch (error: any) {
    console.error('Error obteniendo situación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener situación por UUID
 */
export const getByUuid = async (req: Request, res: Response) => {
  try {
    const { uuid } = req.params;

    const situacion = await SituacionPersistenteModel.getByUuid(uuid);

    if (!situacion) {
      return res.status(404).json({ error: 'Situación no encontrada' });
    }

    res.json(situacion);
  } catch (error: any) {
    console.error('Error obteniendo situación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Listar situaciones persistentes activas
 */
export const getActivas = async (_req: Request, res: Response) => {
  try {
    const situaciones = await SituacionPersistenteModel.getActivas();
    res.json(situaciones);
  } catch (error: any) {
    console.error('Error listando situaciones activas:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Listar todas las situaciones con filtros
 */
export const getAll = async (req: Request, res: Response) => {
  try {
    const { estado, tipo, ruta_id, importancia, limit, offset } = req.query;

    const situaciones = await SituacionPersistenteModel.getAll({
      estado: estado as any,
      tipo: tipo as string,
      ruta_id: ruta_id ? parseInt(ruta_id as string) : undefined,
      importancia: importancia as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json(situaciones);
  } catch (error: any) {
    console.error('Error listando situaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar situación persistente
 */
export const actualizar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede actualizar situaciones persistentes'
      });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const situacion = await SituacionPersistenteModel.update(id, req.body);

    res.json({
      message: 'Situación actualizada',
      situacion
    });
  } catch (error: any) {
    console.error('Error actualizando situación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Finalizar situación persistente
 */
export const finalizar = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede finalizar situaciones persistentes'
      });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const situacion = await SituacionPersistenteModel.finalizar(id, userId);

    res.json({
      message: 'Situación finalizada',
      situacion
    });
  } catch (error: any) {
    console.error('Error finalizando situación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Pausar situación persistente
 */
export const pausar = async (req: Request, res: Response) => {
  try {
    const rol = req.user?.rol;

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede pausar situaciones'
      });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const situacion = await SituacionPersistenteModel.pausar(id);

    res.json({
      message: 'Situación pausada',
      situacion
    });
  } catch (error: any) {
    console.error('Error pausando situación:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Reactivar situación persistente
 */
export const reactivar = async (req: Request, res: Response) => {
  try {
    const rol = req.user?.rol;

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede reactivar situaciones'
      });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const situacion = await SituacionPersistenteModel.reactivar(id);

    res.json({
      message: 'Situación reactivada',
      situacion
    });
  } catch (error: any) {
    console.error('Error reactivando situación:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// ASIGNACIÓN DE UNIDADES
// ========================================

/**
 * Asignar unidad a situación persistente
 */
export const asignarUnidad = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede asignar unidades'
      });
    }

    const situacionId = parseInt(req.params.id);

    if (isNaN(situacionId)) {
      return res.status(400).json({ error: 'ID de situación inválido' });
    }

    const {
      unidad_id,
      asignacion_unidad_id,
      km_asignacion,
      latitud_asignacion,
      longitud_asignacion,
      observaciones_asignacion
    } = req.body;

    if (!unidad_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: unidad_id'
      });
    }

    const asignacion = await SituacionPersistenteModel.asignarUnidad({
      situacion_persistente_id: situacionId,
      unidad_id,
      asignacion_unidad_id,
      km_asignacion,
      latitud_asignacion,
      longitud_asignacion,
      observaciones_asignacion,
      asignado_por: userId
    });

    res.status(201).json({
      message: 'Unidad asignada a situación',
      asignacion
    });
  } catch (error: any) {
    console.error('Error asignando unidad:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Desasignar unidad de situación persistente
 */
export const desasignarUnidad = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede desasignar unidades'
      });
    }

    const situacionId = parseInt(req.params.id);
    const unidadId = parseInt(req.params.unidadId);

    if (isNaN(situacionId) || isNaN(unidadId)) {
      return res.status(400).json({ error: 'IDs inválidos' });
    }

    const { observaciones_desasignacion } = req.body;

    const asignacion = await SituacionPersistenteModel.desasignarUnidad({
      situacion_persistente_id: situacionId,
      unidad_id: unidadId,
      observaciones_desasignacion,
      desasignado_por: userId
    });

    res.json({
      message: 'Unidad desasignada de situación',
      asignacion
    });
  } catch (error: any) {
    console.error('Error desasignando unidad:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener asignaciones activas de una situación
 */
export const getAsignaciones = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const asignaciones = await SituacionPersistenteModel.getAsignacionesActivas(id);
    res.json(asignaciones);
  } catch (error: any) {
    console.error('Error obteniendo asignaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener historial completo de asignaciones
 */
export const getHistorialAsignaciones = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const historial = await SituacionPersistenteModel.getHistorialAsignaciones(id);
    res.json(historial);
  } catch (error: any) {
    console.error('Error obteniendo historial:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// ACTUALIZACIONES (para brigadas)
// ========================================

/**
 * Agregar actualización a situación persistente
 * Los brigadas pueden agregar mientras estén asignados
 */
export const agregarActualizacion = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const rol = req.user?.rol;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const situacionId = parseInt(req.params.id);

    if (isNaN(situacionId)) {
      return res.status(400).json({ error: 'ID de situación inválido' });
    }

    const {
      unidad_id,
      tipo_actualizacion,
      contenido,
      datos_adicionales,
      archivos
    } = req.body;

    if (!unidad_id || !tipo_actualizacion) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: unidad_id, tipo_actualizacion'
      });
    }

    // Verificar que el usuario pertenece a la unidad o es COP
    if (rol !== 'COP' && rol !== 'ADMIN') {
      // Para brigadas, verificar que la unidad está asignada
      const asignacionActiva = await SituacionPersistenteModel.getAsignacionActivaUnidad(unidad_id);
      if (!asignacionActiva || asignacionActiva.situacion_id !== situacionId) {
        return res.status(403).json({
          error: 'Sin permisos',
          message: 'La unidad no está asignada a esta situación'
        });
      }
    }

    const actualizacion = await SituacionPersistenteModel.agregarActualizacion({
      situacion_persistente_id: situacionId,
      usuario_id: userId,
      unidad_id,
      tipo_actualizacion,
      contenido,
      datos_adicionales,
      archivos
    });

    res.status(201).json({
      message: 'Actualización agregada',
      actualizacion
    });
  } catch (error: any) {
    console.error('Error agregando actualización:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Editar actualización (solo si puede_editarse = true)
 */
export const editarActualizacion = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const actualizacionId = parseInt(req.params.actualizacionId);

    if (isNaN(actualizacionId)) {
      return res.status(400).json({ error: 'ID de actualización inválido' });
    }

    const { contenido, datos_adicionales } = req.body;

    const actualizacion = await SituacionPersistenteModel.editarActualizacion(
      actualizacionId,
      userId,
      { contenido, datos_adicionales }
    );

    res.json({
      message: 'Actualización editada',
      actualizacion
    });
  } catch (error: any) {
    console.error('Error editando actualización:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener actualizaciones de una situación
 */
export const getActualizaciones = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const { unidad_id, tipo_actualizacion, limit, offset } = req.query;

    const actualizaciones = await SituacionPersistenteModel.getActualizaciones(id, {
      unidad_id: unidad_id ? parseInt(unidad_id as string) : undefined,
      tipo_actualizacion: tipo_actualizacion as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json(actualizaciones);
  } catch (error: any) {
    console.error('Error obteniendo actualizaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// CONSULTAS PARA BRIGADAS
// ========================================

/**
 * Obtener situaciones donde mi unidad está asignada
 */
export const getMisSituaciones = async (req: Request, res: Response) => {
  try {
    const unidadId = parseInt(req.query.unidad_id as string);

    if (isNaN(unidadId)) {
      return res.status(400).json({ error: 'unidad_id requerido' });
    }

    const situaciones = await SituacionPersistenteModel.getSituacionesByUnidad(unidadId);
    res.json(situaciones);
  } catch (error: any) {
    console.error('Error obteniendo mis situaciones:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Verificar si mi unidad está asignada a alguna situación persistente
 */
export const verificarAsignacion = async (req: Request, res: Response) => {
  try {
    const unidadId = parseInt(req.query.unidad_id as string);

    if (isNaN(unidadId)) {
      return res.status(400).json({ error: 'unidad_id requerido' });
    }

    const asignacion = await SituacionPersistenteModel.getAsignacionActivaUnidad(unidadId);

    if (!asignacion) {
      return res.json({
        asignada: false,
        situacion: null
      });
    }

    res.json({
      asignada: true,
      situacion: asignacion
    });
  } catch (error: any) {
    console.error('Error verificando asignación:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// TIPOS DE SITUACIONES PERSISTENTES
// ========================================

/**
 * Obtener tipos de situaciones disponibles (legacy)
 */
export const getTipos = async (_req: Request, res: Response) => {
  try {
    // Tipos predefinidos de situaciones persistentes
    const tipos = [
      { value: 'DERRUMBE', label: 'Derrumbe' },
      { value: 'OBRAS_VIALES', label: 'Obras Viales' },
      { value: 'ACCIDENTE_MAYOR', label: 'Accidente Mayor' },
      { value: 'DESASTRE_NATURAL', label: 'Desastre Natural' },
      { value: 'BLOQUEO', label: 'Bloqueo de Ruta' },
      { value: 'INUNDACION', label: 'Inundación' },
      { value: 'MANIFESTACION', label: 'Manifestación' },
      { value: 'EVENTO_ESPECIAL', label: 'Evento Especial' },
      { value: 'OTRO', label: 'Otro' }
    ];

    res.json(tipos);
  } catch (error: any) {
    console.error('Error obteniendo tipos:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// TIPOS DE EMERGENCIA VIAL (Catálogo BD)
// ========================================

/**
 * Obtener tipos de emergencia vial desde la BD
 */
export const getTiposEmergencia = async (_req: Request, res: Response) => {
  try {
    const tipos = await SituacionPersistenteModel.getTiposEmergencia();
    res.json(tipos);
  } catch (error: any) {
    console.error('Error obteniendo tipos de emergencia:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// PROMOCIÓN DE SITUACIÓN A PERSISTENTE
// ========================================

/**
 * Promover una situación normal a persistente extraordinaria
 * Requiere permiso: puede_promover_situaciones
 */
export const promover = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const situacionId = parseInt(req.params.situacionId);

    if (isNaN(situacionId)) {
      return res.status(400).json({ error: 'ID de situación inválido' });
    }

    const {
      titulo,
      tipo_emergencia_id,
      importancia,
      descripcion
    } = req.body;

    if (!titulo || !tipo_emergencia_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: titulo, tipo_emergencia_id'
      });
    }

    // Verificar que no haya sido promovida antes
    const yaPromovida = await SituacionPersistenteModel.fuePromovida(situacionId);
    if (yaPromovida) {
      return res.status(400).json({
        error: 'Ya promovida',
        message: 'Esta situación ya fue promovida a persistente anteriormente'
      });
    }

    const situacion = await SituacionPersistenteModel.promoverSituacion({
      situacion_id: situacionId,
      titulo,
      tipo_emergencia_id,
      importancia,
      descripcion,
      promovido_por: userId
    });

    res.status(201).json({
      message: 'Situación promovida a persistente exitosamente',
      situacion
    });
  } catch (error: any) {
    console.error('Error promoviendo situación:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// CREACIÓN/ACTUALIZACIÓN COMPLETA
// ========================================

/**
 * Crear situación persistente con todos los datos de emergencia vial
 * Requiere permiso: puede_crear_persistentes
 */
export const crearCompleta = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const {
      titulo,
      tipo_emergencia_id,
      importancia,
      ruta_id,
      km_inicio,
      km_fin,
      sentido,
      latitud,
      longitud,
      jurisdiccion,
      descripcion,
      obstruccion,
      autoridades,
      socorro
    } = req.body;

    if (!titulo || !tipo_emergencia_id) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: titulo, tipo_emergencia_id'
      });
    }

    const situacion = await SituacionPersistenteModel.crearCompleta({
      titulo,
      tipo_emergencia_id,
      importancia,
      ruta_id,
      km_inicio,
      km_fin,
      sentido,
      latitud,
      longitud,
      jurisdiccion,
      descripcion,
      creado_por: userId,
      obstruccion,
      autoridades,
      socorro
    });

    res.status(201).json({
      message: 'Situación persistente creada exitosamente',
      situacion
    });
  } catch (error: any) {
    console.error('Error creando situación completa:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Actualizar situación persistente con todos los datos de emergencia
 * Requiere permiso: puede_crear_persistentes
 */
export const actualizarCompleta = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const {
      titulo,
      importancia,
      km_inicio,
      km_fin,
      sentido,
      descripcion,
      obstruccion,
      autoridades,
      socorro
    } = req.body;

    // Actualizar datos básicos
    await SituacionPersistenteModel.update(id, {
      titulo,
      importancia,
      km_inicio,
      km_fin,
      sentido,
      descripcion
    });

    // Actualizar obstrucción si se proporciona (nuevo modelo v2)
    if (obstruccion !== undefined) {
      await SituacionPersistenteModel.saveObstruccion({
        situacion_persistente_id: id,
        hay_vehiculo_fuera_via: obstruccion.hay_vehiculo_fuera_via ?? false,
        tipo_obstruccion: obstruccion.tipo_obstruccion ?? 'ninguna',
        sentido_principal: obstruccion.sentido_principal || null,
        sentido_contrario: obstruccion.sentido_contrario || null,
        descripcion_manual: obstruccion.descripcion_manual
      });
    }

    // Actualizar autoridades si se proporcionan
    if (autoridades !== undefined) {
      await SituacionPersistenteModel.saveAutoridades(id, autoridades);
    }

    // Actualizar socorro si se proporciona
    if (socorro !== undefined) {
      await SituacionPersistenteModel.saveSocorro(id, socorro);
    }

    // Obtener situación actualizada
    const situacion = await SituacionPersistenteModel.getById(id);

    res.json({
      message: 'Situación actualizada exitosamente',
      situacion
    });
  } catch (error: any) {
    console.error('Error actualizando situación completa:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// MULTIMEDIA
// ========================================

/**
 * Subir multimedia a situación persistente
 */
export const subirMultimedia = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const {
      tipo,
      url,
      url_thumbnail,
      nombre_archivo,
      mime_type,
      tamanio_bytes,
      latitud,
      longitud,
      descripcion
    } = req.body;

    if (!tipo || !url) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere: tipo (foto/video), url'
      });
    }

    if (tipo !== 'foto' && tipo !== 'video') {
      return res.status(400).json({
        error: 'Tipo inválido',
        message: 'El tipo debe ser "foto" o "video"'
      });
    }

    const multimedia = await SituacionPersistenteModel.addMultimedia({
      situacion_persistente_id: id,
      tipo,
      url,
      url_thumbnail,
      nombre_archivo,
      mime_type,
      tamanio_bytes,
      latitud,
      longitud,
      descripcion,
      subido_por: userId
    });

    res.status(201).json({
      message: 'Multimedia agregada exitosamente',
      multimedia
    });
  } catch (error: any) {
    console.error('Error subiendo multimedia:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener multimedia de una situación
 */
export const getMultimedia = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const multimedia = await SituacionPersistenteModel.getMultimedia(id);
    res.json(multimedia);
  } catch (error: any) {
    console.error('Error obteniendo multimedia:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Eliminar multimedia
 */
export const deleteMultimedia = async (req: Request, res: Response) => {
  try {
    const rol = req.user?.rol;

    if (rol !== 'COP' && rol !== 'ADMIN') {
      return res.status(403).json({
        error: 'Sin permisos',
        message: 'Solo el COP puede eliminar multimedia'
      });
    }

    const multimediaId = parseInt(req.params.multimediaId);

    if (isNaN(multimediaId)) {
      return res.status(400).json({ error: 'ID de multimedia inválido' });
    }

    await SituacionPersistenteModel.deleteMultimedia(multimediaId);

    res.json({ message: 'Multimedia eliminada exitosamente' });
  } catch (error: any) {
    console.error('Error eliminando multimedia:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener resumen de multimedia (conteo)
 */
export const getMultimediaResumen = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const resumen = await SituacionPersistenteModel.getMultimediaResumen(id);
    res.json(resumen);
  } catch (error: any) {
    console.error('Error obteniendo resumen multimedia:', error);
    res.status(500).json({ error: error.message });
  }
};

// ========================================
// DETALLES (Obstrucción, Autoridades, Socorro)
// ========================================

/**
 * Obtener obstrucción de una situación (modelo v2)
 */
export const getObstruccion = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const obstruccion = await SituacionPersistenteModel.getObstruccion(id);

    // Si no hay obstrucción, devolver estado por defecto (nuevo modelo v2)
    if (!obstruccion) {
      return res.json({
        hay_vehiculo_fuera_via: false,
        tipo_obstruccion: 'ninguna',
        sentido_principal: null,
        sentido_contrario: null,
        descripcion_manual: null,
        descripcion_generada: null
      });
    }

    res.json(obstruccion);
  } catch (error: any) {
    console.error('Error obteniendo obstrucción:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener autoridades de una situación
 */
export const getAutoridades = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const autoridades = await SituacionPersistenteModel.getAutoridades(id);
    res.json(autoridades);
  } catch (error: any) {
    console.error('Error obteniendo autoridades:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtener socorro de una situación
 */
export const getSocorro = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const socorro = await SituacionPersistenteModel.getSocorro(id);
    res.json(socorro);
  } catch (error: any) {
    console.error('Error obteniendo socorro:', error);
    res.status(500).json({ error: error.message });
  }
};
