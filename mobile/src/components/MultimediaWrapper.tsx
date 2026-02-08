/**
 * MultimediaWrapper
 * 
 * Wrapper para integrar MultimediaCaptureOffline con react-hook-form.
 * Permite capturar fotos y videos y guardar las referencias en el formulario.
 * 
 * Fecha: 2026-01-23
 */

import React from 'react';
import { View, Text } from 'react-native';
import MultimediaCaptureOffline from './MultimediaCaptureOffline';
import { MultimediaRef } from '../services/draftStorage';

interface Props {
    value?: MultimediaRef[];
    onChange: (value: MultimediaRef[]) => void;
    readonly?: boolean;
}

export default function MultimediaWrapper({
    value,
    onChange,
    readonly = false,
}: Props) {
    const handleMultimediaChange = React.useCallback((media: MultimediaRef[]) => {
        onChange(media);
    }, [onChange]); // Solo recrear si onChange cambia (que idealmente no debería)

    // Usamos un ID dummy porque en manualMode no importará
    const TEMP_DRAFT_ID = 'manual-mode';

    if (readonly) {
        return (
            <MultimediaCaptureOffline
                draftUuid={TEMP_DRAFT_ID}
                tipoSituacion="GENERIC"
                readOnly={true}
                onMultimediaChange={handleMultimediaChange}
                manualMode={true}
                initialMedia={value || []}
            />
        );
    }

    return (
        <MultimediaCaptureOffline
            draftUuid={TEMP_DRAFT_ID}
            tipoSituacion="GENERIC"
            onMultimediaChange={handleMultimediaChange}
            manualMode={true}
            initialMedia={value || []}
        />
    );
}
