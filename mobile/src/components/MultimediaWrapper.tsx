/**
 * MultimediaWrapper
 * 
 * Wrapper inteligente para integrar InfografiaManager con react-hook-form.
 * Maneja la conversión BIDIRECCIONAL de datos:
 * - Entrada: MultimediaRef[] (plana) -> Infografia[] (agrupada)
 * - Salida: Infografia[] (agrupada) -> MultimediaRef[] (plana)
 * 
 * Fecha: 2026-02-09
 * FIX v6: Persistencia de Infografías Vacías (Soporte para botón "+")
 */

import React, { useMemo, useRef, useEffect } from 'react';
import InfografiaManager from './InfografiaManager';
import { Infografia } from '../types/multimedia';
import { MultimediaRef } from '../services/draftStorage';

interface Props {
    value?: Infografia[] | MultimediaRef[];
    onChange: (value: MultimediaRef[]) => void;
    readonly?: boolean;
    situacionId?: string | number;
}

// Valor por defecto constante
const DEFAULT_INFOGRAFIA: Infografia[] = [{
    numero: 1,
    titulo: 'Infografía 1',
    fotos: [],
    video: null,
    created_at: new Date().toISOString(),
}];

// URI especial para marcar una infografía que existe pero no tiene fotos aún
const PLACEHOLDER_URI = 'infografia://placeholder';

/**
 * Convierte entrada (Refs planos o Infografias) a Infografia[] agrupadas
 */
const toGroupedInfografias = (input?: Infografia[] | MultimediaRef[] | any): Infografia[] => {
    // 1. Caso vacío
    if (!input || !Array.isArray(input) || input.length === 0) {
        return JSON.parse(JSON.stringify(DEFAULT_INFOGRAFIA));
    }

    // 2. Ya es Infografia[] agrupado? (Detectar por propiedad 'fotos' array)
    const primerElemento = input[0];
    if (primerElemento && typeof primerElemento === 'object' && 'fotos' in primerElemento && Array.isArray(primerElemento.fotos)) {
        return input.map((inf, idx) => ({
            numero: typeof inf.numero === 'number' ? inf.numero : idx + 1,
            titulo: inf.titulo || `Infografía ${idx + 1}`,
            fotos: Array.isArray(inf.fotos) ? inf.fotos : [],
            video: inf.video || null,
            created_at: inf.created_at || new Date().toISOString(),
        }));
    }

    // 3. Es MultimediaRef[] plano -> Agrupar
    const refs = input as MultimediaRef[];
    const mapa = new Map<number, Infografia>();

    // Identificar números de infografia
    const numeros = new Set<number>();
    refs.forEach(ref => {
        // Si no tiene numero, asignar al grupo 1
        const num = ref.infografia_numero || 1;
        numeros.add(num);
    });

    if (numeros.size === 0) return JSON.parse(JSON.stringify(DEFAULT_INFOGRAFIA));

    // Inicializar grupos
    Array.from(numeros).sort((a, b) => a - b).forEach(num => {
        mapa.set(num, {
            numero: num,
            titulo: `Infografía ${num}`,
            fotos: [],
            video: null,
            created_at: new Date().toISOString()
        });
    });

    // Llenar datos
    refs.forEach(ref => {
        // Ignorar placeholders explícitamente al reconstruir la UI
        if (ref.uri === PLACEHOLDER_URI) return;

        const num = ref.infografia_numero || 1;
        const inf = mapa.get(num)!;

        // Recuperar título
        if (ref.infografia_titulo && inf.titulo.startsWith('Infografía')) {
            inf.titulo = ref.infografia_titulo;
        }

        if (ref.tipo === 'FOTO') {
            const isRemote = ref.uri.startsWith('http') || ref.uri.startsWith('https');
            // Priorizar estado que viene del ref, luego inferir por protocolo
            const estado = (ref as any).estado || (isRemote ? 'SUBIDO' : 'PENDIENTE');

            inf.fotos.push({
                orden: ref.orden || inf.fotos.length + 1,
                uri: ref.uri,
                filename: `foto_${ref.orden || inf.fotos.length + 1}.jpg`,
                estado: estado,
                latitud: ref.latitud,
                longitud: ref.longitud
            });
        } else if (ref.tipo === 'VIDEO') {
            const isRemote = ref.uri.startsWith('http') || ref.uri.startsWith('https');
            const estado = (ref as any).estado || (isRemote ? 'SUBIDO' : 'PENDIENTE');

            inf.video = {
                uri: ref.uri,
                filename: 'video.mp4',
                duracion_segundos: ref.duracion_segundos,
                estado: estado,
                latitud: ref.latitud,
                longitud: ref.longitud
            };
        }
    });

    return Array.from(mapa.values());
};

/**
 * Convierte Infografia[] agrupadas a MultimediaRef[] planos para el formulario/backend
 */
const toFlatMultimediaRefs = (infografias: Infografia[]): MultimediaRef[] => {
    const refs: MultimediaRef[] = [];

    infografias.forEach(inf => {
        const hasMedia = inf.fotos.length > 0 || !!inf.video;

        if (!hasMedia) {
            // CRITICAL FIX: Generar placeholder para persistir la infografía vacía
            // Esto asegura que al agregar con "+", la nueva tab no desaparezca
            refs.push({
                tipo: 'FOTO', // Usamos FOTO como tipo para que pase validaciones de TS
                uri: PLACEHOLDER_URI,
                orden: 0,
                infografia_numero: inf.numero,
                infografia_titulo: inf.titulo,
            });
        }

        // Procesar fotos reales
        inf.fotos.forEach(foto => {
            refs.push({
                tipo: 'FOTO',
                uri: foto.uri,
                orden: foto.orden,
                infografia_numero: inf.numero,
                infografia_titulo: inf.titulo,
                latitud: foto.latitud,
                longitud: foto.longitud
            });
        });

        // Procesar video
        if (inf.video) {
            refs.push({
                tipo: 'VIDEO',
                uri: inf.video.uri,
                duracion_segundos: inf.video.duracion_segundos,
                infografia_numero: inf.numero,
                infografia_titulo: inf.titulo,
                latitud: inf.video.latitud,
                longitud: inf.video.longitud
            });
        }
    });

    return refs;
};

export default function MultimediaWrapper({
    value,
    onChange,
    readonly = false,
    situacionId,
}: Props) {
    // 1. Memoizar entrada: Convertir whatever -> Infografia[] para el componente visual
    const groupedValue = useMemo(() => {
        return toGroupedInfografias(value);
    }, [value]);

    // Ref para evitar loops: almacenamos el string del último valor PLANO emitido
    const lastEmittedValueStr = useRef<string>('');

    // 2. Manejar cambio: Infografia[] -> convertir a MultimediaRef[] -> emitir
    const handleChange = (newInfografias: Infografia[]) => {
        const flatRefs = toFlatMultimediaRefs(newInfografias);
        const flatStr = JSON.stringify(flatRefs);

        // Solo emitir si el resultado plano cambió
        if (flatStr !== lastEmittedValueStr.current) {
            lastEmittedValueStr.current = flatStr;
            onChange(flatRefs);
        }
    };

    // Sincronizar Ref si entra un nuevo value desde fuera
    useEffect(() => {
        if (value) {
            let currentFlatStr = '';

            // Detección rápida de tipo
            const isGrouped = Array.isArray(value) && value.length > 0 && 'fotos' in value[0];

            if (isGrouped) {
                currentFlatStr = JSON.stringify(toFlatMultimediaRefs(value as Infografia[]));
            } else {
                currentFlatStr = JSON.stringify(value);
            }

            if (currentFlatStr !== lastEmittedValueStr.current) {
                lastEmittedValueStr.current = currentFlatStr;
            }
        }
    }, [value]);

    const draftId = situacionId?.toString() || `temp-${Date.now()}`;

    return (
        <InfografiaManager
            situacionId={draftId}
            infografias={groupedValue}
            onChange={handleChange}
            disabled={readonly}
        />
    );
}
