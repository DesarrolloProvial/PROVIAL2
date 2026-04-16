import { Request, Response } from 'express';
import { CapaMapaModel } from '../../models/cop/capaMapa.model';
import { normalizeId, normalizeFloat, checkCoordenadasGuatemala } from '../../utils/db.utils';

// ========================================
// CAPAS
// ========================================

export async function listarCapas(_req: Request, res: Response) {
  try {
    const capas = await CapaMapaModel.listarCapas();
    return res.json({ capas });
  } catch (error) {
    console.error('Error en listarCapas:', error);
    return res.status(500).json({ error: 'Error al obtener capas' });
  }
}

export async function crearCapa(req: Request, res: Response) {
  try {
    const { nombre, descripcion, color, icono, visible, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });

    const capa = await CapaMapaModel.crearCapa({
      nombre,
      descripcion,
      color,
      icono,
      visible,
      orden,
      created_by: req.user!.userId,
    });
    return res.status(201).json({ capa });
  } catch (error) {
    console.error('Error en crearCapa:', error);
    return res.status(500).json({ error: 'Error al crear capa' });
  }
}

export async function actualizarCapa(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de capa inválido' });

    const capa = await CapaMapaModel.actualizarCapa(id, req.body);
    if (!capa) return res.status(404).json({ error: 'Capa no encontrada' });
    return res.json({ capa });
  } catch (error) {
    console.error('Error en actualizarCapa:', error);
    return res.status(500).json({ error: 'Error al actualizar capa' });
  }
}

export async function eliminarCapa(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de capa inválido' });

    await CapaMapaModel.eliminarCapa(id);
    return res.json({ message: 'Capa eliminada' });
  } catch (error) {
    console.error('Error en eliminarCapa:', error);
    return res.status(500).json({ error: 'Error al eliminar capa' });
  }
}

// ========================================
// PUNTOS
// ========================================

export async function getTodosPuntos(_req: Request, res: Response) {
  try {
    const puntos = await CapaMapaModel.getTodosPuntos();
    return res.json({ puntos });
  } catch (error) {
    console.error('Error en getTodosPuntos:', error);
    return res.status(500).json({ error: 'Error al obtener puntos' });
  }
}

export async function getPuntosDeCapa(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de capa inválido' });

    const puntos = await CapaMapaModel.getPuntosDeCapa(id);
    return res.json({ puntos });
  } catch (error) {
    console.error('Error en getPuntosDeCapa:', error);
    return res.status(500).json({ error: 'Error al obtener puntos' });
  }
}

export async function crearPunto(req: Request, res: Response) {
  try {
    const capa_id = normalizeId(req.params.id);
    if (!capa_id) return res.status(400).json({ error: 'ID de capa inválido' });

    const { titulo, descripcion, latitud, longitud, categoria, icono_url, datos } = req.body;

    if (!titulo) {
      return res.status(400).json({ error: 'titulo es requerido' });
    }

    const lat = normalizeFloat(latitud);
    const lon = normalizeFloat(longitud);

    if (lat === null || lon === null) {
      return res.status(400).json({ error: 'latitud y longitud son requeridos y deben ser números válidos' });
    }

    const punto = await CapaMapaModel.crearPunto({
      capa_id, titulo, descripcion, latitud: lat, longitud: lon,
      categoria, icono_url, datos, created_by: req.user!.userId,
    });

    const advertencia = checkCoordenadasGuatemala(lat, lon);
    return res.status(201).json({ punto, ...(advertencia && { advertencia }) });
  } catch (error) {
    console.error('Error en crearPunto:', error);
    return res.status(500).json({ error: 'Error al crear punto' });
  }
}

export async function actualizarPunto(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de punto inválido' });

    const patch = { ...req.body };

    // Validar y normalizar coordenadas si vienen en el patch
    if (patch.latitud !== undefined) {
      const lat = normalizeFloat(patch.latitud);
      if (lat === null) return res.status(400).json({ error: 'latitud debe ser un número válido' });
      patch.latitud = lat;
    }
    if (patch.longitud !== undefined) {
      const lon = normalizeFloat(patch.longitud);
      if (lon === null) return res.status(400).json({ error: 'longitud debe ser un número válido' });
      patch.longitud = lon;
    }

    const punto = await CapaMapaModel.actualizarPunto(id, patch);
    if (!punto) return res.status(404).json({ error: 'Punto no encontrado' });

    // Advertencia de coordenadas solo si ambas están presentes tras el update
    const advertencia = (punto.latitud != null && punto.longitud != null)
      ? checkCoordenadasGuatemala(punto.latitud, punto.longitud)
      : null;

    return res.json({ punto, ...(advertencia && { advertencia }) });
  } catch (error) {
    console.error('Error en actualizarPunto:', error);
    return res.status(500).json({ error: 'Error al actualizar punto' });
  }
}

export async function eliminarPunto(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID de punto inválido' });

    await CapaMapaModel.eliminarPunto(id);
    return res.json({ message: 'Punto eliminado' });
  } catch (error) {
    console.error('Error en eliminarPunto:', error);
    return res.status(500).json({ error: 'Error al eliminar punto' });
  }
}
