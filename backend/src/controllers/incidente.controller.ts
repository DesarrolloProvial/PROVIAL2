import { Request, Response } from 'express';
import { IncidenteModel } from '../models/incidente.model';
import { TurnoModel } from '../models/turno.model';
import { SituacionModel } from '../models/situacion.model';
import { SalidaModel } from '../models/salida.model';
import { db } from '../config/database';

// ========================================
// CREAR INCIDENTE
// ========================================

export async function createIncidente(req: Request, res: Response) {
  try {
    const {
      tipo_hecho_id,
      subtipo_hecho_id,
      ruta_id,
      km,
      sentido,
      referencia_ubicacion,
      latitud,
      longitud,
      hay_heridos,
      cantidad_heridos,
      hay_fallecidos,
      cantidad_fallecidos,
      requiere_bomberos,
      requiere_pnc,
      requiere_ambulancia,
      observaciones_iniciales,
      jurisdiccion,
      direccion_detallada,
      danios_infraestructura_desc,
      danios_materiales,
      danios_infraestructura,
      vehiculos, // Array opcional de vehículos
      obstruccion, // Objeto opcional de obstrucción
      gruas, // Array opcional de grúas
      ajustadores, // Array opcional de ajustadores
      personas, // Array opcional de personas involucradas
      // Campos para la Situación
      salida_unidad_id,
      turno_id,
      asignacion_id,
    } = req.body;

    const userId = req.user!.userId;
    const userRole = req.user!.rol;

    // Determinar origen según el rol
    let origen: 'BRIGADA' | 'USUARIO_PUBLICO' | 'CENTRO_CONTROL';
    if (userRole === 'BRIGADA') {
      origen = 'BRIGADA';
    } else if (userRole === 'COP' || userRole === 'OPERACIONES') {
      origen = 'CENTRO_CONTROL';
    } else {
      origen = 'USUARIO_PUBLICO';
    }

    // Obtener información de la unidad/brigada si es BRIGADA
    let unidad_id: number | undefined;
    let brigada_id: number | undefined;

    // Variables para la situación
    let situacion_unidad_id: number | undefined;
    let situacion_salida_id: number | undefined = salida_unidad_id;
    let situacion_turno_id: number | undefined = turno_id;
    let situacion_asignacion_id: number | undefined = asignacion_id;

    if (userRole === 'BRIGADA') {
      const miAsignacion = await TurnoModel.getMiAsignacionHoy(userId);
      if (miAsignacion) {
        unidad_id = miAsignacion.unidad_id;
        brigada_id = userId; // El brigada es el usuario autenticado

        // Para la situacion
        situacion_unidad_id = miAsignacion.unidad_id;
        if (!situacion_turno_id) situacion_turno_id = miAsignacion.turno_id;
        if (!situacion_asignacion_id) situacion_asignacion_id = miAsignacion.asignacion_id;
      }

      // Intentar obtener salida activa si no viene en el body
      if (!situacion_salida_id) {
        const miSalida = await SalidaModel.getMiSalidaActiva(userId);
        if (miSalida) {
          situacion_salida_id = miSalida.salida_id;
        }
      }
    } else if (req.body.unidad_id) {
      // Si lo crea COP, usar unidad_id del body
      unidad_id = req.body.unidad_id;
      situacion_unidad_id = req.body.unidad_id;
    }

    // Generar número de reporte
    const numero_reporte = await IncidenteModel.generateNumeroReporte();

    // Crear el incidente
    const incidente = await IncidenteModel.create({
      origen,
      tipo_hecho_id,
      subtipo_hecho_id,
      ruta_id,
      km,
      sentido,
      referencia_ubicacion,
      latitud,
      longitud,
      unidad_id,
      brigada_id,
      fecha_hora_aviso: new Date(),
      hay_heridos,
      cantidad_heridos,
      hay_fallecidos,
      cantidad_fallecidos,
      requiere_bomberos,
      requiere_pnc,
      requiere_ambulancia,
      observaciones_iniciales,
      jurisdiccion,
      direccion_detallada,
      danios_infraestructura_desc,
      danios_materiales,
      danios_infraestructura,
      creado_por: userId,
    });

    // Crear la Situación correspondiente (para que aparezca en Bitácora)
    if (situacion_unidad_id) {
      await SituacionModel.create({
        tipo_situacion: 'INCIDENTE',
        unidad_id: situacion_unidad_id,
        salida_unidad_id: situacion_salida_id,
        turno_id: situacion_turno_id,
        asignacion_id: situacion_asignacion_id,
        incidente_id: incidente.id,
        ruta_id,
        km,
        sentido,
        latitud,
        longitud,
        descripcion: `Incidente ${numero_reporte}: ${observaciones_iniciales || ''}`.substring(0, 255),
        creado_por: userId,
        ubicacion_manual: req.body.ubicacion_manual || false
      });
    }

    // Actualizar el número de reporte
    await IncidenteModel.update(incidente.id, { numero_reporte }, userId);

    // Agregar vehículos si fueron proporcionados
    const vehiculoMap = new Map<number, number>(); // Map temporary index/ID to real DB ID
    if (vehiculos && Array.isArray(vehiculos)) {
      for (let i = 0; i < vehiculos.length; i++) {
        const vehiculo = vehiculos[i];
        const createdVehiculo = await IncidenteModel.addVehiculo({
          incidente_id: incidente.id,
          ...vehiculo,
        });
        // Assuming frontend sends an index or we use array index for mapping
        vehiculoMap.set(i, createdVehiculo.id);
      }
    }

    // Agregar obstrucción si fue proporcionada
    if (obstruccion) {
      await IncidenteModel.setObstruccion({
        incidente_id: incidente.id,
        descripcion_generada: obstruccion.descripcion_generada || '',
        datos_carriles_json: obstruccion.datos_carriles_json || {},
      });

      // Also update the main incidente record with obstruction details
      await IncidenteModel.update(incidente.id, {
        obstruccion_detalle: obstruccion.datos_carriles_json || {}
      }, userId);
    }

    // Agregar Grúas
    if (gruas && Array.isArray(gruas)) {
      const { GruaModel } = require('../models/grua.model');
      for (const grua of gruas) {
        let vehiculo_asignado_id = null;
        if (grua.vehiculo_idx !== undefined && vehiculoMap.has(grua.vehiculo_idx)) {
          vehiculo_asignado_id = vehiculoMap.get(grua.vehiculo_idx);
        }
        await GruaModel.create({
          incidente_id: incidente.id,
          vehiculo_asignado_id,
          ...grua
        });
      }
    }

    // Agregar Ajustadores
    if (ajustadores && Array.isArray(ajustadores)) {
      const { AjustadorModel } = require('../models/ajustador.model');
      for (const ajustador of ajustadores) {
        let vehiculo_asignado_id = null;
        if (ajustador.vehiculo_idx !== undefined && vehiculoMap.has(ajustador.vehiculo_idx)) {
          vehiculo_asignado_id = vehiculoMap.get(ajustador.vehiculo_idx);
        }
        await AjustadorModel.create({
          incidente_id: incidente.id,
          vehiculo_asignado_id,
          ...ajustador
        });
      }
    }

    // Agregar Personas Involucradas
    if (personas && Array.isArray(personas)) {
      const { PersonaModel } = require('../models/persona.model');
      for (const persona of personas) {
        let vehiculo_id = null;
        if (persona.vehiculo_idx !== undefined && vehiculoMap.has(persona.vehiculo_idx)) {
          vehiculo_id = vehiculoMap.get(persona.vehiculo_idx);
        }
        await PersonaModel.create({
          incidente_id: incidente.id,
          vehiculo_id,
          ...persona
        });
      }
    }

    // Obtener el incidente completo para devolver
    const incidenteCompleto = await IncidenteModel.getById(incidente.id);

    // TODO: Emitir evento WebSocket para tiempo real
    // io.to('cop').emit('incidente:nuevo', incidenteCompleto);

    return res.status(201).json({
      message: 'Incidente creado exitosamente',
      incidente: incidenteCompleto,
    });
  } catch (error) {
    console.error('Error en createIncidente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// OBTENER INCIDENTE POR ID/UUID
// ========================================

export async function getIncidente(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let incidente;

    // Intentar obtener por UUID primero, luego por ID
    if (id.includes('-')) {
      incidente = await IncidenteModel.getByUuid(id);
    } else {
      incidente = await IncidenteModel.getById(parseInt(id, 10));
    }

    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    // Obtener datos relacionados
    const vehiculos = await IncidenteModel.getVehiculos(incidente.id);
    const obstruccion = await IncidenteModel.getObstruccion(incidente.id);
    const recursos = await IncidenteModel.getRecursos(incidente.id);

    return res.json({
      incidente: {
        ...incidente,
        vehiculos,
        obstruccion,
        recursos,
      },
    });
  } catch (error) {
    console.error('Error en getIncidente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// LISTAR INCIDENTES
// ========================================

export async function getIncidentes(req: Request, res: Response) {
  try {
    const {
      estado,
      ruta_id,
      activos_solo,
      desde,
      hasta,
      limit = '50',
      offset = '0',
    } = req.query;

    let incidentes;

    // Si solo queremos activos
    if (activos_solo === 'true') {
      incidentes = await IncidenteModel.getActivos({
        ruta_id: ruta_id ? parseInt(ruta_id as string, 10) : undefined,
        desde: desde ? new Date(desde as string) : undefined,
      });
    } else {
      // Listar todos con filtros
      incidentes = await IncidenteModel.getAll({
        estado: estado as string | undefined,
        ruta_id: ruta_id ? parseInt(ruta_id as string, 10) : undefined,
        desde: desde ? new Date(desde as string) : undefined,
        hasta: hasta ? new Date(hasta as string) : undefined,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      });
    }

    return res.json({
      incidentes,
      total: incidentes.length,
    });
  } catch (error) {
    console.error('Error en getIncidentes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// ACTUALIZAR INCIDENTE
// ========================================

export async function updateIncidente(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incidenteId = parseInt(id, 10);
    const userId = req.user!.userId;

    // Verificar que el incidente existe
    const incidenteExistente = await IncidenteModel.getById(incidenteId);
    if (!incidenteExistente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    // Actualizar campos permitidos (Expanded list for full editing)
    const camposPermitidos = [
      'tipo_hecho_id',
      'subtipo_hecho_id',
      'ruta_id',
      'km',
      'sentido',
      'latitud',
      'longitud',
      'direccion_detallada',
      'danios_infraestructura_desc',
      'danios_materiales',
      'danios_infraestructura',
      'observaciones_iniciales',
      'observaciones_finales',
      'referencia_ubicacion',
      'condiciones_climaticas',
      'tipo_pavimento',
      'iluminacion',
      'senalizacion',
      'visibilidad',
      'causa_probable',
      'hay_heridos',
      'cantidad_heridos',
      'hay_fallecidos',
      'cantidad_fallecidos',
      'requiere_bomberos',
      'requiere_pnc',
      'requiere_ambulancia',
    ];

    const datosActualizar: any = {};
    camposPermitidos.forEach((campo) => {
      if (req.body[campo] !== undefined) {
        datosActualizar[campo] = req.body[campo];
      }
    });

    if (Object.keys(datosActualizar).length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' });
    }

    const incidenteActualizado = await IncidenteModel.update(
      incidenteId,
      datosActualizar,
      userId
    );

    // Sincronizar con Situacion (Descripción y ubicación)
    try {
      const situacion = await db.oneOrNone('SELECT id, descripcion FROM situacion WHERE incidente_id = $1', [incidenteId]);

      if (situacion) {
        const numeroReporte = incidenteActualizado.numero_reporte;
        const nuevaDescripcion = `Incidente ${numeroReporte}: ${incidenteActualizado.observaciones_iniciales || ''}`.substring(0, 255);

        const datosSituacion: any = {
          descripcion: nuevaDescripcion,
          observaciones: incidenteActualizado.observaciones_iniciales
        };

        // Sync location if changed
        if (datosActualizar.km) datosSituacion.km = datosActualizar.km;
        if (datosActualizar.ruta_id) datosSituacion.ruta_id = datosActualizar.ruta_id;
        if (datosActualizar.latitud) datosSituacion.latitud = datosActualizar.latitud;
        if (datosActualizar.longitud) datosSituacion.longitud = datosActualizar.longitud;
        if (datosActualizar.sentido) datosSituacion.sentido = datosActualizar.sentido;

        await SituacionModel.update(situacion.id, datosSituacion);
      }
    } catch (syncError) {
      console.error('Error syncing Situacion:', syncError);
      // No fallar el request principal
    }

    return res.json({
      message: 'Incidente actualizado exitosamente',
      incidente: incidenteActualizado,
    });
  } catch (error) {
    console.error('Error en updateIncidente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CAMBIAR ESTADO DEL INCIDENTE
// ========================================

export async function cambiarEstado(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { estado, fecha_hora } = req.body;
    const userId = req.user!.userId;

    const incidenteId = parseInt(id, 10);

    // Validar estado
    const estadosValidos = ['REPORTADO', 'EN_ATENCION', 'REGULACION', 'CERRADO', 'NO_ATENDIDO'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const incidenteActualizado = await IncidenteModel.updateEstado(
      incidenteId,
      estado,
      userId,
      fecha_hora ? new Date(fecha_hora) : new Date()
    );

    // TODO: Emitir evento WebSocket
    // io.to('cop').emit('incidente:cambio_estado', { id: incidenteId, estado });

    return res.json({
      message: `Estado del incidente cambiado a ${estado}`,
      incidente: incidenteActualizado,
    });
  } catch (error) {
    console.error('Error en cambiarEstado:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// AGREGAR VEHÍCULO AL INCIDENTE
// ========================================

export async function addVehiculo(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incidenteId = parseInt(id, 10);

    // Verificar que el incidente existe
    const incidente = await IncidenteModel.getById(incidenteId);
    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const vehiculo = await IncidenteModel.addVehiculo({
      incidente_id: incidenteId,
      ...req.body,
    });

    // TODO: Emitir evento WebSocket
    // io.to('cop').emit('incidente:vehiculo_agregado', { incidente_id: incidenteId, vehiculo });

    return res.status(201).json({
      message: 'Vehículo agregado exitosamente',
      vehiculo,
    });
  } catch (error) {
    console.error('Error en addVehiculo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// AGREGAR/ACTUALIZAR OBSTRUCCIÓN
// ========================================

export async function setObstruccion(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { descripcion_generada, datos_carriles_json } = req.body;
    const incidenteId = parseInt(id, 10);

    // Verificar que el incidente existe
    const incidente = await IncidenteModel.getById(incidenteId);
    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const obstruccion = await IncidenteModel.setObstruccion({
      incidente_id: incidenteId,
      descripcion_generada,
      datos_carriles_json,
    });

    // TODO: Emitir evento WebSocket
    // io.to('cop').emit('incidente:obstruccion_actualizada', { incidente_id: incidenteId, obstruccion });

    return res.json({
      message: 'Obstrucción actualizada exitosamente',
      obstruccion,
    });
  } catch (error) {
    console.error('Error en setObstruccion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// AGREGAR RECURSO
// ========================================

export async function addRecurso(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incidenteId = parseInt(id, 10);

    // Verificar que el incidente existe
    const incidente = await IncidenteModel.getById(incidenteId);
    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const recurso = await IncidenteModel.addRecurso({
      incidente_id: incidenteId,
      ...req.body,
    });

    return res.status(201).json({
      message: 'Recurso agregado exitosamente',
      recurso,
    });
  } catch (error) {
    console.error('Error en addRecurso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// CERRAR INCIDENTE
// ========================================

export async function cerrarIncidente(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { observaciones_finales, condiciones_climaticas, causa_probable } = req.body;
    const userId = req.user!.userId;

    const incidenteId = parseInt(id, 10);

    const incidenteCerrado = await IncidenteModel.cerrar(incidenteId, {
      observaciones_finales,
      condiciones_climaticas,
      causa_probable,
      actualizado_por: userId,
    });

    // TODO: Emitir evento WebSocket
    // io.to('cop').emit('incidente:cerrado', incidenteCerrado);

    return res.json({
      message: 'Incidente cerrado exitosamente',
      incidente: incidenteCerrado,
    });
  } catch (error) {
    console.error('Error en cerrarIncidente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// GENERAR MENSAJE PARA WHATSAPP (General)
// ========================================

export async function getMensajeGeneral(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incidenteId = parseInt(id, 10);

    const incidente = await IncidenteModel.getById(incidenteId);
    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    const vehiculos = await IncidenteModel.getVehiculos(incidenteId);
    const obstruccion = await IncidenteModel.getObstruccion(incidenteId);

    // Generar mensaje formateado para WhatsApp
    let mensaje = `🚨 *REPORTE DE INCIDENTE*\n\n`;
    mensaje += `📋 *Reporte:* ${incidente.numero_reporte}\n`;
    mensaje += `📍 *Ubicación:* ${incidente.ruta_codigo} Km ${incidente.km}`;

    if (incidente.sentido) {
      mensaje += ` (${incidente.sentido})`;
    }
    mensaje += `\n`;

    if (incidente.referencia_ubicacion) {
      mensaje += `📌 *Referencia:* ${incidente.referencia_ubicacion}\n`;
    }

    mensaje += `🔴 *Tipo:* ${incidente.tipo_hecho}`;
    if (incidente.subtipo_hecho) {
      mensaje += ` - ${incidente.subtipo_hecho}`;
    }
    mensaje += `\n`;

    mensaje += `⏰ *Hora:* ${new Date(incidente.fecha_hora_aviso).toLocaleString('es-GT')}\n`;

    if (incidente.unidad_codigo) {
      mensaje += `🚓 *Unidad:* ${incidente.unidad_codigo}\n`;
    }

    if (incidente.hay_heridos || incidente.hay_fallecidos) {
      mensaje += `\n⚠️ *VÍCTIMAS*\n`;
      if (incidente.hay_heridos) {
        mensaje += `🤕 Heridos: ${incidente.cantidad_heridos}\n`;
      }
      if (incidente.hay_fallecidos) {
        mensaje += `💀 Fallecidos: ${incidente.cantidad_fallecidos}\n`;
      }
    }

    if (vehiculos.length > 0) {
      mensaje += `\n🚗 *VEHÍCULOS INVOLUCRADOS*\n`;
      vehiculos.forEach((v, index) => {
        mensaje += `${index + 1}. `;
        if (v.placa) mensaje += `Placa: ${v.placa} `;
        if (v.marca_id) mensaje += `- ${v.modelo || ''} `;
        if (v.color) mensaje += `(${v.color})`;
        mensaje += `\n`;
      });
    }

    if (obstruccion) {
      mensaje += `\n🚧 *OBSTRUCCIÓN*\n`;
      mensaje += `${obstruccion.descripcion_generada}\n`;
    }

    if (incidente.requiere_bomberos || incidente.requiere_pnc || incidente.requiere_ambulancia) {
      mensaje += `\n🆘 *RECURSOS SOLICITADOS*\n`;
      if (incidente.requiere_bomberos) mensaje += `🚒 Bomberos\n`;
      if (incidente.requiere_pnc) mensaje += `👮 PNC\n`;
      if (incidente.requiere_ambulancia) mensaje += `🚑 Ambulancia\n`;
    }

    if (incidente.observaciones_iniciales) {
      mensaje += `\n📝 *Observaciones:*\n${incidente.observaciones_iniciales}\n`;
    }

    mensaje += `\n---\n`;
    mensaje += `🤖 Generado automáticamente por Provial App`;

    return res.json({
      mensaje,
    });
  } catch (error) {
    console.error('Error en getMensajeGeneral:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// GENERAR MENSAJE PARA MANDOS (Resumido)
// ========================================

export async function getMensajeMandos(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const incidenteId = parseInt(id, 10);

    const incidente = await IncidenteModel.getById(incidenteId);
    if (!incidente) {
      return res.status(404).json({ error: 'Incidente no encontrado' });
    }

    // Mensaje resumido para mandos
    let mensaje = `📊 *INCIDENTE ${incidente.numero_reporte}*\n`;
    mensaje += `${incidente.tipo_hecho} | ${incidente.ruta_codigo} Km ${incidente.km}\n`;

    if (incidente.hay_heridos || incidente.hay_fallecidos) {
      mensaje += `⚠️ Víctimas: `;
      if (incidente.hay_heridos) mensaje += `${incidente.cantidad_heridos} heridos `;
      if (incidente.hay_fallecidos) mensaje += `${incidente.cantidad_fallecidos} fallecidos`;
      mensaje += `\n`;
    }

    if (incidente.unidad_codigo) {
      mensaje += `Unidad: ${incidente.unidad_codigo}\n`;
    }

    mensaje += `Estado: ${incidente.estado}`;

    return res.json({
      mensaje,
    });
  } catch (error) {
    console.error('Error en getMensajeMandos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
