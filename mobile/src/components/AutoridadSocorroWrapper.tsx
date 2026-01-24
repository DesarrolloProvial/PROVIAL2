/**
 * AutoridadSocorroWrapper
 * 
 * Wrapper para AutoridadSocorroManager que adapta la interfaz
 * para trabajar con react-hook-form (value/onChange).
 * 
 * Fecha: 2026-01-22
 */

import React from 'react';
import AutoridadSocorroManager, { DetalleAutoridad, DetallesSocorro } from './AutoridadSocorroManager';

export interface AutoridadSocorroData {
    seleccionados: string[];
    detalles: Record<string, DetalleAutoridad | DetallesSocorro>;
}

interface Props {
    value?: AutoridadSocorroData;
    onChange: (value: AutoridadSocorroData) => void;
    tipo: 'autoridad' | 'socorro';
    readonly?: boolean;
}

export default function AutoridadSocorroWrapper({
    value,
    onChange,
    tipo,
    readonly = false,
}: Props) {
    const safeValue = value || { seleccionados: [], detalles: {} };

    const handleChange = (data: { seleccionados: string[], detalles: Record<string, DetalleAutoridad | DetallesSocorro> }) => {
        onChange(data);
    };

    if (readonly) {
        // TODO: Implementar vista readonly
        return null;
    }

    return (
        <AutoridadSocorroManager
            tipo={tipo}
            seleccionados={safeValue.seleccionados}
            detalles={safeValue.detalles}
            onChange={handleChange}
        />
    );
}
