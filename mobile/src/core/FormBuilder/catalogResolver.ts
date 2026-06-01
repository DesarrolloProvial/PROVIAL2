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

            // Tipos de situaciones (desde SQLite)
            case '@catalogos.tipos_asistencia':
                return await this.resolveTiposAsistencia();

            case '@catalogos.tipos_hecho':
                return await this.resolveTiposHecho();

            case '@catalogos.tipos_emergencia':
                return await this.resolveTiposEmergencia();

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
                return [];
        }
    }

    /**
     * Resolver municipios por departamento desde SQLite (IDs reales de BD).
     * Retorna [] si SQLite está vacío — syncGeografia debe correr al login.
     */
    static async resolveMunicipiosByDepartamento(
        departamentoId: number
    ): Promise<FieldOption[]> {
        try {
            await catalogoStorage.init();
            const fromDB = await catalogoStorage.getMunicipiosByDepartamento(departamentoId);
            return fromDB.map(m => ({ value: m.id, label: m.nombre }));
        } catch {
            return [];
        }
    }

    // ============================================
    // PRIVATE RESOLVERS
    // ============================================

    private static async resolveDepartamentos(): Promise<FieldOption[]> {
        try {
            await catalogoStorage.init();
            const fromDB = await catalogoStorage.getDepartamentos();
            return fromDB.map(d => ({ value: d.id, label: d.nombre }));
        } catch {
            return [];
        }
    }

    private static async resolveTiposVehiculo(): Promise<FieldOption[]> {
        try {
            const tipos = await catalogoStorage.getTiposVehiculo();
            return tipos.map(t => ({
                value: t.id,
                label: t.nombre,
            }));
        } catch (error) {
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
            return [];
        }
    }

    private static async resolveTiposHecho(): Promise<FieldOption[]> {
        try {
            const tipos = await catalogoStorage.getTiposHecho();
            return tipos.map(t => ({
                value: t.id,
                label: t.nombre,
            }));
        } catch (error) {
            return [];
        }
    }

    private static async resolveTiposAsistencia(): Promise<FieldOption[]> {
        try {
            const tipos = await catalogoStorage.getTiposAsistencia();
            return tipos.map(t => ({
                value: t.id,
                label: t.nombre,
            }));
        } catch (error) {
            return [];
        }
    }

    private static async resolveTiposEmergencia(): Promise<FieldOption[]> {
        try {
            const tipos = await catalogoStorage.getTiposEmergencia();
            return tipos.map(t => ({
                value: t.id,
                label: t.nombre,
            }));
        } catch (error) {
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
