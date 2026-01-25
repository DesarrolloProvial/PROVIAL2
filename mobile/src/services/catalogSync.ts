/**
 * Catalog Sync Service
 *
 * Servicio para sincronizar catálogos auxiliares desde el backend.
 * Sincroniza tipos_hecho, tipos_asistencia, y tipos_emergencia.
 *
 * Fecha: 2026-01-24
 */

import api from './api';
import { catalogoStorage } from '../core/storage/catalogoStorage';
import type {
    CatalogoTipoHecho,
    CatalogoTipoAsistencia,
    CatalogoTipoEmergencia,
} from '../core/storage/catalogoStorage';

interface CatalogosAuxiliaresResponse {
    tipos_hecho: CatalogoTipoHecho[];
    subtipos_hecho: Array<{ id: number; tipo_hecho_id: number; codigo: string; nombre: string }>; // Vacío ahora
    tipos_asistencia: CatalogoTipoAsistencia[];
    tipos_emergencia: CatalogoTipoEmergencia[];
}

/**
 * Sincronizar catálogos auxiliares desde el backend
 */
export async function syncCatalogosAuxiliares(): Promise<boolean> {
    try {
        console.log('[CATALOG_SYNC] Iniciando sincronización de catálogos auxiliares...');

        // Inicializar storage si no está inicializado
        await catalogoStorage.init();

        // Fetch desde backend
        const response = await api.get<CatalogoAuxiliaresResponse>('/situaciones/auxiliares');
        const { tipos_hecho, tipos_asistencia, tipos_emergencia } = response.data;

        console.log('[CATALOG_SYNC] Recibido:', {
            tipos_hecho: tipos_hecho?.length || 0,
            tipos_asistencia: tipos_asistencia?.length || 0,
            tipos_emergencia: tipos_emergencia?.length || 0,
        });

        // Guardar en SQLite
        if (tipos_hecho && tipos_hecho.length > 0) {
            await catalogoStorage.saveTiposHecho(tipos_hecho);
        }

        if (tipos_asistencia && tipos_asistencia.length > 0) {
            await catalogoStorage.saveTiposAsistencia(tipos_asistencia);
        }

        if (tipos_emergencia && tipos_emergencia.length > 0) {
            await catalogoStorage.saveTiposEmergencia(tipos_emergencia);
        }

        console.log('[CATALOG_SYNC] Sincronización completada exitosamente');
        return true;
    } catch (error) {
        console.error('[CATALOG_SYNC] Error sincronizando catálogos:', error);
        return false;
    }
}

/**
 * Verificar si los catálogos están sincronizados
 */
export async function areCatalogsSynced(): Promise<boolean> {
    try {
        const [tiposHecho, tiposAsistencia, tiposEmergencia] = await Promise.all([
            catalogoStorage.getTiposHecho(),
            catalogoStorage.getTiposAsistencia(),
            catalogoStorage.getTiposEmergencia(),
        ]);

        return (
            tiposHecho.length > 0 &&
            tiposAsistencia.length > 0 &&
            tiposEmergencia.length > 0
        );
    } catch (error) {
        console.error('[CATALOG_SYNC] Error verificando catálogos:', error);
        return false;
    }
}
