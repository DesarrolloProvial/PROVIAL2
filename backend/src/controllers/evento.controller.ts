import { Request, Response } from 'express';
import { EventoModel } from '../models/evento.model';

export async function createEvento(req: Request, res: Response) {
    try {
        const { titulo, descripcion, tipo, ruta_id, km, latitud, longitud, importancia } = req.body;
        const userId = req.user!.userId;

        const evento = await EventoModel.create({
            titulo,
            descripcion,
            tipo,
            ruta_id,
            km,
            latitud,
            longitud,
            importancia,
            creado_por: userId
        });

        res.status(201).json({ evento });
    } catch (error) {
        console.error('Error creando evento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function getEventosActivos(_req: Request, res: Response) {
    try {
        const eventos = await EventoModel.getActivos();
        res.json({ eventos });
    } catch (error) {
        console.error('Error obteniendo eventos activos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function getAllEventos(req: Request, res: Response) {
    try {
        const limit = parseInt(req.query.limit as string) || 50;
        const offset = parseInt(req.query.offset as string) || 0;
        const eventos = await EventoModel.getAll(limit, offset);
        res.json({ eventos });
    } catch (error) {
        console.error('Error obteniendo historial de eventos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function updateEvento(req: Request, res: Response) {
    try {
        const { id } = req.params;
        const { titulo, descripcion, estado, importancia } = req.body;
        const userId = req.user!.userId;

        const evento = await EventoModel.update(Number(id), {
            titulo,
            descripcion,
            estado,
            importancia,
            actualizado_por: userId
        });

        res.json({ evento });
    } catch (error) {
        console.error('Error actualizando evento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

export async function asignarUnidadEvento(req: Request, res: Response) {
    try {
        const { id: evento_id } = req.params;
        const { unidad_id } = req.body;
        const userId = req.user!.userId;

        // Solo COP, OPERACIONES, ADMIN pueden asignar
        if (!['COP', 'OPERACIONES', 'ADMIN'].includes(req.user!.rol)) {
            return res.status(403).json({ error: 'No autorizado para asignar unidades' });
        }

        const situacion = await EventoModel.asignarUnidad({
            evento_id: Number(evento_id),
            unidad_id: Number(unidad_id),
            usuario_id: userId
        });

        res.status(201).json({
            message: 'Unidad asignada exitosamente al evento',
            situacion
        });
    } catch (error: any) {
        console.error('Error asignando unidad a evento:', error);
        res.status(400).json({ error: error.message || 'Error al asignar unidad' });
    }
}
