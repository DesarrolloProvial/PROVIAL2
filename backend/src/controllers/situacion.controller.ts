import { Request, Response } from 'express';
import { SituacionModel, DetalleSituacionModel } from '../models/situacion.model';
import { MultimediaModel } from '../models/multimedia.model';
import { TurnoModel } from '../models/turno.model';
// import { UsuarioModel } from '../models/usuario.model'; // No usado actualmente
import { SalidaModel } from '../models/salida.model';
import { UbicacionBrigadaModel } from '../models/ubicacionBrigada.model';
import { db } from '../config/database';
import {
  emitSituacionNueva,
  emitSituacionActualizada,
  emitSituacionCerrada,
} from '../services/socket.service';

// ========================================
// HELPERS
// ========================================

// Helper para obtener unidades permitidas (para uso futuro)
// async function getUnidadesPermitidas(userId: number, rol: string): Promise<number[] | null> {
//   if (rol === 'COP' || rol === 'ADMIN' || rol === 'OPERACIONES') return null;
//   const usuario = await UsuarioModel.findById(userId);
//   if (!usuario || !usuario.sede_id) return [];
//   const result = await db.manyOrNone('SELECT id FROM unidad WHERE sede_id = $1 AND activa = true', [usuario.sede_id]);
//   return result.map((r: any) => r.id);
// }

// ========================================
// CREAR SITUACIÓN
// ========================================

export async function createSituacion(req: Request, res: Response) {
  try {
    console.log('═══════════════════════════════════════════════════════');
    console.log('📥 [BACKEND] DATOS RECIBIDOS EN createSituacion');
    console.log('═══════════════════════════════════════════════════════');
    console.log('📦 req.body COMPLETO:');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('---');

    const {
      id: codigo_situacion, // ID determinista
      tipo_situacion,
      unidad_id,
      salida_unidad_id,
      turno_id,
      asignacion_id,
      ruta_id,
      km,
      sentido,
      latitud: latitudRaw,
      longitud: longitudRaw,
      coordenadas, // Fallback si viene como objeto {latitude, longitude}
      ubicacion_manual,
      combustible,
      combustible_fraccion,
      kilometraje_unidad,
      tripulacion_confirmada,
      descripcion,
      observaciones,
      detalles, // Array explícito de detalles

      // Campos legacy/frontend directos
      vehiculos, // Array de vehículos del FormBuilder
      autoridades, // Array de autoridades del FormBuilder

      // Campos nuevos (Columnas Reales)
      tipo_situacion_id,
      clima,
      carga_vehicular,
      departamento_id,
      municipio_id,
      obstruccion,
      area,
      material_via, // Mapear a tipo_pavimento
      // Campos de tipo de hecho/asistencia/emergencia (IDs)
      tipo_hecho_id,
      tipo_asistencia_id,
      tipo_emergencia_id,
      // Víctimas
      hay_heridos,
      cantidad_heridos,
      hay_fallecidos,
      cantidad_fallecidos,
      vehiculos_involucrados, // Fallback si viene con este nombre
      // Campos que van a OTROS o Detalles
      apoyo_proporcionado,
      tipo_asistencia, // string (legacy)
      tipo_emergencia, // string (legacy)
      danios_materiales,
      danios_infraestructura,
      descripcion_danios_infra,
    } = req.body;

    console.log('🔍 [BACKEND] CAMPOS EXTRAÍDOS (destructuring):');
    console.log('  - tipo_situacion:', tipo_situacion, '(type:', typeof tipo_situacion, ')');
    console.log('  - tipo_situacion_id:', tipo_situacion_id, '(type:', typeof tipo_situacion_id, ')');
    console.log('  - clima:', clima, '(type:', typeof clima, ')');
    console.log('  - carga_vehicular:', carga_vehicular, '(type:', typeof carga_vehicular, ')');
    console.log('  - departamento_id:', departamento_id, '(type:', typeof departamento_id, ')');
    console.log('  - municipio_id:', municipio_id, '(type:', typeof municipio_id, ')');
    console.log('  - tipo_hecho_id:', tipo_hecho_id, '(type:', typeof tipo_hecho_id, ')');
    console.log('  - tipo_asistencia_id:', tipo_asistencia_id, '(type:', typeof tipo_asistencia_id, ')');
    console.log('  - tipo_emergencia_id:', tipo_emergencia_id, '(type:', typeof tipo_emergencia_id, ')');
    console.log('  - area:', area, '(type:', typeof area, ')');
    console.log('  - material_via:', material_via, '(type:', typeof material_via, ')');
    console.log('  - km:', km, '(type:', typeof km, ')');
    console.log('  - sentido:', sentido, '(type:', typeof sentido, ')');
    console.log('  - latitud:', latitud, '(type:', typeof latitud, ')');
    console.log('  - longitud:', longitud, '(type:', typeof longitud, ')');
    console.log('  - apoyo_proporcionado:', apoyo_proporcionado, '(type:', typeof apoyo_proporcionado, ')');
    console.log('═══════════════════════════════════════════════════════');

    // Convertir coordenadas si vienen como objeto {latitude, longitude}
    const latitud = latitudRaw ?? coordenadas?.latitude ?? coordenadas?.latitud ?? null;
    const longitud = longitudRaw ?? coordenadas?.longitude ?? coordenadas?.longitud ?? null;

    const userId = req.user!.userId;

    // Validación duplicados Offline-First
    if (codigo_situacion) {
      const existente = await SituacionModel.findByCodigoSituacion(codigo_situacion);
      if (existente) {
        if (existente.km === km && existente.tipo_situacion === tipo_situacion) {
          return res.status(200).json({
            situacion: await SituacionModel.getById(existente.id),
            message: 'Situación ya registrada (idempotente)'
          });
        }
        return res.status(409).json({ error: 'DUPLICATE_SITUACION', message: 'Conflicto de duplicado', situacion_existente: existente });
      }
    }

    // Lógica de Unidad/Salida
    let unidadFinal = unidad_id;
    let turnoFinal = turno_id;
    let asignacionFinal = asignacion_id;
    let rutaFinal = ruta_id;

    // -- INICIO LOGICA UNIDAD AUTOMATICA --
    if (req.user!.rol === 'BRIGADA' && (!unidadFinal || !rutaFinal)) {
      const ubicacionActual = await UbicacionBrigadaModel.getUbicacionActual(userId);
      if (ubicacionActual) {
        if (ubicacionActual.estado === 'PRESTADO') {
          if (!unidadFinal) unidadFinal = ubicacionActual.unidad_actual_id;
          // Buscar asignación de esa unidad...
          const asig = await TurnoModel.getAsignacionActivaUnidad(unidadFinal);
          if (asig) {
            if (!turnoFinal) turnoFinal = asig.turno_id;
            if (!asignacionFinal) asignacionFinal = asig.id;
            if (!rutaFinal) rutaFinal = asig.ruta_activa_id || asig.ruta_id;
          }
        } else { // CON_UNIDAD
          const miAsig = await TurnoModel.getMiAsignacionHoy(userId);
          if (miAsig) {
            if (!unidadFinal) unidadFinal = miAsig.unidad_id;
            if (!turnoFinal) turnoFinal = miAsig.turno_id;
            if (!asignacionFinal) asignacionFinal = miAsig.asignacion_id;
            if (!rutaFinal) rutaFinal = miAsig.ruta_id;
          }
        }
      } else {
        const miAsig = await TurnoModel.getMiAsignacionHoy(userId);
        if (miAsig) {
          if (!unidadFinal) unidadFinal = miAsig.unidad_id;
          if (!turnoFinal) turnoFinal = miAsig.turno_id;
          if (!asignacionFinal) asignacionFinal = miAsig.asignacion_id;
          if (!rutaFinal) rutaFinal = miAsig.ruta_id;
        }
      }
    }

    if (!unidadFinal) return res.status(400).json({ error: 'unidad_id requerido (o no asignado a brigada)' });

    // Fallback ruta si tenemos asignación
    if (!rutaFinal && asignacionFinal) {
      const asig = await db.oneOrNone('SELECT ruta_id FROM asignacion_unidad WHERE id=$1', [asignacionFinal]);
      if (asig) rutaFinal = asig.ruta_id;
    }
    if (!rutaFinal) return res.status(400).json({ error: 'ruta_id requerido' });

    // Cerrar anterior activa
    const anterior = await db.oneOrNone("SELECT id FROM situacion WHERE unidad_id=$1 AND estado='ACTIVA' ORDER BY created_at DESC LIMIT 1", [unidadFinal]);
    if (anterior) {
      await SituacionModel.cerrar(anterior.id, userId, `Cierre auto por nueva ${tipo_situacion}`);
      emitSituacionCerrada({ id: anterior.id, estado: 'CERRADA' } as any);
    }

    // Buscar salida activa
    let salidaFinal = salida_unidad_id;
    if (!salidaFinal) {
      const sal = await SalidaModel.getMiSalidaActiva(userId);
      if (sal) salidaFinal = sal.salida_id;
    }

    // Mapeo Datos
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
      creado_por: userId,
      codigo_situacion,

      // Mapeo campos nuevos
      tipo_situacion_id,
      clima,
      carga_vehicular, // Frontend debe enviar nombre exacto
      departamento_id,
      municipio_id,
      obstruccion_data: obstruccion,
      area,
      tipo_pavimento: material_via,
      tipo_hecho_id: tipo_hecho_id ? parseInt(tipo_hecho_id, 10) : null,
      tipo_asistencia_id: tipo_asistencia_id ? parseInt(tipo_asistencia_id, 10) : null,
      tipo_emergencia_id: tipo_emergencia_id ? parseInt(tipo_emergencia_id, 10) : null,
      hay_heridos: hay_heridos || false,
      cantidad_heridos: cantidad_heridos ? parseInt(cantidad_heridos, 10) : 0,
      hay_fallecidos: hay_fallecidos || false,
      cantidad_fallecidos: cantidad_fallecidos ? parseInt(cantidad_fallecidos, 10) : 0,
      danios_materiales,
      danios_infraestructura,
      danios_descripcion: descripcion_danios_infra,
      fecha_hora_aviso: new Date(),
      fecha_hora_llegada: new Date()
    };

    console.log('💾 [BACKEND] OBJETO dataToCreate QUE SE ENVIARÁ A LA BASE DE DATOS:');
    console.log(JSON.stringify(dataToCreate, null, 2));
    console.log('---');
    console.log('🔑 CAMPOS IMPORTANTES:');
    console.log('  - tipo_situacion_id:', dataToCreate.tipo_situacion_id, '(type:', typeof dataToCreate.tipo_situacion_id, ')');
    console.log('  - clima:', dataToCreate.clima, '(type:', typeof dataToCreate.clima, ')');
    console.log('  - carga_vehicular:', dataToCreate.carga_vehicular, '(type:', typeof dataToCreate.carga_vehicular, ')');
    console.log('  - departamento_id:', dataToCreate.departamento_id, '(type:', typeof dataToCreate.departamento_id, ')');
    console.log('  - municipio_id:', dataToCreate.municipio_id, '(type:', typeof dataToCreate.municipio_id, ')');
    console.log('  - tipo_hecho_id:', dataToCreate.tipo_hecho_id, '(type:', typeof dataToCreate.tipo_hecho_id, ')');
    console.log('  - tipo_asistencia_id (en otrosDatos, línea 281):', tipo_asistencia_id, '(type:', typeof tipo_asistencia_id, ')');
    console.log('  - area:', dataToCreate.area, '(type:', typeof dataToCreate.area, ')');
    console.log('  - tipo_pavimento:', dataToCreate.tipo_pavimento, '(type:', typeof dataToCreate.tipo_pavimento, ')');
    console.log('═══════════════════════════════════════════════════════');

    const situacion = await SituacionModel.create(dataToCreate);
    console.log(`✅ [CREATE] OK ID: ${situacion.id}`);

    // Persistir Detalles (detalles explícitos)
    if (detalles && Array.isArray(detalles)) {
      for (const d of detalles) {
        await DetalleSituacionModel.create({
          situacion_id: situacion.id,
          tipo_detalle: d.tipo_detalle,
          datos: d.datos,
          creado_por: userId
        });
      }
    }

    // Persistir Vehículos (legacy array)
    const vehiculosList = vehiculos || vehiculos_involucrados;
    if (vehiculosList && Array.isArray(vehiculosList)) {
      for (const v of vehiculosList) {
        await DetalleSituacionModel.create({
          situacion_id: situacion.id,
          tipo_detalle: 'VEHICULO',
          datos: v,
          creado_por: userId
        });
      }
    }

    // Persistir Autoridades (legacy array)
    if (autoridades && Array.isArray(autoridades)) {
      for (const a of autoridades) {
        await DetalleSituacionModel.create({
          situacion_id: situacion.id,
          tipo_detalle: 'AUTORIDAD',
          datos: a,
          creado_por: userId
        });
      }
    }

    // Persistir OTROS
    const otrosDatos: any = {};
    if (apoyo_proporcionado) otrosDatos.apoyo_proporcionado = apoyo_proporcionado;
    if (tipo_asistencia) otrosDatos.tipo_asistencia = tipo_asistencia;
    if (tipo_emergencia) otrosDatos.tipo_emergencia = tipo_emergencia;
    if (tipo_asistencia_id) otrosDatos.tipo_asistencia_id = tipo_asistencia_id;
    if (tipo_emergencia_id) otrosDatos.tipo_emergencia_id = tipo_emergencia_id;

    if (Object.keys(otrosDatos).length > 0) {
      await DetalleSituacionModel.create({
        situacion_id: situacion.id,
        tipo_detalle: 'OTROS',
        datos: otrosDatos,
        creado_por: userId
      });
    }

    const full = await SituacionModel.getById(situacion.id);
    if (full) emitSituacionNueva(full as any);

    console.log('✅ [BACKEND] SITUACIÓN GUARDADA CON ÉXITO:');
    console.log('  - ID:', full?.id);
    console.log('  - tipo_situacion_id:', full?.tipo_situacion_id);
    console.log('  - clima:', full?.clima);
    console.log('  - carga_vehicular:', full?.carga_vehicular);
    console.log('  - departamento_id:', full?.departamento_id);
    console.log('  - municipio_id:', full?.municipio_id);
    console.log('  - tipo_hecho_id:', full?.tipo_hecho_id);
    console.log('  - area:', full?.area);
    console.log('  - tipo_pavimento:', full?.tipo_pavimento);
    console.log('═══════════════════════════════════════════════════════');

    return res.status(201).json({
      message: 'Situación creada',
      situacion: full
    });

  } catch (error: any) {
    console.error('❌ [CREATE ERROR]:', error);
    return res.status(500).json({ error: 'Internal Error', detail: error.message });
  }
}

// ========================================
// GET SITUACION
// ========================================

export async function getSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let situacionId: number;

    // Buscar por ID Determinista (contiene guiones) o ID numérico
    if (id.includes('-')) {
      const s = await SituacionModel.findByCodigoSituacion(id);
      if (!s) return res.status(404).json({ error: 'No encontrada' });
      situacionId = s.id;
    } else {
      situacionId = parseInt(id, 10);
    }

    const situacion = await SituacionModel.getById(situacionId);
    if (!situacion) return res.status(404).json({ error: 'No encontrada' });

    const detalles = await DetalleSituacionModel.getBySituacionId(situacionId);
    const multimedia = await MultimediaModel.getBySituacionId(situacionId);

    // Mapeo Inteligente: Elevar detalles al objeto principal para facilitar frontend
    const otros = detalles.find(d => d.tipo_detalle === 'OTROS')?.datos || {};
    const vehiculos = detalles.filter(d => d.tipo_detalle === 'VEHICULO').map(d => d.datos);

    // Combinar todo en una respuesta plana enriquecida
    const situacionResponse = {
      ...situacion,
      ...otros, // Inyecta: tipo_asistencia, tipo_emergencia, apoyo_proporcionado, etc.
      vehiculos_involucrados: vehiculos,
      detalles_raw: detalles, // Mantener original por referencia
      multimedia
    };

    // Devolver envuelto en 'situacion' para compatibilidad con frontend actual
    return res.json({ situacion: situacionResponse });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error' });
  }
}

// ========================================
// UPDATE SITUACION
// ========================================

export async function updateSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const situacionId = parseInt(id, 10);

    const {
      // Campos estándar
      km, sentido, latitud, longitud, observaciones, descripcion,
      // Nuevas columnas
      area, material_via, clima, carga_vehicular,
      danios_materiales, danios_infraestructura, descripcion_danios_infra,
      obstruccion,
      // Detalles/Otros
      apoyo_proporcionado, tipo_asistencia, tipo_emergencia,
      vehiculos_involucrados,
      // IDs de tipos
      tipo_hecho_id, tipo_asistencia_id, tipo_emergencia_id,
      // Víctimas
      hay_heridos, cantidad_heridos, hay_fallecidos, cantidad_fallecidos,
      // Servicios
      requiere_bomberos, requiere_pnc, requiere_ambulancia,
      // Causa/Condiciones
      causa_probable, causa_especificar,
      tipo_pavimento, iluminacion, senalizacion, visibilidad,
      tripulacion_confirmada,
      ubicacion_manual,
      combustible, combustible_fraccion, kilometraje_unidad
    } = req.body;

    // Update principal
    const updateData: any = {
      actualizado_por: userId,
      km, sentido, latitud, longitud, observaciones, descripcion,
      area,
      tipo_pavimento: material_via || tipo_pavimento,
      clima, carga_vehicular,
      danios_materiales, danios_infraestructura, danios_descripcion: descripcion_danios_infra,
      obstruccion_data: obstruccion,

      // Mapeo detallado
      tipo_hecho_id: tipo_hecho_id ? parseInt(tipo_hecho_id, 10) : null,

      hay_heridos: hay_heridos || false,
      cantidad_heridos: cantidad_heridos ? parseInt(cantidad_heridos, 10) : 0,
      hay_fallecidos: hay_fallecidos || false,
      cantidad_fallecidos: cantidad_fallecidos ? parseInt(cantidad_fallecidos, 10) : 0,

      requiere_bomberos: requiere_bomberos || false,
      requiere_pnc: requiere_pnc || false,
      requiere_ambulancia: requiere_ambulancia || false,

      causa_probable, causa_especificar,
      iluminacion, senalizacion, visibilidad,

      tripulacion_confirmada,
      ubicacion_manual: ubicacion_manual || false,

      combustible: combustible ? parseFloat(combustible) : null,
      combustible_fraccion,
      kilometraje_unidad: kilometraje_unidad ? parseFloat(kilometraje_unidad) : null
    };

    await SituacionModel.update(situacionId, updateData);

    // Update Detalles OTROS
    const otrosDatos: any = {};
    if (apoyo_proporcionado) otrosDatos.apoyo_proporcionado = apoyo_proporcionado;
    if (tipo_asistencia) otrosDatos.tipo_asistencia = tipo_asistencia;
    if (tipo_emergencia) otrosDatos.tipo_emergencia = tipo_emergencia;
    if (tipo_asistencia_id) otrosDatos.tipo_asistencia_id = tipo_asistencia_id;
    if (tipo_emergencia_id) otrosDatos.tipo_emergencia_id = tipo_emergencia_id;
    if (vehiculos_involucrados) otrosDatos.vehiculos_involucrados = vehiculos_involucrados;

    if (Object.keys(otrosDatos).length > 0) {
      const detalleExistente = await db.oneOrNone('SELECT * FROM detalle_situacion WHERE situacion_id=$1 AND tipo_detalle=$2', [situacionId, 'OTROS']);
      if (detalleExistente) {
        await DetalleSituacionModel.update(detalleExistente.id, { ...detalleExistente.datos, ...otrosDatos });
      } else {
        await DetalleSituacionModel.create({ situacion_id: situacionId, tipo_detalle: 'OTROS', datos: otrosDatos, creado_por: userId });
      }
    }

    const full = await SituacionModel.getById(situacionId);
    if (full) emitSituacionActualizada(full as any);

    return res.json({ message: 'Actualizado', situacion: full });

  } catch (error: any) {
    console.error('Error update:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}

// Exportar funciones restantes (list, mapas, bitacora) sin cambios mayores, solo asegurando que usen el nuevo model
export async function listSituaciones(req: Request, res: Response) {
  const filters = req.query;
  // ... mapeo de filtros
  const list = await SituacionModel.list(filters);
  return res.json({ situaciones: list, count: list.length });
}

export async function getMiUnidadHoy(req: Request, res: Response) {
  const userId = req.user!.userId;
  const asig = await TurnoModel.getMiAsignacionHoy(userId);
  if (!asig) return res.json({ situaciones: [] });
  const list = await SituacionModel.getMiUnidadHoy(asig.unidad_id);
  return res.json({ situaciones: list, asignacion: asig });
}

export async function getMapaSituaciones(_req: Request, res: Response) {
  const list = await SituacionModel.getUltimaSituacionPorUnidad();
  return res.json({ unidades: list });
}

export async function getBitacoraUnidad(req: Request, res: Response) {
  const list = await SituacionModel.getBitacoraUnidad(parseInt(req.params.unidad_id), req.query);
  return res.json({ bitacora: list });
}

// ========================================
// FUNCIONES ADICIONALES
// ========================================

export async function listSituacionesActivas(_req: Request, res: Response) {
  try {
    const activas = await db.manyOrNone(`
      SELECT s.*, u.codigo as unidad_codigo, r.codigo as ruta_codigo
      FROM situacion s
      LEFT JOIN unidad u ON s.unidad_id = u.id
      LEFT JOIN ruta r ON s.ruta_id = r.id
      WHERE s.estado = 'ACTIVA'
      ORDER BY s.created_at DESC
    `);
    return res.json({ situaciones: activas });
  } catch (error: any) {
    console.error('Error listSituacionesActivas:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getTiposSituacion(_req: Request, res: Response) {
  const tipos = [
    { id: 10, codigo: 'SALIDA_SEDE', nombre: 'Salida de Sede' },
    { id: 20, codigo: 'PATRULLAJE', nombre: 'Patrullaje' },
    { id: 30, codigo: 'CAMBIO_RUTA', nombre: 'Cambio de Ruta' },
    { id: 40, codigo: 'PARADA_ESTRATEGICA', nombre: 'Parada Estratégica' },
    { id: 50, codigo: 'COMIDA', nombre: 'Comida' },
    { id: 60, codigo: 'DESCANSO', nombre: 'Descanso' },
    { id: 70, codigo: 'INCIDENTE', nombre: 'Hecho de Tránsito' },
    { id: 80, codigo: 'REGULACION_TRAFICO', nombre: 'Regulación de Tráfico' },
    { id: 90, codigo: 'ASISTENCIA_VEHICULAR', nombre: 'Asistencia Vehicular' },
    { id: 100, codigo: 'EMERGENCIA', nombre: 'Emergencia' },
    { id: 110, codigo: 'OTROS', nombre: 'Otros' },
  ];
  return res.json({ tipos });
}

export async function cerrarSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones } = req.body;
    const userId = req.user!.userId;

    const situacion = await SituacionModel.cerrar(parseInt(id), userId, observaciones);
    emitSituacionCerrada(situacion as any);

    return res.json({ message: 'Situación cerrada', situacion });
  } catch (error: any) {
    console.error('Error cerrarSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await db.none('DELETE FROM situacion WHERE id = $1', [id]);
    return res.json({ message: 'Situación eliminada' });
  } catch (error: any) {
    console.error('Error deleteSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function createDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { tipo_detalle, datos } = req.body;
    const userId = req.user!.userId;

    const detalle = await DetalleSituacionModel.create({
      situacion_id: parseInt(id),
      tipo_detalle,
      datos,
      creado_por: userId
    });

    return res.status(201).json({ detalle });
  } catch (error: any) {
    console.error('Error createDetalle:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getDetalles(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const detalles = await DetalleSituacionModel.getBySituacionId(parseInt(id));
    return res.json({ detalles });
  } catch (error: any) {
    console.error('Error getDetalles:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function updateDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { datos } = req.body;

    const detalle = await DetalleSituacionModel.update(parseInt(id), datos);
    return res.json({ detalle });
  } catch (error: any) {
    console.error('Error updateDetalle:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteDetalle(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await DetalleSituacionModel.delete(parseInt(id));
    return res.json({ message: 'Detalle eliminado' });
  } catch (error: any) {
    console.error('Error deleteDetalle:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getResumenUnidades(_req: Request, res: Response) {
  try {
    const resumen = await db.manyOrNone(`
      SELECT
        u.id as unidad_id,
        u.codigo as unidad_codigo,
        u.tipo_unidad,
        s.nombre as sede_nombre,
        (SELECT COUNT(*) FROM situacion sit WHERE sit.unidad_id = u.id AND sit.estado = 'ACTIVA') as situaciones_activas,
        (SELECT tipo_situacion FROM situacion sit WHERE sit.unidad_id = u.id ORDER BY sit.created_at DESC LIMIT 1) as ultima_situacion
      FROM unidad u
      LEFT JOIN sede s ON u.sede_id = s.id
      WHERE u.activa = true
      ORDER BY u.codigo
    `);
    return res.json({ resumen });
  } catch (error: any) {
    console.error('Error getResumenUnidades:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function cambiarTipoSituacion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { nuevo_tipo } = req.body;

    const situacion = await SituacionModel.update(parseInt(id), { tipo_situacion: nuevo_tipo } as any);
    return res.json({ message: 'Tipo cambiado', situacion });
  } catch (error: any) {
    console.error('Error cambiarTipoSituacion:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getCatalogo(_req: Request, res: Response) {
  try {
    const tipos = await db.manyOrNone('SELECT * FROM tipo_situacion WHERE activo = true ORDER BY orden');
    const tiposHecho = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'HECHO_TRANSITO' AND activo = true ORDER BY nombre"
    );
    const subtiposHecho: any[] = []; // Ya no se usan subtipos

    return res.json({ tipos, tiposHecho, subtiposHecho });
  } catch (error: any) {
    console.error('Error getCatalogo:', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getCatalogosAuxiliares(_req: Request, res: Response) {
  try {
    const tipos_hecho = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'HECHO_TRANSITO' AND activo = true ORDER BY nombre"
    );
    const tipos_asistencia = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'ASISTENCIA' AND activo = true ORDER BY nombre"
    );
    const tipos_emergencia = await db.manyOrNone(
      "SELECT id, nombre, icono, color FROM tipo_situacion_catalogo WHERE categoria = 'EMERGENCIA' AND activo = true ORDER BY nombre"
    );

    // Mantener retrocompatibilidad con subtipos_hecho vacío
    const subtipos_hecho: any[] = [];

    return res.json({ tipos_hecho, subtipos_hecho, tipos_asistencia, tipos_emergencia });
  } catch (error: any) {
    console.error('Error getCatalogosAuxiliares:', error);
    return res.status(500).json({ error: error.message });
  }
}
