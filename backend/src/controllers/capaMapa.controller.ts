import { Request, Response } from 'express';
import { CapaMapaModel } from '../models/capaMapa.model';

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
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const { nombre, descripcion, color, icono, visible, orden } = req.body;
    if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
    const capa = await CapaMapaModel.crearCapa({ nombre, descripcion, color, icono, visible, orden, created_by: req.user.userId });
    return res.status(201).json({ capa });
  } catch (error) {
    console.error('Error en crearCapa:', error);
    return res.status(500).json({ error: 'Error al crear capa' });
  }
}

export async function actualizarCapa(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const capa = await CapaMapaModel.actualizarCapa(parseInt(id), req.body);
    if (!capa) return res.status(404).json({ error: 'Capa no encontrada' });
    return res.json({ capa });
  } catch (error) {
    console.error('Error en actualizarCapa:', error);
    return res.status(500).json({ error: 'Error al actualizar capa' });
  }
}

export async function eliminarCapa(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await CapaMapaModel.eliminarCapa(parseInt(id));
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error en eliminarCapa:', error);
    return res.status(500).json({ error: 'Error al eliminar capa' });
  }
}

export async function getPuntosDeCapa(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const puntos = await CapaMapaModel.getPuntosDeCapa(parseInt(id));
    return res.json({ puntos });
  } catch (error) {
    console.error('Error en getPuntosDeCapa:', error);
    return res.status(500).json({ error: 'Error al obtener puntos' });
  }
}

export async function getTodosPuntos(_req: Request, res: Response) {
  try {
    const puntos = await CapaMapaModel.getTodosPuntos();
    return res.json({ puntos });
  } catch (error) {
    console.error('Error en getTodosPuntos:', error);
    return res.status(500).json({ error: 'Error al obtener puntos' });
  }
}

export async function crearPunto(req: Request, res: Response) {
  try {
    if (!req.user) return res.status(401).json({ error: 'No autorizado' });
    const { id: capa_id } = req.params;
    const { titulo, descripcion, latitud, longitud, categoria, icono_url, datos } = req.body;
    if (!titulo || latitud === undefined || longitud === undefined) {
      return res.status(400).json({ error: 'titulo, latitud y longitud son requeridos' });
    }
    const punto = await CapaMapaModel.crearPunto({
      capa_id: parseInt(capa_id), titulo, descripcion, latitud: parseFloat(latitud),
      longitud: parseFloat(longitud), categoria, icono_url, datos, created_by: req.user.userId,
    });
    return res.status(201).json({ punto });
  } catch (error) {
    console.error('Error en crearPunto:', error);
    return res.status(500).json({ error: 'Error al crear punto' });
  }
}

export async function actualizarPunto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const punto = await CapaMapaModel.actualizarPunto(parseInt(id), req.body);
    if (!punto) return res.status(404).json({ error: 'Punto no encontrado' });
    return res.json({ punto });
  } catch (error) {
    console.error('Error en actualizarPunto:', error);
    return res.status(500).json({ error: 'Error al actualizar punto' });
  }
}

export async function eliminarPunto(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await CapaMapaModel.eliminarPunto(parseInt(id));
    return res.json({ ok: true });
  } catch (error) {
    console.error('Error en eliminarPunto:', error);
    return res.status(500).json({ error: 'Error al eliminar punto' });
  }
}
