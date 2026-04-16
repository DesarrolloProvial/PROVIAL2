import { Request, Response } from 'express';
import { GeografiaModel } from '../models/geografia.model';

// ========================================
// RUTAS
// ========================================

export async function getRutas(_req: Request, res: Response) {
  try {
    const rutas = await GeografiaModel.getRutas();

    return res.json({
      total: rutas.length,
      rutas,
    });
  } catch (error) {
    console.error('Error en getRutas:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getRuta(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let ruta;

    // Si parece un código (CA-1, CA-9, etc), buscar por código
    if (id.includes('-') || id.match(/^[A-Z]+/)) {
      ruta = await GeografiaModel.getRutaByCodigo(id);
    } else {
      ruta = await GeografiaModel.getRutaById(parseInt(id, 10));
    }

    if (!ruta) {
      return res.status(404).json({ error: 'Ruta no encontrada' });
    }

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

    return res.json({
      total: departamentos.length,
      departamentos,
    });
  } catch (error) {
    console.error('Error en getDepartamentos:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getDepartamento(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let departamento;

    // Si el parámetro parece un código (2 dígitos), buscar por código
    if (/^\d{2}$/.test(id)) {
      departamento = await GeografiaModel.getDepartamentoByCodigo(id);
    } else {
      departamento = await GeografiaModel.getDepartamentoById(parseInt(id, 10));
    }

    if (!departamento) {
      return res.status(404).json({ error: 'Departamento no encontrado' });
    }

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

    return res.json({
      region,
      total: departamentos.length,
      departamentos,
    });
  } catch (error) {
    console.error('Error en getDepartamentosPorRegion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createDepartamento(req: Request, res: Response) {
  try {
    const { codigo, nombre, region } = req.body;

    if (!codigo || !nombre) {
      return res.status(400).json({
        error: 'codigo y nombre son requeridos',
      });
    }

    const departamento = await GeografiaModel.createDepartamento({
      codigo,
      nombre,
      region,
    });

    return res.status(201).json({
      message: 'Departamento creado exitosamente',
      departamento,
    });
  } catch (error) {
    console.error('Error en createDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateDepartamento(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { codigo, nombre, region } = req.body;

    const departamento = await GeografiaModel.updateDepartamento(parseInt(id, 10), {
      codigo,
      nombre,
      region,
    });

    return res.json({
      message: 'Departamento actualizado',
      departamento,
    });
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
      municipios = await GeografiaModel.getMunicipiosPorDepartamento(parseInt(departamento_id as string, 10));
    } else {
      municipios = await GeografiaModel.getMunicipios();
    }

    return res.json({
      total: municipios.length,
      municipios,
    });
  } catch (error) {
    console.error('Error en getMunicipios:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMunicipio(req: Request, res: Response) {
  try {
    const { id } = req.params;

    let municipio;

    // Si el parámetro parece un código (4 dígitos), buscar por código
    if (/^\d{4}$/.test(id)) {
      municipio = await GeografiaModel.getMunicipioByCodigo(id);
    } else {
      municipio = await GeografiaModel.getMunicipioById(parseInt(id, 10));
    }

    if (!municipio) {
      return res.status(404).json({ error: 'Municipio no encontrado' });
    }

    return res.json({ municipio });
  } catch (error) {
    console.error('Error en getMunicipio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMunicipiosPorDepartamento(req: Request, res: Response) {
  try {
    const { departamento_id } = req.params;

    const municipios = await GeografiaModel.getMunicipiosPorDepartamento(parseInt(departamento_id, 10));

    return res.json({
      departamento_id: parseInt(departamento_id, 10),
      total: municipios.length,
      municipios,
    });
  } catch (error) {
    console.error('Error en getMunicipiosPorDepartamento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function createMunicipio(req: Request, res: Response) {
  try {
    const { departamento_id, codigo, nombre } = req.body;

    if (!departamento_id || !codigo || !nombre) {
      return res.status(400).json({
        error: 'departamento_id, codigo y nombre son requeridos',
      });
    }

    const municipio = await GeografiaModel.createMunicipio({
      departamento_id: parseInt(departamento_id, 10),
      codigo,
      nombre,
    });

    return res.status(201).json({
      message: 'Municipio creado exitosamente',
      municipio,
    });
  } catch (error) {
    console.error('Error en createMunicipio:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function updateMunicipio(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { departamento_id, codigo, nombre } = req.body;

    const municipio = await GeografiaModel.updateMunicipio(parseInt(id, 10), {
      departamento_id: departamento_id ? parseInt(departamento_id, 10) : undefined,
      codigo,
      nombre,
    });

    return res.json({
      message: 'Municipio actualizado',
      municipio,
    });
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

    if (!q) {
      return res.status(400).json({
        error: 'El parámetro q (texto de búsqueda) es requerido',
      });
    }

    const municipios = await GeografiaModel.buscarMunicipios(q as string);

    return res.json({
      query: q,
      total: municipios.length,
      municipios,
    });
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

    return res.json({
      total: regiones.length,
      regiones,
    });
  } catch (error) {
    console.error('Error en getRegiones:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
