import { Request, Response } from 'express';
import { IngresoModel } from '../../models/common/ingreso.model';
import { normalizeId, parseIndicador } from '../../utils/db.utils';
import { resolveContextoActivo } from '../../utils/operaciones.utils';

const TIPOS_INGRESO_VALIDOS = [
  'COMBUSTIBLE', 'COMISION', 'APOYO', 'ALMUERZO', 'MANTENIMIENTO',
  'FINALIZACION', 'FINALIZAR_JORNADA', 'FINALIZACION_JORNADA', 'INGRESO_TEMPORAL',
];

export async function registrarIngreso(req: Request, res: Response) {
  try {
    const { sede_id, tipo_ingreso, km_ingreso, combustible_ingreso, combustible_fraccion, observaciones } = req.body;
    const userId = req.user!.userId;

    if (!tipo_ingreso || !sede_id) {
      return res.status(400).json({ error: 'Campos requeridos faltantes', required: ['tipo_ingreso', 'sede_id'] });
    }
    if (!TIPOS_INGRESO_VALIDOS.includes(tipo_ingreso)) {
      return res.status(400).json({ error: 'Tipo de ingreso inválido', tipos_validos: TIPOS_INGRESO_VALIDOS });
    }

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({ error: 'No tienes salida activa para registrar un ingreso', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const ingreso = await IngresoModel.registrar({
      salida_id: ctx.salida_id,
      sede_id: normalizeId(sede_id)!,
      tipo_ingreso,
      km_ingreso: normalizeId(km_ingreso),
      combustible_ingreso: parseIndicador(combustible_fraccion ?? combustible_ingreso),
      observaciones: observaciones || null,
      userId,
    });

    return res.status(201).json({
      message: 'Ingreso a sede registrado exitosamente',
      ingreso,
      instruccion: tipo_ingreso === 'FINALIZACION_JORNADA'
        ? 'Cuando estés listo, pulsa "Finalizar Jornada" para cerrar el día.'
        : 'Para volver a salir, registra una salida de sede.',
    });
  } catch (error) {
    console.error('registrarIngreso:', error);
    if ((error as any).code === '23505' || (error as any).message?.includes('ya existe un ingreso activo')) {
      return res.status(409).json({
        error: 'Ya tienes un ingreso activo',
        message: 'Debes registrar salida de sede antes de ingresar nuevamente',
      });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function finalizarJornada(req: Request, res: Response) {
  try {
    const { km_ingreso, combustible_ingreso, combustible_fraccion, observaciones, confirmar = false } = req.body;
    const userId = req.user!.userId;

    if (!km_ingreso) return res.status(400).json({ error: 'El kilometraje final es requerido' });

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id || !ctx.unidad_id) {
      return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const contexto = await IngresoModel.getContextoFinalizacion(ctx.salida_id);
    if (!contexto) {
      return res.status(412).json({ error: 'Debes ingresar a sede antes de finalizar la jornada', code: 'SIN_INGRESO_ACTIVO' });
    }

    if (contexto.tipo_ingreso !== 'FINALIZACION_JORNADA') {
      return res.status(409).json({
        error: 'Tienes un ingreso temporal activo',
        message: `El ingreso actual es de tipo "${contexto.tipo_ingreso}". Para finalizar la jornada, primero registra un ingreso de tipo "Finalizar Jornada".`,
        code: 'INGRESO_TEMPORAL_ACTIVO',
      });
    }

    const sedeMismatch = contexto.ingreso_sede_id !== contexto.unidad_sede_id;
    if (sedeMismatch && !confirmar) {
      return res.status(200).json({
        requiere_confirmacion: true,
        advertencia: `La unidad está asignada a "${contexto.unidad_sede_nombre}", pero el ingreso activo es en "${contexto.ingreso_sede_nombre}". ¿Estás seguro de que quieres finalizar la jornada en una sede diferente?`,
        ingreso_sede: contexto.ingreso_sede_nombre,
        unidad_sede: contexto.unidad_sede_nombre,
      });
    }

    await IngresoModel.finalizarJornada({
      ingresoId: contexto.ingreso_id,
      salidaId: ctx.salida_id,
      kmVal: normalizeId(km_ingreso),
      indicador: parseIndicador(combustible_fraccion ?? combustible_ingreso),
      observaciones: observaciones || null,
      userId,
    });

    return res.json({
      message: 'Jornada finalizada exitosamente. La unidad y tripulación han sido liberadas.',
      sede_ingreso: contexto.ingreso_sede_nombre,
      sede_diferente: sedeMismatch,
    });
  } catch (error) {
    console.error('Error en finalizarJornada:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function registrarSalidaDeSede(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_salida, combustible_salida, combustible_fraccion, observaciones } = req.body;
    const userId = req.user!.userId;

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id) {
      return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const ingreso = await IngresoModel.getByIdSimple(id);
    if (!ingreso) return res.status(404).json({ error: 'Ingreso activo no encontrado' });
    if (ingreso.salida_unidad_id !== ctx.salida_id) {
      return res.status(403).json({ error: 'Este ingreso no pertenece a tu salida activa' });
    }
    if (ingreso.es_ingreso_final) {
      return res.status(400).json({ error: 'No se puede salir de un ingreso final' });
    }

    const ingresoActualizado = await IngresoModel.registrarSalida(id, {
      km_salida: normalizeId(km_salida),
      indicador: parseIndicador(combustible_fraccion ?? combustible_salida),
      observaciones: observaciones || null,
    });

    return res.json({
      message: 'Salida de sede registrada exitosamente',
      ingreso: ingresoActualizado,
      instruccion: 'Puedes continuar patrullando y registrando situaciones',
    });
  } catch (error) {
    console.error('Error en registrarSalidaDeSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMiIngresoActivo(req: Request, res: Response) {
  try {
    const ctx = await resolveContextoActivo(req.user!.userId);
    if (!ctx.salida_id) {
      return res.status(412).json({ error: 'No tienes salida activa', code: 'NO_CONTEXTO_OPERATIVO' });
    }

    const ingresoActivo = await IngresoModel.getActivoEnSalida(ctx.salida_id);
    if (!ingresoActivo) {
      return res.status(404).json({ error: 'No tienes ingreso activo', message: 'Estás en la calle, no en sede' });
    }

    return res.json(ingresoActivo);
  } catch (error) {
    console.error('Error en getMiIngresoActivo:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMisIngresosHoy(req: Request, res: Response) {
  try {
    const ctx = await resolveContextoActivo(req.user!.userId);
    if (!ctx.salida_id) return res.json({ ingresos: [], total: 0, message: 'No tienes salida activa' });

    const ingresos = await IngresoModel.getBySalida(ctx.salida_id);
    return res.json({ salida_id: ctx.salida_id, ingresos, total: ingresos.length });
  } catch (error) {
    console.error('Error en getMisIngresosHoy:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getHistorialIngresos(req: Request, res: Response) {
  try {
    const salidaId = normalizeId(req.params.salidaId);
    if (!salidaId) return res.status(400).json({ error: 'salidaId inválido' });

    const ingresos = await IngresoModel.getBySalida(salidaId);
    return res.json({ salida_id: salidaId, ingresos, total: ingresos.length });
  } catch (error) {
    console.error('Error en getHistorialIngresos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getIngreso(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const ingreso = await IngresoModel.getById(id);
    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado' });

    return res.json(ingreso);
  } catch (error) {
    console.error('Error en getIngreso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function editarIngreso(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { km_ingreso, combustible_ingreso, combustible_fraccion, observaciones_ingreso } = req.body;
    const userId = req.user!.userId;

    const ingreso = await IngresoModel.getByIdSimple(id);
    if (!ingreso) return res.status(404).json({ error: 'Ingreso no encontrado' });

    const ctx = await resolveContextoActivo(userId);
    if (!ctx.salida_id || ctx.salida_id !== ingreso.salida_unidad_id) {
      return res.status(403).json({ error: 'No tienes permiso para editar este ingreso' });
    }

    const indicador = parseIndicador(combustible_fraccion ?? combustible_ingreso);
    const hasKm = km_ingreso !== undefined;
    const hasCombustible = indicador !== null;
    const hasObs = observaciones_ingreso !== undefined;

    if (!hasKm && !hasCombustible && !hasObs) {
      return res.status(400).json({
        error: 'Debes proporcionar al menos un campo para editar',
        campos_permitidos: ['km_ingreso', 'combustible_ingreso', 'combustible_fraccion', 'observaciones_ingreso'],
      });
    }

    const updated = await IngresoModel.editar(id, {
      km_ingreso: hasKm ? normalizeId(km_ingreso) : undefined,
      combustible: hasCombustible ? indicador : undefined,
      observaciones_ingreso: hasObs ? observaciones_ingreso : undefined,
    });

    return res.json({ message: 'Ingreso actualizado correctamente', ingreso: updated });
  } catch (error) {
    console.error('Error en editarIngreso:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
