import { Request, Response } from 'express';
import { AsignacionTransporteModel } from '../../models/transportes/asignacionTransporte.model';
import { normalizeId } from '../../utils/db.utils';
import { JWTPayload } from '../../utils/jwt';

function puedeVerTodasSedes(user: JWTPayload): boolean {
  return ['ADMIN', 'SUPER_ADMIN', 'ADMIN_TRANSPORTES'].includes(user.rol) || !!user.puede_ver_todas_sedes;
}

export async function getBorradoresPendientes(req: Request, res: Response) {
  try {
    const sedeFiltro = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
    const borradores = await AsignacionTransporteModel.getBorradoresPendientes(sedeFiltro);
    res.json(borradores);
  } catch (error: any) {
    console.error('Error en getBorradoresPendientes:', error);
    res.status(500).json({ error: 'Error al obtener los borradores', details: error.message });
  }
}

export async function getUnidadesDisponibles(req: Request, res: Response) {
  try {
    const sedeFiltro = puedeVerTodasSedes(req.user!) ? undefined : req.user!.sede;
    const unidades = await AsignacionTransporteModel.getUnidadesDisponibles(sedeFiltro);
    res.json(unidades);
  } catch (error: any) {
    console.error('Error en getUnidadesDisponibles:', error);
    res.status(500).json({ error: 'Error al obtener unidades', details: error.message });
  }
}

export async function asignarUnidad(req: Request, res: Response) {
  try {
    const asignacionId = normalizeId(req.params.asignacionId);
    const unidadId = normalizeId(req.body.unidadId);

    if (!asignacionId) return res.status(400).json({ error: 'asignacionId inválido' });
    if (!unidadId) return res.status(400).json({ error: 'unidadId inválido' });

    await AsignacionTransporteModel.asignarUnidad(asignacionId, unidadId);

    // Aquí podríamos emitir un evento socket si tuviéramos acceso a io,
    // notificando a Operaciones que la unidad está lista para publicarse.
    
    res.json({ message: 'Unidad asignada exitosamente' });
  } catch (error: any) {
    console.error('Error en asignarUnidad:', error);
    
    if (error.message === 'UNIDAD_NO_DISPONIBLE_O_EN_TALLER') {
      return res.status(400).json({ error: 'La unidad seleccionada no está disponible o se encuentra en taller' });
    }
    if (error.message === 'UNIDAD_YA_ASIGNADA_EN_ESTA_FECHA') {
      return res.status(400).json({ error: 'Esta unidad ya tiene programada otra salida para la misma fecha' });
    }
    if (error.message === 'ASIGNACION_NO_ENCONTRADA') {
      return res.status(404).json({ error: 'El borrador de asignación no existe' });
    }

    res.status(500).json({ error: 'Error al asignar la unidad', details: error.message });
  }
}
