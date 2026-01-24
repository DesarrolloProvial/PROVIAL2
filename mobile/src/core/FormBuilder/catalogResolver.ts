/**
 * Catalog Resolver
 * 
 * Utilidad para resolver referencias a catálogos en la configuración de formularios.
 * Convierte strings como '@catalogos.departamentos' en arrays de opciones.
 * 
 * Fecha: 2026-01-22
 * FASE 1 - DÍA 2
 */

import { catalogoStorage } from '../storage/catalogoStorage';
import { FieldOption, CatalogType } from './types';
import {
    SENTIDOS,
    TIPOS_ASISTENCIA,
    TIPOS_HECHO_TRANSITO,
    TIPOS_EMERGENCIA,
} from '../../constants/situacionTypes';
import { getDepartamentosOptions, getMunicipiosOptions } from '../../data/geografia';

/**
 * Resolver de referencias a catálogos
 * 
 * Toma un string de referencia y retorna las opciones correspondientes
 */
export class CatalogResolver {
    /**
     * Resolver opciones desde catálogo o constantes
     */
    static async resolveOptions(
        optionsRef: string | FieldOption[] | undefined
    ): Promise<FieldOption[]> {
        // Si ya es array, retornar directo
        if (Array.isArray(optionsRef)) {
            return optionsRef;
        }

        // Si no es string, retornar vacío
        if (typeof optionsRef !== 'string') {
            return [];
        }

        // Si no es referencia a catálogo, retornar vacío
        if (!optionsRef.startsWith('@catalogos.')) {
            return [];
        }

        // Resolver según el catálogo
        const catalogRef = optionsRef as CatalogType;

        switch (catalogRef) {
            // SQLite Catalogs
            case '@catalogos.departamentos':
                return await this.resolveDepartamentos();

            case '@catalogos.municipios':
                // Nota: municipios requiere departamento_id, se resuelve dinámicamente
                return [];

            case '@catalogos.tipos_vehiculo':
                return await this.resolveTiposVehiculo();

            case '@catalogos.marcas_vehiculo':
                return await this.resolveMarcasVehiculo();

            case '@catalogos.autoridades':
                return await this.resolveAutoridades();

            case '@catalogos.socorro':
                return await this.resolveSocorro();

            // Constantes
            case '@catalogos.tipos_asistencia':
                return this.resolveConstantes(TIPOS_ASISTENCIA);

            case '@catalogos.tipos_hecho':
                return this.resolveConstantes(TIPOS_HECHO_TRANSITO);

            case '@catalogos.tipos_emergencia':
                return this.resolveConstantes(TIPOS_EMERGENCIA);

            case '@catalogos.sentidos':
                return SENTIDOS.map(s => ({
                    value: s.value,
                    label: s.label,
                }));

            case '@catalogos.climas':
                return [
                    { value: 'DESPEJADO', label: 'Despejado' },
                    { value: 'NUBLADO', label: 'Nublado' },
                    { value: 'LLUVIA', label: 'Lluvia' },
                    { value: 'NEBLINA', label: 'Neblina' },
                ];

            case '@catalogos.carga_vehicular':
                return [
                    { value: 'FLUIDO', label: 'Fluido' },
                    { value: 'MODERADO', label: 'Moderado' },
                    { value: 'DENSO', label: 'Denso' },
                    { value: 'CONGESTIONADO', label: 'Congestionado' },
                ];

            default:
                console.warn(`[CATALOG_RESOLVER] Catálogo no reconocido: ${catalogRef}`);
                return [];
        }
    }

    /**
     * Resolver municipios por departamento
     * Este método se llama dinámicamente cuando cambia el departamento
     */
    static async resolveMunicipiosByDepartamento(
        departamentoId: number
    ): Promise<FieldOption[]> {
        // Usar datos estáticos quemados en la app (Offline First)
        return getMunicipiosOptions(departamentoId);
    }

    // ============================================
    // PRIVATE RESOLVERS
    // ============================================

    private static async resolveDepartamentos(): Promise<FieldOption[]> {
        // Usar datos estáticos quemados en la app (Offline First)
        return getDepartamentosOptions();
    }

    private static async resolveTiposVehiculo(): Promise<FieldOption[]> {
        try {
            const tipos = await catalogoStorage.getTiposVehiculo();
            return tipos.map(t => ({
                value: t.id,
                label: t.nombre,
            }));
        } catch (error) {
            console.error('[CATALOG_RESOLVER] Error en resolveTiposVehiculo:', error);
            return [];
        }
    }

    private static async resolveMarcasVehiculo(): Promise<FieldOption[]> {
        try {
            const marcas = await catalogoStorage.getMarcasVehiculo();
            return marcas.map(m => ({
                value: m.id,
                label: m.nombre,
            }));
        } catch (error) {
            console.error('[CATALOG_RESOLVER] Error en resolveMarcasVehiculo:', error);
            return [];
        }
    }

    private static async resolveAutoridades(): Promise<FieldOption[]> {
        try {
            const autoridades = await catalogoStorage.getAutoridades();
            return autoridades.map(a => ({
                value: a.id,
                label: a.nombre,
            }));
        } catch (error) {
            console.error('[CATALOG_RESOLVER] Error en resolveAutoridades:', error);
            return [];
        }
    }

    private static async resolveSocorro(): Promise<FieldOption[]> {
        try {
            const socorro = await catalogoStorage.getSocorro();
            return socorro.map(s => ({
                value: s.id,
                label: s.nombre,
            }));
        } catch (error) {
            console.error('[CATALOG_RESOLVER] Error en resolveSocorro:', error);
            return [];
        }
    }

    /**
     * Convertir array de strings a opciones
     */
    private static resolveConstantes(constantes: string[]): FieldOption[] {
        return constantes.map(c => ({
            value: c,
            label: c,
        }));
    }
}
