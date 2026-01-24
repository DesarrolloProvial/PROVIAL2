/**
 * Component Registry
 * 
 * Registro centralizado de componentes custom para el FormBuilder.
 * Permite referenciar componentes por string en las configuraciones.
 * 
 * Fecha: 2026-01-22
 */

import { ComponentType } from 'react';

// Importar componentes reutilizables
import ObstruccionManager from '../../components/ObstruccionManager';
import { VehiculoForm } from '../../components/VehiculoForm';
import VehiculoManager from '../../components/VehiculoManager';
import AutoridadSocorroManager from '../../components/AutoridadSocorroManager';
import AutoridadSocorroWrapper from '../../components/AutoridadSocorroWrapper';
import { GruaForm } from '../../components/GruaForm';
import GruaManager from '../../components/GruaManager';
import { AjustadorForm } from '../../components/AjustadorForm';
import AjustadorManager from '../../components/AjustadorManager';
import MultimediaWrapper from '../../components/MultimediaWrapper';
import ContadorVehicular from '../../components/ContadorVehicular';
import TomadorVelocidad from '../../components/TomadorVelocidad';
import LlamadaAtencionManager from '../../components/LlamadaAtencionManager';

/**
 * Registro de componentes disponibles
 */
const componentRegistry: Record<string, ComponentType<any>> = {
    'ObstruccionManager': ObstruccionManager,
    'VehiculoForm': VehiculoForm,
    'VehiculoManager': VehiculoManager,
    'AutoridadSocorroManager': AutoridadSocorroManager,
    'AutoridadSocorroWrapper': AutoridadSocorroWrapper,
    'GruaForm': GruaForm,
    'GruaManager': GruaManager,
    'AjustadorForm': AjustadorForm,
    'AjustadorManager': AjustadorManager,
    'MultimediaWrapper': MultimediaWrapper,
    'ContadorVehicular': ContadorVehicular,
    'TomadorVelocidad': TomadorVelocidad,
    'LlamadaAtencionManager': LlamadaAtencionManager,
};

/**
 * Resolver un componente por nombre o retornar el componente directamente
 */
export function resolveComponent(component: ComponentType<any> | string | undefined): ComponentType<any> | null {
    if (!component) return null;

    // Si ya es un componente, retornarlo
    if (typeof component === 'function') {
        return component;
    }

    // Si es string, buscar en el registro
    if (typeof component === 'string') {
        const resolved = componentRegistry[component];
        if (!resolved) {
            console.warn(`[ComponentRegistry] Componente no encontrado: ${component}`);
        }
        return resolved || null;
    }

    return null;
}

/**
 * Registrar un componente custom en runtime
 */
export function registerComponent(name: string, component: ComponentType<any>) {
    componentRegistry[name] = component;
}

export default componentRegistry;
