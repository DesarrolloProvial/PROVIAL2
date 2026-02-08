/**
 * MultimediaWrapper
 *
 * Wrapper para integrar MultimediaCaptureOffline con react-hook-form.
 * Permite capturar fotos y videos y guardar las referencias en el formulario.
 *
 * Fecha: 2026-01-23
 */

import React from 'react';
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
    }, [onChange]);

    // Memoizar initialMedia para evitar re-renders infinitos
    // Solo usar value como initialMedia si tiene items (edit mode con datos existentes)
    const stableInitialMedia = React.useMemo(() => {
        if (value && value.length > 0) return value;
        return [];
    }, [value && value.length]); // Solo cambia si la cantidad cambia

    const TEMP_DRAFT_ID = 'manual-mode';

    return (
        <MultimediaCaptureOffline
            draftUuid={TEMP_DRAFT_ID}
            tipoSituacion="GENERIC"
            readOnly={readonly}
            onMultimediaChange={handleMultimediaChange}
            manualMode={true}
            initialMedia={stableInitialMedia}
        />
    );
}
