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
        console.log('[CATALOG_SYNC] SQLite inicializado');

        // Fetch desde backend
        console.log('[CATALOG_SYNC] Llamando a /situaciones/auxiliares...');
        const response = await api.get<CatalogosAuxiliaresResponse>('/situaciones/auxiliares');
        console.log('[CATALOG_SYNC] Response status:', response.status);

        const { tipos_hecho, tipos_asistencia, tipos_emergencia } = response.data;

        console.log('[CATALOG_SYNC] Datos recibidos:', {
            tipos_hecho: tipos_hecho?.length || 0,
            tipos_asistencia: tipos_asistencia?.length || 0,
            tipos_emergencia: tipos_emergencia?.length || 0,
        });

        // Debug: mostrar primeros elementos
        if (tipos_hecho?.length > 0) {
            console.log('[CATALOG_SYNC] Primer tipo_hecho:', tipos_hecho[0]);
        }
        if (tipos_asistencia?.length > 0) {
            console.log('[CATALOG_SYNC] Primer tipo_asistencia:', tipos_asistencia[0]);
        }

        // Normalizar datos (convertir IDs a números) y guardar en SQLite
        if (tipos_hecho && tipos_hecho.length > 0) {
            const normalized = tipos_hecho.map(t => ({
                ...t,
                id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
            }));
            await catalogoStorage.saveTiposHecho(normalized);
        }

        if (tipos_asistencia && tipos_asistencia.length > 0) {
            const normalized = tipos_asistencia.map(t => ({
                ...t,
                id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
            }));
            await catalogoStorage.saveTiposAsistencia(normalized);
        }

        if (tipos_emergencia && tipos_emergencia.length > 0) {
            const normalized = tipos_emergencia.map(t => ({
                ...t,
                id: typeof t.id === 'string' ? parseInt(t.id, 10) : t.id,
            }));
            await catalogoStorage.saveTiposEmergencia(normalized);
        }

        console.log('[CATALOG_SYNC] ✅ Sincronización completada exitosamente');
        return true;
    } catch (error: any) {
        console.error('[CATALOG_SYNC] ❌ Error sincronizando catálogos:', error);

        // Detalles del error
        if (error.response) {
            console.error('[CATALOG_SYNC] Response status:', error.response.status);
            console.error('[CATALOG_SYNC] Response data:', error.response.data);
        } else if (error.request) {
            console.error('[CATALOG_SYNC] No se recibió respuesta del servidor');
        } else {
            console.error('[CATALOG_SYNC] Error:', error.message);
        }

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
