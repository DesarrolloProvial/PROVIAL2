import { Request, Response } from 'express';
import { AccidentologiaModel } from '../models/accidentologia.model';

// ============================================
// CONTROLADOR DE ACCIDENTOLOGÍA
// ============================================

export const AccidentologiaController = {
  /**
   * Crear hoja de accidentología
   * POST /api/accidentologia
   */
  async crear(req: Request, res: Response) {
    try {
      const usuarioId = (req as any).user.userId;
      const data = req.body;

      if (!data.situacion_id || !data.tipo_accidente) {
        return res.status(400).json({
          error: 'situacion_id y tipo_accidente son requeridos'
        });
      }

      // Verificar que no exista ya una hoja para esta situación
      const existente = await AccidentologiaModel.obtenerPorSituacion(data.situacion_id);
      if (existente) {
        return res.status(400).json({
          error: 'Ya existe una hoja de accidentología para esta situación',
          hoja_id: existente.id
        });
      }

      const id = await AccidentologiaModel.crear({
        ...data,
        elaborado_por: usuarioId
      });

      res.status(201).json({
        message: 'Hoja de accidentología creada',
        id
      });
    } catch (error) {
      console.error('Error creando hoja:', error);
      res.status(500).json({ error: 'Error al crear hoja de accidentología' });
    }
  },

  /**
   * Actualizar hoja de accidentología
   * PUT /api/accidentologia/:id
   */
  async actualizar(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const data = req.body;

      const hoja = await AccidentologiaModel.obtenerPorId(id);
      if (!hoja) {
        return res.status(404).json({ error: 'Hoja no encontrada' });
      }

      await AccidentologiaModel.actualizar(id, data);

      res.json({ message: 'Hoja actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando hoja:', error);
      res.status(500).json({ error: 'Error al actualizar hoja' });
    }
  },

  /**
   * Obtener hoja por ID (completa con vehículos y personas)
   * GET /api/accidentologia/:id
   */
  async obtenerPorId(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const hoja = await AccidentologiaModel.obtenerHojaCompleta(id);

      if (!hoja) {
        return res.status(404).json({ error: 'Hoja no encontrada' });
      }

      res.json(hoja);
    } catch (error) {
      console.error('Error obteniendo hoja:', error);
      res.status(500).json({ error: 'Error al obtener hoja' });
    }
  },

  /**
   * Obtener hoja por situación
   * GET /api/accidentologia/situacion/:situacionId
   */
  async obtenerPorSituacion(req: Request, res: Response) {
    try {
      const situacionId = parseInt(req.params.situacionId);
      const hoja = await AccidentologiaModel.obtenerPorSituacion(situacionId);

      if (!hoja) {
        return res.json(null);
      }

      const completa = await AccidentologiaModel.obtenerHojaCompleta(hoja.id);
      res.json(completa);
    } catch (error) {
      console.error('Error obteniendo hoja:', error);
      res.status(500).json({ error: 'Error al obtener hoja' });
    }
  },

  /**
   * Listar hojas de accidentología
   * GET /api/accidentologia
   */
  async listar(req: Request, res: Response) {
    try {
      const { tipo_accidente, estado, fecha_desde, fecha_hasta, limit, offset } = req.query;

      const hojas = await AccidentologiaModel.listar({
        tipo_accidente: tipo_accidente as string,
        estado: estado as string,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0
      });

      res.json(hojas);
    } catch (error) {
      console.error('Error listando hojas:', error);
      res.status(500).json({ error: 'Error al listar hojas' });
    }
  },

  /**
   * Cambiar estado de la hoja
   * PUT /api/accidentologia/:id/estado
   */
  async cambiarEstado(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const usuarioId = (req as any).user.userId;
      const { estado } = req.body;

      const estadosValidos = ['BORRADOR', 'COMPLETO', 'REVISADO', 'ENVIADO'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({
          error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}`
        });
      }

      await AccidentologiaModel.cambiarEstado(id, estado, usuarioId);

      res.json({ message: 'Estado actualizado' });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      res.status(500).json({ error: 'Error al cambiar estado' });
    }
  },

  // ============================================
  // VEHÍCULOS
  // ============================================

  /**
   * Agregar vehículo
   * POST /api/accidentologia/:id/vehiculos
   */
  async agregarVehiculo(req: Request, res: Response) {
    try {
      const hojaId = parseInt(req.params.id);
      const data = req.body;

      if (!data.tipo_vehiculo || !data.numero_vehiculo) {
        return res.status(400).json({
          error: 'tipo_vehiculo y numero_vehiculo son requeridos'
        });
      }

      const vehiculoId = await AccidentologiaModel.agregarVehiculo({
        ...data,
        hoja_accidentologia_id: hojaId
      });

      res.status(201).json({
        message: 'Vehículo agregado',
        id: vehiculoId
      });
    } catch (error) {
      console.error('Error agregando vehículo:', error);
      res.status(500).json({ error: 'Error al agregar vehículo' });
    }
  },

  /**
   * Actualizar vehículo
   * PUT /api/accidentologia/vehiculos/:vehiculoId
   */
  async actualizarVehiculo(req: Request, res: Response) {
    try {
      const vehiculoId = parseInt(req.params.vehiculoId);
      await AccidentologiaModel.actualizarVehiculo(vehiculoId, req.body);

      res.json({ message: 'Vehículo actualizado' });
    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      res.status(500).json({ error: 'Error al actualizar vehículo' });
    }
  },

  /**
   * Eliminar vehículo
   * DELETE /api/accidentologia/vehiculos/:vehiculoId
   */
  async eliminarVehiculo(req: Request, res: Response) {
    try {
      const vehiculoId = parseInt(req.params.vehiculoId);
      await AccidentologiaModel.eliminarVehiculo(vehiculoId);

      res.json({ message: 'Vehículo eliminado' });
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      res.status(500).json({ error: 'Error al eliminar vehículo' });
    }
  },

  /**
   * Obtener vehículos de una hoja
   * GET /api/accidentologia/:id/vehiculos
   */
  async listarVehiculos(req: Request, res: Response) {
    try {
      const hojaId = parseInt(req.params.id);
      const vehiculos = await AccidentologiaModel.obtenerVehiculos(hojaId);

      res.json(vehiculos);
    } catch (error) {
      console.error('Error listando vehículos:', error);
      res.status(500).json({ error: 'Error al listar vehículos' });
    }
  },

  // ============================================
  // PERSONAS
  // ============================================

  /**
   * Agregar persona afectada
   * POST /api/accidentologia/:id/personas
   */
  async agregarPersona(req: Request, res: Response) {
    try {
      const hojaId = parseInt(req.params.id);
      const data = req.body;

      if (!data.tipo_persona || !data.estado) {
        return res.status(400).json({
          error: 'tipo_persona y estado son requeridos'
        });
      }

      const personaId = await AccidentologiaModel.agregarPersona({
        ...data,
        hoja_accidentologia_id: hojaId
      });

      res.status(201).json({
        message: 'Persona agregada',
        id: personaId
      });
    } catch (error) {
      console.error('Error agregando persona:', error);
      res.status(500).json({ error: 'Error al agregar persona' });
    }
  },

  /**
   * Actualizar persona
   * PUT /api/accidentologia/personas/:personaId
   */
  async actualizarPersona(req: Request, res: Response) {
    try {
      const personaId = parseInt(req.params.personaId);
      await AccidentologiaModel.actualizarPersona(personaId, req.body);

      res.json({ message: 'Persona actualizada' });
    } catch (error) {
      console.error('Error actualizando persona:', error);
      res.status(500).json({ error: 'Error al actualizar persona' });
    }
  },

  /**
   * Eliminar persona
   * DELETE /api/accidentologia/personas/:personaId
   */
  async eliminarPersona(req: Request, res: Response) {
    try {
      const personaId = parseInt(req.params.personaId);
      await AccidentologiaModel.eliminarPersona(personaId);

      res.json({ message: 'Persona eliminada' });
    } catch (error) {
      console.error('Error eliminando persona:', error);
      res.status(500).json({ error: 'Error al eliminar persona' });
    }
  },

  /**
   * Obtener personas de una hoja
   * GET /api/accidentologia/:id/personas
   */
  async listarPersonas(req: Request, res: Response) {
    try {
      const hojaId = parseInt(req.params.id);
      const personas = await AccidentologiaModel.obtenerPersonas(hojaId);

      res.json(personas);
    } catch (error) {
      console.error('Error listando personas:', error);
      res.status(500).json({ error: 'Error al listar personas' });
    }
  },

  // ============================================
  // ESTADÍSTICAS
  // ============================================

  /**
   * Obtener estadísticas de accidentología
   * GET /api/accidentologia/estadisticas
   */
  async estadisticas(req: Request, res: Response) {
    try {
      const { fecha_desde, fecha_hasta, sede_id } = req.query;

      const stats = await AccidentologiaModel.obtenerEstadisticas({
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        sede_id: sede_id ? parseInt(sede_id as string) : undefined
      });

      res.json(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  },

  /**
   * Obtener tipos de accidente (para dropdowns)
   * GET /api/accidentologia/tipos
   */
  async tiposAccidente(_req: Request, res: Response) {
    try {
      res.json({
        tipos_accidente: [
          { value: 'COLISION_FRONTAL', label: 'Colisión Frontal' },
          { value: 'COLISION_LATERAL', label: 'Colisión Lateral' },
          { value: 'COLISION_TRASERA', label: 'Colisión Trasera' },
          { value: 'VOLCADURA', label: 'Volcadura' },
          { value: 'ATROPELLO', label: 'Atropello' },
          { value: 'CAIDA_DE_MOTO', label: 'Caída de Moto' },
          { value: 'SALIDA_DE_CARRIL', label: 'Salida de Carril' },
          { value: 'CHOQUE_OBJETO_FIJO', label: 'Choque con Objeto Fijo' },
          { value: 'MULTIPLE', label: 'Múltiple' },
          { value: 'OTRO', label: 'Otro' }
        ],
        tipos_vehiculo: [
          { value: 'AUTOMOVIL', label: 'Automóvil' },
          { value: 'PICKUP', label: 'Pickup' },
          { value: 'CAMION', label: 'Camión' },
          { value: 'BUS', label: 'Bus' },
          { value: 'MOTOCICLETA', label: 'Motocicleta' },
          { value: 'BICICLETA', label: 'Bicicleta' },
          { value: 'PEATON', label: 'Peatón' },
          { value: 'TRAILER', label: 'Trailer' },
          { value: 'MAQUINARIA', label: 'Maquinaria' },
          { value: 'OTRO', label: 'Otro' }
        ],
        estados_persona: [
          { value: 'ILESO', label: 'Ileso' },
          { value: 'HERIDO_LEVE', label: 'Herido Leve' },
          { value: 'HERIDO_MODERADO', label: 'Herido Moderado' },
          { value: 'HERIDO_GRAVE', label: 'Herido Grave' },
          { value: 'FALLECIDO', label: 'Fallecido' }
        ],
        tipos_lesion: [
          { value: 'NINGUNA', label: 'Ninguna' },
          { value: 'CONTUSIONES', label: 'Contusiones' },
          { value: 'LACERACIONES', label: 'Laceraciones' },
          { value: 'FRACTURAS', label: 'Fracturas' },
          { value: 'TRAUMA_CRANEAL', label: 'Trauma Craneal' },
          { value: 'TRAUMA_TORACICO', label: 'Trauma Torácico' },
          { value: 'TRAUMA_ABDOMINAL', label: 'Trauma Abdominal' },
          { value: 'QUEMADURAS', label: 'Quemaduras' },
          { value: 'AMPUTACION', label: 'Amputación' },
          { value: 'MULTIPLE', label: 'Múltiple' },
          { value: 'OTRO', label: 'Otro' }
        ]
      });
    } catch (error) {
      console.error('Error obteniendo tipos:', error);
      res.status(500).json({ error: 'Error al obtener tipos' });
    }
  },

  /**
   * Obtener datos completos de accidentología para PDF/reporte
   * GET /api/accidentologia/completo/:incidenteId
   */
  async obtenerCompleto(req: Request, res: Response) {
    try {
      const incidenteId = parseInt(req.params.incidenteId);
      const data = await AccidentologiaModel.obtenerCompleto(incidenteId);

      if (!data) {
        return res.status(404).json({
          error: 'No se encontró información de accidentología para este incidente'
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Error obteniendo datos completos:', error);
      res.status(500).json({ error: 'Error al obtener datos completos' });
    }
  },

  /**
   * Obtener hoja por incidente_id
   * GET /api/accidentologia/incidente/:incidenteId
   */
  async obtenerPorIncidente(req: Request, res: Response) {
    try {
      const incidenteId = parseInt(req.params.incidenteId);
      const hoja = await AccidentologiaModel.obtenerPorIncidente(incidenteId);

      if (!hoja) {
        return res.json(null);
      }

      const completa = await AccidentologiaModel.obtenerHojaCompleta(hoja.id);
      res.json(completa);
    } catch (error) {
      console.error('Error obteniendo hoja por incidente:', error);
      res.status(500).json({ error: 'Error al obtener hoja' });
    }
  }
};

export default AccidentologiaController;
