import { Request, Response } from 'express';
import { GeografiaModel } from '../../models/common/geografia.model';
import { normalizeId } from '../../utils/db.utils';

// ========================================
// RUTAS
// ========================================

export async function getRutas(_req: Request, res: Response) {
  try {
    const rutas = await GeografiaModel.getRutas();
    return res.json({ total: rutas.length, rutas });
  } catch (error) {
    console.error('Error en getRutas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getRuta(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let ruta;
    if (id.includes('-') || id.match(/^[A-Z]+/)) {
      ruta = await GeografiaModel.getRutaByCodigo(id);
    } else {
      const idNum = normalizeId(id);
      if (!idNum) return res.status(400).json({ error: 'ID inválido' });
      ruta = await GeografiaModel.getRutaById(idNum);
    }
    if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
    return res.json({ ruta });
  } catch (error) {
    console.error('Error en getRuta:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// DEPARTAMENTOS
// ========================================

export async function getDepartamentos(_req: Request, res: Response) {
  try {
    const departamentos = await GeografiaModel.getDepartamentos();
    return res.json({ total: departamentos.length, departamentos });
  } catch (error) {
    console.error('Error en getDepartamentos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getDepartamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let departamento;
    if (/^\d{2}$/.test(id)) {
      departamento = await GeografiaModel.getDepartamentoByCodigo(id);
    } else {
      const idNum = normalizeId(id);
      if (!idNum) return res.status(400).json({ error: 'ID inválido' });
      departamento = await GeografiaModel.getDepartamentoById(idNum);
    }
    if (!departamento) return res.status(404).json({ error: 'Departamento no encontrado' });
    return res.json({ departamento });
  } catch (error) {
    console.error('Error en getDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getDepartamentosPorRegion(req: Request, res: Response) {
  try {
    const { region } = req.params;
    const departamentos = await GeografiaModel.getDepartamentosPorRegion(region);
    return res.json({ region, total: departamentos.length, departamentos });
  } catch (error) {
    console.error('Error en getDepartamentosPorRegion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createDepartamento(req: Request, res: Response) {
  try {
    const { codigo, nombre, region } = req.body;
    if (!codigo || !nombre) return res.status(400).json({ error: 'codigo y nombre son requeridos' });
    const departamento = await GeografiaModel.createDepartamento({ codigo, nombre, region });
    return res.status(201).json({ message: 'Departamento creado exitosamente', departamento });
  } catch (error) {
    console.error('Error en createDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateDepartamento(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const { codigo, nombre, region } = req.body;
    const departamento = await GeografiaModel.updateDepartamento(id, { codigo, nombre, region });
    return res.json({ message: 'Departamento actualizado', departamento });
  } catch (error) {
    console.error('Error en updateDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// MUNICIPIOS
// ========================================

export async function getMunicipios(req: Request, res: Response) {
  try {
    const { departamento_id } = req.query;
    let municipios;
    if (departamento_id) {
      const depId = normalizeId(departamento_id as string);
      if (!depId) return res.status(400).json({ error: 'departamento_id inválido' });
      municipios = await GeografiaModel.getMunicipiosPorDepartamento(depId);
    } else {
      municipios = await GeografiaModel.getMunicipios();
    }
    return res.json({ total: municipios.length, municipios });
  } catch (error) {
    console.error('Error en getMunicipios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMunicipio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    let municipio;
    if (/^\d{4}$/.test(id)) {
      municipio = await GeografiaModel.getMunicipioByCodigo(id);
    } else {
      const idNum = normalizeId(id);
      if (!idNum) return res.status(400).json({ error: 'ID inválido' });
      municipio = await GeografiaModel.getMunicipioById(idNum);
    }
    if (!municipio) return res.status(404).json({ error: 'Municipio no encontrado' });
    return res.json({ municipio });
  } catch (error) {
    console.error('Error en getMunicipio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMunicipiosPorDepartamento(req: Request, res: Response) {
  try {
    const depId = normalizeId(req.params.departamento_id);
    if (!depId) return res.status(400).json({ error: 'ID inválido' });
    const municipios = await GeografiaModel.getMunicipiosPorDepartamento(depId);
    return res.json({ departamento_id: depId, total: municipios.length, municipios });
  } catch (error) {
    console.error('Error en getMunicipiosPorDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createMunicipio(req: Request, res: Response) {
  try {
    const { departamento_id, codigo, nombre } = req.body;
    if (!departamento_id || !codigo || !nombre) {
      return res.status(400).json({ error: 'departamento_id, codigo y nombre son requeridos' });
    }
    const depId = normalizeId(departamento_id);
    if (!depId) return res.status(400).json({ error: 'departamento_id inválido' });
    const municipio = await GeografiaModel.createMunicipio({ departamento_id: depId, codigo, nombre });
    return res.status(201).json({ message: 'Municipio creado exitosamente', municipio });
  } catch (error) {
    console.error('Error en createMunicipio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateMunicipio(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });
    const { departamento_id, codigo, nombre } = req.body;
    const municipio = await GeografiaModel.updateMunicipio(id, {
      departamento_id: normalizeId(departamento_id) ?? undefined,
      codigo,
      nombre,
    });
    return res.json({ message: 'Municipio actualizado', municipio });
  } catch (error) {
    console.error('Error en updateMunicipio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// BÚSQUEDA
// ========================================

export async function buscarMunicipios(req: Request, res: Response) {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'El parámetro q (texto de búsqueda) es requerido' });
    const municipios = await GeografiaModel.buscarMunicipios(q as string);
    return res.json({ query: q, total: municipios.length, municipios });
  } catch (error) {
    console.error('Error en buscarMunicipios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

// ========================================
// REGIONES
// ========================================

export async function getRegiones(_req: Request, res: Response) {
  try {
    const regiones = await GeografiaModel.getRegiones();
    return res.json({ total: regiones.length, regiones });
  } catch (error) {
    console.error('Error en getRegiones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
