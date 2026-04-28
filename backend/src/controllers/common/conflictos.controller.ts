import { Request, Response } from 'express';
import { ConflictoModel } from '../../models/common/conflicto.model';
import { normalizeId } from '../../utils/db.utils';

const TIPOS_CONFLICTO = ['DUPLICADO', 'NUMERO_USADO', 'EDICION_SIMULTANEA'];
const DECISIONES = ['USAR_LOCAL', 'USAR_SERVIDOR', 'DESCARTADO'];

export async function registrarConflicto(req: Request, res: Response) {
  try {
    const { codigo_situacion, datos_locales, datos_servidor, diferencias, tipo_conflicto } = req.body;
    const userId = req.user!.userId;

    if (!codigo_situacion) return res.status(400).json({ error: 'codigo_situacion es requerido' });
    if (!datos_locales) return res.status(400).json({ error: 'datos_locales es requerido' });
    if (!tipo_conflicto || !TIPOS_CONFLICTO.includes(tipo_conflicto)) {
      return res.status(400).json({ error: 'tipo_conflicto invalido', message: 'Debe ser: DUPLICADO, NUMERO_USADO o EDICION_SIMULTANEA' });
    }

    const existente = await ConflictoModel.getActivoUsuario(codigo_situacion, userId);
    if (existente) {
      await ConflictoModel.actualizarDatos(existente.id, datos_locales, datos_servidor, diferencias || []);
      return res.json({ conflicto_id: existente.id, message: 'Conflicto actualizado. El COP revisara esta situacion.', actualizado: true });
    }

    const situacionId = await ConflictoModel.getSituacionIdPorCodigo(codigo_situacion);
    const conflicto = await ConflictoModel.crear({
      codigo_situacion,
      situacion_existente_id: situacionId,
      datos_locales,
      datos_servidor,
      diferencias: diferencias || [],
      usuario_reporta: userId,
      tipo_conflicto,
    });

    return res.status(201).json({ conflicto_id: conflicto.id, message: 'Conflicto registrado. El COP revisara esta situacion.' });
  } catch (error) {
    console.error('[CONFLICTOS] Error al registrar conflicto:', error);
    return res.status(500).json({ error: 'Error al registrar conflicto' });
  }
}

export async function listarConflictos(req: Request, res: Response) {
  try {
    const conflictos = await ConflictoModel.listar(req.query.estado as string | undefined);
    return res.json({ conflictos, total: conflictos.length });
  } catch (error) {
    console.error('[CONFLICTOS] Error al listar conflictos:', error);
    return res.status(500).json({ error: 'Error al listar conflictos' });
  }
}

export async function obtenerConflicto(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const conflicto = await ConflictoModel.getById(id);
    if (!conflicto) return res.status(404).json({ error: 'Conflicto no encontrado' });

    return res.json(conflicto);
  } catch (error) {
    console.error('[CONFLICTOS] Error al obtener conflicto:', error);
    return res.status(500).json({ error: 'Error al obtener conflicto' });
  }
}

export async function resolverConflicto(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { decision, notas_resolucion } = req.body;
    if (!decision || !DECISIONES.includes(decision)) {
      return res.status(400).json({ error: 'decision invalida', message: 'Debe ser: USAR_LOCAL, USAR_SERVIDOR o DESCARTADO' });
    }

    const conflicto = await ConflictoModel.getById(id);
    if (!conflicto) return res.status(404).json({ error: 'Conflicto no encontrado' });
    if (conflicto.estado !== 'PENDIENTE') return res.status(400).json({ error: 'Este conflicto ya fue resuelto' });

    await ConflictoModel.resolver({
      id,
      decision,
      notas_resolucion: notas_resolucion || null,
      resuelto_por: req.user!.userId,
      situacion_existente_id: conflicto.situacion_existente_id,
      datos_locales: conflicto.datos_locales,
      usar_local: decision === 'USAR_LOCAL',
    });

    return res.json({ message: 'Conflicto resuelto exitosamente', decision, conflicto_id: id });
  } catch (error) {
    console.error('[CONFLICTOS] Error al resolver conflicto:', error);
    return res.status(500).json({ error: 'Error al resolver conflicto' });
  }
}

export async function misConflictos(req: Request, res: Response) {
  try {
    const conflictos = await ConflictoModel.getMisConflictos(req.user!.userId);
    return res.json({ conflictos, total: conflictos.length });
  } catch (error) {
    console.error('[CONFLICTOS] Error al obtener mis conflictos:', error);
    return res.status(500).json({ error: 'Error al obtener conflictos' });
  }
}
