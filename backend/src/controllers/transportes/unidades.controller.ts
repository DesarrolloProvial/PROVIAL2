import { Request, Response } from 'express';
import { UnidadModel } from '../../models/transportes/unidad.model';
import { TurnoModel } from '../../models/common/turno.model';
import { normalizeId } from '../../utils/db.utils';

export async function listarUnidades(req: Request, res: Response) {
  try {
    const user = req.user!;
    const { sede_id, activa, tipo_unidad, search } = req.query;

    const filtrarPorSede = user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes && user.sede
      ? user.sede
      : undefined;

    const unidades = await UnidadModel.getAll({
      filtrarPorSede,
      sede_id: filtrarPorSede ? undefined : (sede_id as string),
      activa: activa !== undefined ? activa === 'true' : undefined,
      tipo_unidad: tipo_unidad as string,
      search: search as string,
    });

    res.json({ unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en listarUnidades:', error);
    res.status(500).json({ error: 'Error al listar unidades' });
  }
}

export async function listarTiposUnidad(_req: Request, res: Response) {
  try {
    const tipos = await UnidadModel.getTipos();
    res.json({ tipos });
  } catch (error) {
    console.error('Error en listarTiposUnidad:', error);
    res.status(500).json({ error: 'Error al listar tipos de unidad' });
  }
}

export async function listarUnidadesActivas(req: Request, res: Response) {
  try {
    const user = req.user!;
    const sedeId = user.rol === 'ENCARGADO_NOMINAS' && !user.puede_ver_todas_sedes ? user.sede : undefined;
    const unidades = await UnidadModel.getActivas(sedeId);
    res.json({ unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en listarUnidadesActivas:', error);
    res.status(500).json({ error: 'Error al listar unidades activas' });
  }
}

export async function obtenerUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const unidad = await UnidadModel.getById(id);
    if (!unidad) return res.status(404).json({ error: 'Unidad no encontrada' });

    return res.json(unidad);
  } catch (error) {
    console.error('Error en obtenerUnidad:', error);
    return res.status(500).json({ error: 'Error al obtener unidad' });
  }
}

export async function crearUnidad(req: Request, res: Response) {
  try {
    const { codigo, tipo_unidad, sede_id } = req.body;

    if (!codigo || !tipo_unidad || !sede_id) {
      return res.status(400).json({ error: 'codigo, tipo_unidad y sede_id son requeridos' });
    }

    const existe = await UnidadModel.existeCodigo(codigo);
    if (existe) return res.status(409).json({ error: 'Ya existe una unidad con ese codigo' });

    const unidad = await UnidadModel.crear({
      codigo,
      tipo_unidad,
      marca: req.body.marca,
      modelo: req.body.modelo,
      anio: req.body.anio,
      placa: req.body.placa,
      sede_id,
      tipo_combustible: req.body.tipo_combustible,
      custom_fields: req.body.custom_fields,
    });

    return res.status(201).json({ message: 'Unidad creada exitosamente', unidad });
  } catch (error: any) {
    console.error('Error en crearUnidad:', error);
    if (error.code === '23505') return res.status(409).json({ error: 'El codigo o placa ya existe' });
    return res.status(500).json({ error: 'Error al crear unidad' });
  }
}

export async function actualizarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existe = await UnidadModel.getByIdSimple(id);
    if (!existe) return res.status(404).json({ error: 'Unidad no encontrada' });

    const result = await UnidadModel.actualizar(id, {
      tipo_unidad: req.body.tipo_unidad,
      marca: req.body.marca,
      modelo: req.body.modelo,
      anio: req.body.anio,
      placa: req.body.placa,
      sede_id: req.body.sede_id,
      tipo_combustible: req.body.tipo_combustible,
      custom_fields: req.body.custom_fields,
    });

    return res.json({ message: 'Unidad actualizada exitosamente', unidad: result });
  } catch (error) {
    console.error('Error en actualizarUnidad:', error);
    return res.status(500).json({ error: 'Error al actualizar unidad' });
  }
}

export async function desactivarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existe = await UnidadModel.getByIdSimple(id);
    if (!existe) return res.status(404).json({ error: 'Unidad no encontrada' });

    await UnidadModel.setActiva(id, false);
    return res.json({ message: 'Unidad desactivada exitosamente' });
  } catch (error) {
    console.error('Error en desactivarUnidad:', error);
    return res.status(500).json({ error: 'Error al desactivar unidad' });
  }
}

export async function activarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existe = await UnidadModel.getByIdSimple(id);
    if (!existe) return res.status(404).json({ error: 'Unidad no encontrada' });

    await UnidadModel.setActiva(id, true);
    return res.json({ message: 'Unidad activada exitosamente' });
  } catch (error) {
    console.error('Error en activarUnidad:', error);
    return res.status(500).json({ error: 'Error al activar unidad' });
  }
}

export async function transferirUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    const nuevaSedeId = normalizeId(req.body.nueva_sede_id);

    if (!id) return res.status(400).json({ error: 'ID de unidad inválido' });
    if (!nuevaSedeId) return res.status(400).json({ error: 'nueva_sede_id es requerido' });

    const unidad = await UnidadModel.getByIdSimple(id);
    if (!unidad) return res.status(404).json({ error: 'Unidad no encontrada' });

    const sedeExiste = await UnidadModel.existeSede(nuevaSedeId);
    if (!sedeExiste) return res.status(404).json({ error: 'Sede destino no encontrada' });

    await UnidadModel.transferir(id, nuevaSedeId);
    return res.json({ message: 'Unidad transferida exitosamente' });
  } catch (error) {
    console.error('Error en transferirUnidad:', error);
    return res.status(500).json({ error: 'Error al transferir unidad' });
  }
}

export async function eliminarUnidad(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const existe = await UnidadModel.getByIdSimple(id);
    if (!existe) return res.status(404).json({ error: 'Unidad no encontrada' });

    const tieneHistorial = await UnidadModel.tieneHistorialAsignaciones(id);
    if (tieneHistorial) {
      return res.status(400).json({
        error: 'No se puede eliminar la unidad porque tiene historial de asignaciones. Use desactivar en su lugar.',
      });
    }

    await UnidadModel.eliminar(id);
    return res.json({ message: 'Unidad eliminada exitosamente' });
  } catch (error) {
    console.error('Error en eliminarUnidad:', error);
    return res.status(500).json({ error: 'Error al eliminar unidad' });
  }
}

export async function obtenerUltimaAsignacion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const asignacion = await TurnoModel.getLastAsignacionByUnidad(id);
    if (!asignacion) {
      return res.status(404).json({ error: 'No se encontraron asignaciones previas para esta unidad' });
    }

    const tripulacion = await TurnoModel.getTripulacion(asignacion.id);
    return res.json({ asignacion, tripulacion });
  } catch (error) {
    console.error('Error en obtenerUltimaAsignacion:', error);
    return res.status(500).json({ error: 'Error al obtener última asignación' });
  }
}

export async function reservarNumeroSalida(req: Request, res: Response) {
  try {
    const { codigo } = req.params;

    const unidad = await UnidadModel.getByCodigo(codigo);
    if (!unidad) {
      return res.status(404).json({ error: 'Unidad no encontrada', message: `No existe unidad activa con codigo ${codigo}` });
    }

    const salidaActiva = await UnidadModel.getSalidaActiva(unidad.id);
    if (!salidaActiva) {
      return res.status(400).json({ error: 'Sin salida activa', message: 'La unidad no tiene una salida activa. Debe iniciar salida primero.' });
    }

    const total = await UnidadModel.contarSituacionesSalida(salidaActiva.salida_id);
    const siguienteNumero = total + 1;

    const hoy = new Date();
    const fechaISO = hoy.toISOString().split('T')[0];
    const validoHasta = new Date(hoy);
    validoHasta.setHours(23, 59, 59, 999);

    return res.json({
      num_situacion_salida: siguienteNumero,
      fecha: fechaISO,
      sede_id: unidad.sede_id,
      unidad_id: unidad.id,
      unidad_codigo: unidad.codigo,
      salida_id: salidaActiva.salida_id,
      valido_hasta: validoHasta.toISOString(),
    });
  } catch (error: any) {
    console.error('Error en reservarNumeroSalida:', error);
    return res.status(500).json({ error: 'Error al reservar numero' });
  }
}

export async function setDisponibilidadTransportes(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { disponible, instrucciones } = req.body as { disponible: boolean; instrucciones?: string };
    if (typeof disponible !== 'boolean') {
      return res.status(400).json({ error: 'El campo "disponible" es requerido y debe ser booleano' });
    }

    const existe = await UnidadModel.getByIdSimple(id);
    if (!existe) return res.status(404).json({ error: 'Unidad no encontrada' });

    const actualizada = await UnidadModel.setDisponibilidad(id, disponible, instrucciones ?? null);
    return res.json(actualizada);
  } catch (error: any) {
    console.error('Error en setDisponibilidadTransportes:', error);
    return res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
}
