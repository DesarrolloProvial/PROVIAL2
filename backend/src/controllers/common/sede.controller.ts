import { Request, Response } from 'express';
import { SalidaModel } from '../../models/common/salida.model';
import { UsuarioModel } from '../../models/common/usuario.model';
import { ConfiguracionSedeModel } from '../../models/operaciones/configuracionSede.model';
import { normalizeId } from '../../utils/db.utils';

export async function getSedes(_req: Request, res: Response) {
  try {
    const sedes = await SalidaModel.getSedes();
    return res.json({ sedes, total: sedes.length });
  } catch (error) {
    console.error('Error en getSedes:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getSede(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const sede = await SalidaModel.getSedeById(id);
    if (!sede) return res.status(404).json({ error: 'Sede no encontrada' });

    return res.json(sede);
  } catch (error) {
    console.error('Error en getSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getUnidadesDeSede(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const unidades = await SalidaModel.getUnidadesDeSede(id);
    return res.json({ sede_id: id, unidades, total: unidades.length });
  } catch (error) {
    console.error('Error en getUnidadesDeSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getPersonalDeSede(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const personal = await SalidaModel.getPersonalDeSede(id);
    return res.json({ sede_id: id, personal, total: personal.length });
  } catch (error) {
    console.error('Error en getPersonalDeSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getMiSede(req: Request, res: Response) {
  try {
    const userId = req.user!.userId;

    const miSalida = await SalidaModel.getMiSalidaActiva(userId);
    if (miSalida) {
      const sedeInfo = await SalidaModel.getSedeDeUnidad(miSalida.unidad_id);
      if (sedeInfo) {
        return res.json({
          mi_sede_id: sedeInfo.sede_id,
          mi_sede_codigo: sedeInfo.sede_codigo,
          mi_sede_nombre: sedeInfo.sede_nombre,
          unidad_sede_id: sedeInfo.sede_id,
          unidad_sede_codigo: sedeInfo.sede_codigo,
          unidad_sede_nombre: sedeInfo.sede_nombre,
        });
      }
    }

    const userSede = await UsuarioModel.getSedeByUserId(userId);
    if (userSede) {
      return res.json({
        mi_sede_id: userSede.mi_sede_id,
        mi_sede_codigo: userSede.mi_sede_codigo,
        mi_sede_nombre: userSede.mi_sede_nombre,
        unidad_sede_id: userSede.mi_sede_id,
        unidad_sede_codigo: userSede.mi_sede_codigo,
        unidad_sede_nombre: userSede.mi_sede_nombre,
      });
    }

    return res.status(404).json({ error: 'No se encontró información de sede' });
  } catch (error) {
    console.error('Error en getMiSede:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

export async function getConfiguracion(req: Request, res: Response) {
  try {
    const id = normalizeId(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const config = await ConfiguracionSedeModel.getBySede(id);
    if (!config) {
      return res.json({ sede_id: id, requiere_tripulacion: true, alerta_rotacion_rutas_activa: true, umbral_rotacion_rutas: 3 });
    }

    return res.json(config);
  } catch (error) {
    console.error('Error en getConfiguracion:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
