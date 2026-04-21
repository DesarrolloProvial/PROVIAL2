import { Request, Response } from 'express';
import { AccidentologiaModel } from '../../models/accidentologia/accidentologia.model';
import { normalizeId } from '../../utils/db.utils';

export const AccidentologiaController = {
  async crear(req: Request, res: Response) {
    try {
      const usuarioId = req.user!.userId;
      const data = req.body;

      if (!data.situacion_id || !data.tipo_accidente) {
        return res.status(400).json({ error: 'situacion_id y tipo_accidente son requeridos' });
      }

      const existente = await AccidentologiaModel.obtenerPorSituacion(data.situacion_id);
      if (existente) {
        return res.status(400).json({ error: 'Ya existe una hoja de accidentología para esta situación', hoja_id: existente.id });
      }

      const id = await AccidentologiaModel.crear({ ...data, elaborado_por: usuarioId });
      return res.status(201).json({ message: 'Hoja de accidentología creada', id });
    } catch (error) {
      console.error('Error creando hoja:', error);
      return res.status(500).json({ error: 'Error al crear hoja de accidentología' });
    }
  },

  async actualizar(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const hoja = await AccidentologiaModel.obtenerPorId(id);
      if (!hoja) return res.status(404).json({ error: 'Hoja no encontrada' });

      await AccidentologiaModel.actualizar(id, req.body);
      return res.json({ message: 'Hoja actualizada correctamente' });
    } catch (error) {
      console.error('Error actualizando hoja:', error);
      return res.status(500).json({ error: 'Error al actualizar hoja' });
    }
  },

  async obtenerPorId(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const hoja = await AccidentologiaModel.obtenerHojaCompleta(id);
      if (!hoja) return res.status(404).json({ error: 'Hoja no encontrada' });

      return res.json(hoja);
    } catch (error) {
      console.error('Error obteniendo hoja:', error);
      return res.status(500).json({ error: 'Error al obtener hoja' });
    }
  },

  async obtenerPorSituacion(req: Request, res: Response) {
    try {
      const situacionId = normalizeId(req.params.situacionId);
      if (!situacionId) return res.status(400).json({ error: 'ID inválido' });

      const hoja = await AccidentologiaModel.obtenerPorSituacion(situacionId);
      if (!hoja) return res.json(null);

      const completa = await AccidentologiaModel.obtenerHojaCompleta(hoja.id);
      return res.json(completa);
    } catch (error) {
      console.error('Error obteniendo hoja:', error);
      return res.status(500).json({ error: 'Error al obtener hoja' });
    }
  },

  async listar(req: Request, res: Response) {
    try {
      const { tipo_accidente, estado, fecha_desde, fecha_hasta, limit, offset } = req.query;
      const limitRaw = parseInt(limit as string, 10);
      const offsetRaw = parseInt(offset as string, 10);

      const hojas = await AccidentologiaModel.listar({
        tipo_accidente: tipo_accidente as string,
        estado: estado as string,
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        limit: isNaN(limitRaw) ? 50 : limitRaw,
        offset: isNaN(offsetRaw) ? 0 : offsetRaw,
      });

      return res.json(hojas);
    } catch (error) {
      console.error('Error listando hojas:', error);
      return res.status(500).json({ error: 'Error al listar hojas' });
    }
  },

  async cambiarEstado(req: Request, res: Response) {
    try {
      const id = normalizeId(req.params.id);
      if (!id) return res.status(400).json({ error: 'ID inválido' });

      const usuarioId = req.user!.userId;
      const { estado } = req.body;

      const estadosValidos = ['BORRADOR', 'COMPLETO', 'REVISADO', 'ENVIADO'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${estadosValidos.join(', ')}` });
      }

      await AccidentologiaModel.cambiarEstado(id, estado, usuarioId);
      return res.json({ message: 'Estado actualizado' });
    } catch (error) {
      console.error('Error cambiando estado:', error);
      return res.status(500).json({ error: 'Error al cambiar estado' });
    }
  },

  async agregarVehiculo(req: Request, res: Response) {
    try {
      const hojaId = normalizeId(req.params.id);
      if (!hojaId) return res.status(400).json({ error: 'ID inválido' });

      const { tipo_vehiculo, numero_vehiculo } = req.body;
      if (!tipo_vehiculo || !numero_vehiculo) {
        return res.status(400).json({ error: 'tipo_vehiculo y numero_vehiculo son requeridos' });
      }

      const vehiculoId = await AccidentologiaModel.agregarVehiculo({ ...req.body, hoja_accidentologia_id: hojaId });
      return res.status(201).json({ message: 'Vehículo agregado', id: vehiculoId });
    } catch (error) {
      console.error('Error agregando vehículo:', error);
      return res.status(500).json({ error: 'Error al agregar vehículo' });
    }
  },

  async actualizarVehiculo(req: Request, res: Response) {
    try {
      const vehiculoId = normalizeId(req.params.vehiculoId);
      if (!vehiculoId) return res.status(400).json({ error: 'ID inválido' });

      await AccidentologiaModel.actualizarVehiculo(vehiculoId, req.body);
      return res.json({ message: 'Vehículo actualizado' });
    } catch (error) {
      console.error('Error actualizando vehículo:', error);
      return res.status(500).json({ error: 'Error al actualizar vehículo' });
    }
  },

  async eliminarVehiculo(req: Request, res: Response) {
    try {
      const vehiculoId = normalizeId(req.params.vehiculoId);
      if (!vehiculoId) return res.status(400).json({ error: 'ID inválido' });

      await AccidentologiaModel.eliminarVehiculo(vehiculoId);
      return res.json({ message: 'Vehículo eliminado' });
    } catch (error) {
      console.error('Error eliminando vehículo:', error);
      return res.status(500).json({ error: 'Error al eliminar vehículo' });
    }
  },

  async listarVehiculos(req: Request, res: Response) {
    try {
      const hojaId = normalizeId(req.params.id);
      if (!hojaId) return res.status(400).json({ error: 'ID inválido' });

      const vehiculos = await AccidentologiaModel.obtenerVehiculos(hojaId);
      return res.json(vehiculos);
    } catch (error) {
      console.error('Error listando vehículos:', error);
      return res.status(500).json({ error: 'Error al listar vehículos' });
    }
  },

  async agregarPersona(req: Request, res: Response) {
    try {
      const hojaId = normalizeId(req.params.id);
      if (!hojaId) return res.status(400).json({ error: 'ID inválido' });

      const { tipo_persona, estado } = req.body;
      if (!tipo_persona || !estado) {
        return res.status(400).json({ error: 'tipo_persona y estado son requeridos' });
      }

      const personaId = await AccidentologiaModel.agregarPersona({ ...req.body, hoja_accidentologia_id: hojaId });
      return res.status(201).json({ message: 'Persona agregada', id: personaId });
    } catch (error) {
      console.error('Error agregando persona:', error);
      return res.status(500).json({ error: 'Error al agregar persona' });
    }
  },

  async actualizarPersona(req: Request, res: Response) {
    try {
      const personaId = normalizeId(req.params.personaId);
      if (!personaId) return res.status(400).json({ error: 'ID inválido' });

      await AccidentologiaModel.actualizarPersona(personaId, req.body);
      return res.json({ message: 'Persona actualizada' });
    } catch (error) {
      console.error('Error actualizando persona:', error);
      return res.status(500).json({ error: 'Error al actualizar persona' });
    }
  },

  async eliminarPersona(req: Request, res: Response) {
    try {
      const personaId = normalizeId(req.params.personaId);
      if (!personaId) return res.status(400).json({ error: 'ID inválido' });

      await AccidentologiaModel.eliminarPersona(personaId);
      return res.json({ message: 'Persona eliminada' });
    } catch (error) {
      console.error('Error eliminando persona:', error);
      return res.status(500).json({ error: 'Error al eliminar persona' });
    }
  },

  async listarPersonas(req: Request, res: Response) {
    try {
      const hojaId = normalizeId(req.params.id);
      if (!hojaId) return res.status(400).json({ error: 'ID inválido' });

      const personas = await AccidentologiaModel.obtenerPersonas(hojaId);
      return res.json(personas);
    } catch (error) {
      console.error('Error listando personas:', error);
      return res.status(500).json({ error: 'Error al listar personas' });
    }
  },

  async estadisticas(req: Request, res: Response) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const stats = await AccidentologiaModel.obtenerEstadisticas({
        fecha_desde: fecha_desde as string,
        fecha_hasta: fecha_hasta as string,
        sede_id: normalizeId(req.query.sede_id as string) ?? undefined,
      });
      return res.json(stats);
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      return res.status(500).json({ error: 'Error al obtener estadísticas' });
    }
  },

  async tiposAccidente(_req: Request, res: Response) {
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
        { value: 'OTRO', label: 'Otro' },
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
        { value: 'OTRO', label: 'Otro' },
      ],
      estados_persona: [
        { value: 'ILESO', label: 'Ileso' },
        { value: 'HERIDO_LEVE', label: 'Herido Leve' },
        { value: 'HERIDO_MODERADO', label: 'Herido Moderado' },
        { value: 'HERIDO_GRAVE', label: 'Herido Grave' },
        { value: 'FALLECIDO', label: 'Fallecido' },
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
        { value: 'OTRO', label: 'Otro' },
      ],
    });
  },

  async obtenerCompleto(req: Request, res: Response) {
    try {
      const incidenteId = normalizeId(req.params.incidenteId);
      if (!incidenteId) return res.status(400).json({ error: 'ID inválido' });

      const data = await AccidentologiaModel.obtenerCompleto(incidenteId);
      if (!data) return res.status(404).json({ error: 'No se encontró información de accidentología para este incidente' });

      return res.json(data);
    } catch (error) {
      console.error('Error obteniendo datos completos:', error);
      return res.status(500).json({ error: 'Error al obtener datos completos' });
    }
  },

  async obtenerPorIncidente(req: Request, res: Response) {
    try {
      const incidenteId = normalizeId(req.params.incidenteId);
      if (!incidenteId) return res.status(400).json({ error: 'ID inválido' });

      const hoja = await AccidentologiaModel.obtenerPorIncidente(incidenteId);
      if (!hoja) return res.json(null);

      const completa = await AccidentologiaModel.obtenerHojaCompleta(hoja.id);
      return res.json(completa);
    } catch (error) {
      console.error('Error obteniendo hoja por incidente:', error);
      return res.status(500).json({ error: 'Error al obtener hoja' });
    }
  },
};

export default AccidentologiaController;
