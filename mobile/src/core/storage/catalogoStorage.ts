/**
 * Catálogo Storage - SQLite Local
 *
 * Sistema de almacenamiento local para catálogos sincronizados del backend.
 * Actualizado para expo-sqlite v16+ (API síncrono)
 *
 * Fecha: 2026-01-22
 */

import * as SQLite from 'expo-sqlite';

// ============================================
// INTERFACES
// ============================================

export interface CatalogoDepartamento {
    id: number;
    nombre: string;
    codigo: string;
}

export interface CatalogoMunicipio {
    id: number;
    nombre: string;
    departamento_id: number;
}

export interface CatalogoTipoVehiculo {
    id: number;
    nombre: string;
}

export interface CatalogoMarcaVehiculo {
    id: number;
    nombre: string;
}

export interface CatalogoAutoridad {
    id: number;
    nombre: string;
}

export interface CatalogoSocorro {
    id: number;
    nombre: string;
}

export interface SyncMetadata {
    catalogo: string;
    ultima_sincronizacion: string;
    version: number;
}

// ============================================
// DATABASE CLASS
// ============================================

class CatalogoStorage {
    private db: SQLite.SQLiteDatabase | null = null;
    private initialized: boolean = false;

    /**
     * Inicializar base de datos
     */
    async init(): Promise<void> {
        if (this.initialized) {
            console.log('[CATALOGOS] Ya inicializado');
            return;
        }

        try {
            this.db = SQLite.openDatabaseSync('catalogos.db');

            // Crear tablas
            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS departamento (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    codigo TEXT NOT NULL UNIQUE
                )
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS municipio (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL,
                    departamento_id INTEGER NOT NULL,
                    FOREIGN KEY (departamento_id) REFERENCES departamento(id)
                )
            `);

            this.db.execSync(`
                CREATE INDEX IF NOT EXISTS idx_municipio_depto
                ON municipio(departamento_id)
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS tipo_vehiculo (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL UNIQUE
                )
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS marca_vehiculo (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL UNIQUE
                )
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS autoridad (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL UNIQUE
                )
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS socorro (
                    id INTEGER PRIMARY KEY,
                    nombre TEXT NOT NULL UNIQUE
                )
            `);

            this.db.execSync(`
                CREATE TABLE IF NOT EXISTS sync_metadata (
                    catalogo TEXT PRIMARY KEY,
                    ultima_sincronizacion TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 0
                )
            `);

            this.initialized = true;
            console.log('[CATALOGOS] Inicialización completada');
        } catch (error) {
            console.error('[CATALOGOS] Error al crear tablas:', error);
            this.initialized = false;
            throw error;
        }
    }

    /**
     * Obtener todos los departamentos
     */
    async getDepartamentos(): Promise<CatalogoDepartamento[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoDepartamento>('SELECT * FROM departamento ORDER BY nombre');
        } catch (error) {
            console.error('[CATALOGOS] Error getDepartamentos:', error);
            return [];
        }
    }

    /**
     * Obtener municipios de un departamento
     */
    async getMunicipiosByDepartamento(departamentoId: number): Promise<CatalogoMunicipio[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoMunicipio>(
                'SELECT * FROM municipio WHERE departamento_id = ? ORDER BY nombre',
                [departamentoId]
            );
        } catch (error) {
            console.error('[CATALOGOS] Error getMunicipios:', error);
            return [];
        }
    }

    /**
     * Obtener todos los tipos de vehículo
     */
    async getTiposVehiculo(): Promise<CatalogoTipoVehiculo[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoTipoVehiculo>('SELECT * FROM tipo_vehiculo ORDER BY nombre');
        } catch (error) {
            console.error('[CATALOGOS] Error getTiposVehiculo:', error);
            return [];
        }
    }

    /**
     * Obtener todas las marcas de vehículo
     */
    async getMarcasVehiculo(): Promise<CatalogoMarcaVehiculo[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoMarcaVehiculo>('SELECT * FROM marca_vehiculo ORDER BY nombre');
        } catch (error) {
            console.error('[CATALOGOS] Error getMarcasVehiculo:', error);
            return [];
        }
    }

    /**
     * Obtener todas las autoridades
     */
    async getAutoridades(): Promise<CatalogoAutoridad[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoAutoridad>('SELECT * FROM autoridad ORDER BY nombre');
        } catch (error) {
            console.error('[CATALOGOS] Error getAutoridades:', error);
            return [];
        }
    }

    /**
     * Obtener todas las unidades de socorro
     */
    async getSocorro(): Promise<CatalogoSocorro[]> {
        if (!this.db) return [];
        try {
            return this.db.getAllSync<CatalogoSocorro>('SELECT * FROM socorro ORDER BY nombre');
        } catch (error) {
            console.error('[CATALOGOS] Error getSocorro:', error);
            return [];
        }
    }

    /**
     * Insertar/Actualizar departamentos (bulk)
     */
    async saveDepartamentos(departamentos: CatalogoDepartamento[]): Promise<void> {
        if (!this.db) return;
        try {
            this.db.runSync('DELETE FROM departamento');
            for (const depto of departamentos) {
                this.db.runSync(
                    'INSERT INTO departamento (id, nombre, codigo) VALUES (?, ?, ?)',
                    [depto.id, depto.nombre, depto.codigo]
                );
            }
            this.db.runSync(
                `INSERT OR REPLACE INTO sync_metadata (catalogo, ultima_sincronizacion, version)
                 VALUES ('departamento', datetime('now'), 1)`
            );
            console.log(`[CATALOGOS] ${departamentos.length} departamentos guardados`);
        } catch (error) {
            console.error('[CATALOGOS] Error saveDepartamentos:', error);
            throw error;
        }
    }

    /**
     * Insertar/Actualizar municipios (bulk)
     */
    async saveMunicipios(municipios: CatalogoMunicipio[]): Promise<void> {
        if (!this.db) return;
        try {
            this.db.runSync('DELETE FROM municipio');
            for (const muni of municipios) {
                this.db.runSync(
                    'INSERT INTO municipio (id, nombre, departamento_id) VALUES (?, ?, ?)',
                    [muni.id, muni.nombre, muni.departamento_id]
                );
            }
            this.db.runSync(
                `INSERT OR REPLACE INTO sync_metadata (catalogo, ultima_sincronizacion, version)
                 VALUES ('municipio', datetime('now'), 1)`
            );
            console.log(`[CATALOGOS] ${municipios.length} municipios guardados`);
        } catch (error) {
            console.error('[CATALOGOS] Error saveMunicipios:', error);
            throw error;
        }
    }

    /**
     * Insertar/Actualizar tipos de vehículo (bulk)
     */
    async saveTiposVehiculo(tipos: CatalogoTipoVehiculo[]): Promise<void> {
        if (!this.db) return;
        try {
            this.db.runSync('DELETE FROM tipo_vehiculo');
            for (const tipo of tipos) {
                this.db.runSync(
                    'INSERT INTO tipo_vehiculo (id, nombre) VALUES (?, ?)',
                    [tipo.id, tipo.nombre]
                );
            }
            this.db.runSync(
                `INSERT OR REPLACE INTO sync_metadata (catalogo, ultima_sincronizacion, version)
                 VALUES ('tipo_vehiculo', datetime('now'), 1)`
            );
            console.log(`[CATALOGOS] ${tipos.length} tipos de vehículo guardados`);
        } catch (error) {
            console.error('[CATALOGOS] Error saveTiposVehiculo:', error);
            throw error;
        }
    }

    /**
     * Insertar/Actualizar marcas de vehículo (bulk)
     */
    async saveMarcasVehiculo(marcas: CatalogoMarcaVehiculo[]): Promise<void> {
        if (!this.db) return;
        try {
            this.db.runSync('DELETE FROM marca_vehiculo');
            for (const marca of marcas) {
                this.db.runSync(
                    'INSERT INTO marca_vehiculo (id, nombre) VALUES (?, ?)',
                    [marca.id, marca.nombre]
                );
            }
            this.db.runSync(
                `INSERT OR REPLACE INTO sync_metadata (catalogo, ultima_sincronizacion, version)
                 VALUES ('marca_vehiculo', datetime('now'), 1)`
            );
            console.log(`[CATALOGOS] ${marcas.length} marcas de vehículo guardadas`);
        } catch (error) {
            console.error('[CATALOGOS] Error saveMarcasVehiculo:', error);
            throw error;
        }
    }

    /**
     * Obtener metadata de sincronización
     */
    async getSyncMetadata(catalogo: string): Promise<SyncMetadata | null> {
        if (!this.db) return null;
        try {
            return this.db.getFirstSync<SyncMetadata>(
                'SELECT * FROM sync_metadata WHERE catalogo = ?',
                [catalogo]
            );
        } catch (error) {
            console.error('[CATALOGOS] Error getSyncMetadata:', error);
            return null;
        }
    }

    /**
     * Limpiar todos los catálogos
     */
    async clearAll(): Promise<void> {
        if (!this.db) return;
        try {
            this.db.runSync('DELETE FROM departamento');
            this.db.runSync('DELETE FROM municipio');
            this.db.runSync('DELETE FROM tipo_vehiculo');
            this.db.runSync('DELETE FROM marca_vehiculo');
            this.db.runSync('DELETE FROM autoridad');
            this.db.runSync('DELETE FROM socorro');
            this.db.runSync('DELETE FROM sync_metadata');
            console.log('[CATALOGOS] Todos los catálogos limpiados');
        } catch (error) {
            console.error('[CATALOGOS] Error clearAll:', error);
            throw error;
        }
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const catalogoStorage = new CatalogoStorage();
