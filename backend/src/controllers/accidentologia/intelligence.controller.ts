import { Request, Response } from 'express';
import { IntelligenceModel } from '../../models/accidentologia/intelligence.model';

export async function getVehiculoHistorial(req: Request, res: Response) {
  try {
    const { placa } = req.params;
    const historial = await IntelligenceModel.getVehiculoHistorial(placa);

    if (!historial) {
      return res.json({ success: true, data: { placa: placa.toUpperCase(), total_incidentes: 0, nivel_alerta: 'BAJO', incidentes: [] } });
    }
    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error obteniendo historial de vehículo:', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo historial de vehículo' });
  }
}

export async function getPilotoHistorial(req: Request, res: Response) {
  try {
    const { licencia } = req.params;
    const historial = await IntelligenceModel.getPilotoHistorial(licencia);

    if (!historial) {
      return res.json({ success: true, data: { licencia_numero: licencia, total_incidentes: 0, total_sanciones: 0, nivel_alerta: 'BAJO', incidentes: [], sanciones: [] } });
    }
    return res.json({ success: true, data: historial });
  } catch (error) {
    console.error('Error obteniendo historial de piloto:', error);
    return res.status(500).json({ success: false, message: 'Error obteniendo historial de piloto' });
  }
}

export async function getVehiculosReincidentes(req: Request, res: Response) {
  try {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = isNaN(limitRaw) ? 20 : limitRaw;
    const nivel_riesgo = req.query.nivel_riesgo as string | undefined;

    const vehiculos = await IntelligenceModel.getVehiculosReincidentes(limit, nivel_riesgo);
    res.json({ success: true, count: vehiculos.length, data: vehiculos });
  } catch (error) {
    console.error('Error obteniendo vehículos reincidentes:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo vehículos reincidentes' });
  }
}

export async function getVehiculoByPlaca(req: Request, res: Response) {
  try {
    const vehiculo = await IntelligenceModel.getVehiculoByPlaca(req.params.placa);
    if (!vehiculo) return res.status(404).json({ success: false, message: 'Vehículo no encontrado en historial de reincidentes' });
    return res.json({ success: true, data: vehiculo });
  } catch (error) {
    console.error('Error buscando vehículo:', error);
    return res.status(500).json({ success: false, message: 'Error buscando vehículo' });
  }
}

export async function getPilotosProblematicos(req: Request, res: Response) {
  try {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = isNaN(limitRaw) ? 20 : limitRaw;
    const nivel_riesgo = req.query.nivel_riesgo as string | undefined;
    const licencia_vencida = req.query.licencia_vencida === 'true';

    const pilotos = await IntelligenceModel.getPilotosProblematicos(limit, nivel_riesgo, licencia_vencida);
    res.json({ success: true, count: pilotos.length, data: pilotos });
  } catch (error) {
    console.error('Error obteniendo pilotos problemáticos:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo pilotos problemáticos' });
  }
}

export async function getPilotoByLicencia(req: Request, res: Response) {
  try {
    const piloto = await IntelligenceModel.getPilotoByLicencia(req.params.licencia);
    if (!piloto) return res.status(404).json({ success: false, message: 'Piloto no encontrado en historial de problemáticos' });
    return res.json({ success: true, data: piloto });
  } catch (error) {
    console.error('Error buscando piloto:', error);
    return res.status(500).json({ success: false, message: 'Error buscando piloto' });
  }
}

export async function getPuntosCalientes(req: Request, res: Response) {
  try {
    const limitRaw = parseInt(req.query.limit as string, 10);
    const limit = isNaN(limitRaw) ? 50 : limitRaw;
    const ruta_codigo = req.query.ruta_codigo as string | undefined;
    const nivel_peligrosidad = req.query.nivel_peligrosidad as string | undefined;

    const puntos = await IntelligenceModel.getPuntosCalientes(limit, ruta_codigo, nivel_peligrosidad);
    res.json({ success: true, count: puntos.length, data: puntos });
  } catch (error) {
    console.error('Error obteniendo puntos calientes:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo puntos calientes' });
  }
}

export async function getMapaCalor(_req: Request, res: Response) {
  try {
    const puntos = await IntelligenceModel.getMapaCalor();
    res.json({ success: true, count: puntos.length, data: puntos });
  } catch (error) {
    console.error('Error obteniendo mapa de calor:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo mapa de calor' });
  }
}

export async function getTendenciasTemporales(req: Request, res: Response) {
  try {
    const anio = req.query.anio as string | undefined;
    const mes  = req.query.mes  as string | undefined;
    const tendencias = await IntelligenceModel.getTendenciasTemporales(anio, mes);
    res.json({ success: true, count: tendencias.length, data: tendencias });
  } catch (error) {
    console.error('Error obteniendo tendencias temporales:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo tendencias temporales' });
  }
}

export async function getAnalisisDiaSemana(_req: Request, res: Response) {
  try {
    const analisis = await IntelligenceModel.getAnalisisDiaSemana();
    res.json({ success: true, data: analisis });
  } catch (error) {
    console.error('Error obteniendo análisis por día:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo análisis por día' });
  }
}

export async function getAnalisisFranjaHoraria(_req: Request, res: Response) {
  try {
    const analisis = await IntelligenceModel.getAnalisisFranjaHoraria();
    res.json({ success: true, data: analisis });
  } catch (error) {
    console.error('Error obteniendo análisis por franja horaria:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo análisis por franja horaria' });
  }
}

export async function getDashboard(_req: Request, res: Response) {
  try {
    const data = await IntelligenceModel.getDashboard();
    res.json({ success: true, data });
  } catch (error) {
    console.error('Error obteniendo dashboard:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo dashboard' });
  }
}

export async function getStats(_req: Request, res: Response) {
  try {
    const stats = await IntelligenceModel.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
  }
}

export async function getTopReincidentes(_req: Request, res: Response) {
  try {
    const [vehiculos, pilotos] = await IntelligenceModel.getTopReincidentes();
    res.json({ success: true, data: { vehiculos, pilotos } });
  } catch (error) {
    console.error('Error obteniendo top reincidentes:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo top reincidentes' });
  }
}

export async function refreshViews(_req: Request, res: Response) {
  try {
    await IntelligenceModel.refreshViews();
    res.json({ success: true, message: 'Vistas de inteligencia refrescadas exitosamente' });
  } catch (error) {
    console.error('Error refrescando vistas:', error);
    res.status(500).json({ success: false, message: 'Error refrescando vistas' });
  }
}
